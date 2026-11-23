/* ===== LifeLink pages: Blood Bank Staff/Admin + Super Admin ===== */
/* ================= BLOOD BANK (shared) ================= */
function bankBanner(bb, stats) {
  if (!bb) return empty('No blood bank assigned to your account.');
  return `
  <div class="banner">
    <div class="big">🧪</div>
    <div><h2>${esc(bb.name)}</h2><p>${esc(bb.address)} · ${esc(bb.city)} · 📞 ${esc(bb.phone || '—')}</p></div>
    <div class="bstats">
      <div><b>${stats.totalUnits}</b><span>Total units</span></div>
      <div><b>${stats.groups}/8</b><span>Groups in stock</span></div>
      <div><b>${stats.incoming}</b><span>Incoming</span></div>
      <div><b>${stats.issuedToday}</b><span>Issued today</span></div>
    </div>
  </div>`;
}
function stockGrid(inv) {
  return `<div class="stock-grid">${Object.keys(inv).length ? Object.entries(inv).map(([g, s]) => {
    const cls = s.units === 0 ? 'zero' : s.units <= 3 ? 'low' : '';
    return `<div class="stock ${cls}">${s.units <= 3 ? `<div class="lowtag">${s.units === 0 ? 'OUT' : 'LOW'}</div>` : ''}
      <div class="g">${g}</div>
      <div class="u">${s.units}<small> units</small></div>
      <div class="e">exp ${s.expiry ? fmtDay(new Date(s.expiry)) : '—'}</div></div>`;
  }).join('') : '<div class="empty">No inventory records yet.</div>'}</div>`;
}
const incomingCard = (r) => {
  const bank = S.dash.bloodBank || {};
  const slot = (bank.inventory || {})[r.bloodGroup] || { units: 0 };
  const canIssue = slot.units > 0;
  return `<div class="rcard ${r.urgency === 'critical' ? 'crit' : ''}">
    <div class="rh">${bgTag(r.bloodGroup)} <b>#${esc(r.id)}</b> ${urgTag(r.urgency)} ${stTag(r.status)}
      <span class="id">${esc(r.hospitalName)}</span></div>
    <div class="rmeta">
      <span>🧍 ${esc(r.patientName)}</span><span>🔢 needs <b>${r.units}</b> · in stock <b style="color:${canIssue ? '#16a34a' : '#e63946'}">${slot.units}</b></span>
      <span>📍 ${esc(r.city)}</span><span>🕐 ${ago(r.createdAt)}</span>
    </div>
    <div class="ract">
      ${canIssue && !['completed', 'cancelled'].includes(r.status) ? `<button class="btn ok sm" onclick="issueBlood('${r.id}')">🩸 Issue ${Math.min(r.units, slot.units)} unit(s)</button>` : ''}
      <button class="btn sec sm" onclick="viewRequest('${r.id}')">Details</button>
    </div></div>`;
};
async function issueBlood(id) {
  const r = (S.dash.incoming || []).find(x => x.id === id);
  const bank = S.dash.bloodBank || {};
  const slot = (bank.inventory || {})[r ? r.bloodGroup : ''] || { units: 0 };
  openG(`<h2 class="mh">🩸 Issue blood</h2>
    <p class="msub">Request #${esc(id)} · ${esc(r ? r.bloodGroup : '')} · stock available: ${slot.units}</p>
    <form onsubmit="return doIssue(event,'${id}')">
      <label>Units to issue<input id="isUnits" type="number" min="1" max="${slot.units}" value="${r ? Math.min(r.units, slot.units) : 1}"></label>
      <button class="btn ok" style="width:100%" type="submit">Confirm issue — decrements stock & completes request</button>
      <p class="err" id="isErr"></p></form>`);
}
async function doIssue(e, id) {
  e.preventDefault();
  try {
    await api('/requests/' + id + '/issue', 'POST', { units: +$('isUnits').value });
    toast('🩸 Issued — stock updated, request completed', 'ok'); closeG(); refreshDash();
  } catch (err) { $('isErr').textContent = err.message; }
  return false;
}

/* ---- Blood Bank Staff ---- */
PAGES['b-profile'] = () => bankBanner(S.dash.bloodBank, S.dash.stats) +
  panel('Blood Bank Profile', `<div class="kv">
    <div class="k"><span>Bank ID</span><b>${esc((S.dash.bloodBank || {}).id || '—')}</b></div>
    <div class="k"><span>City</span><b>${esc((S.dash.bloodBank || {}).city || '—')}</b></div>
    <div class="k"><span>Code</span><b><code>${esc((S.dash.bloodBank || {}).code || '—')}</code></b></div>
    <div class="k"><span>Status</span><b>${(S.dash.bloodBank || {}).verified ? '✔ Verified' : '⏳ Pending'}</b></div>
    <div class="k"><span>Availability</span><b>${(S.dash.bloodBank || {}).available ? '🟢 Open' : '⏸ Closed'}</b></div>
    <div class="k"><span>Your role</span><b>${ROLE_NAME[S.user.role]}</b></div>
  </div>`);

PAGES['b-stock'] = () => {
  const s = S.dash.stats;
  const low = Object.entries(S.dash.inventory || {}).filter(([, v]) => v.units <= 3);
  return `
  <div class="stats">
    ${stat('Total Blood Stock', s.totalUnits, 'units across all groups')}
    ${stat('Groups available', s.groups + '/8', 'blood groups with stock', s.groups === 8 ? 'ok' : 'warn')}
    ${stat('Incoming requests', s.incoming, 'awaiting issue', 'blue')}
    ${stat('Issued today', s.issuedToday, 'units dispatched', 'ok')}
  </div>
  ${panel('🩸 Blood Stock', stockGrid(S.dash.inventory || {}), `<span class="online">Live</span>`)}
  ${low.length ? `<div style="height:18px"></div>${panel('⚠️ Low / out of stock', low.map(([g, v]) =>
    `<div class="bd" style="margin-bottom:8px"><span>${bgTag(g)}</span><b style="color:${v.units === 0 ? '#e63946' : '#d97706'}">${v.units === 0 ? 'OUT OF STOCK' : v.units + ' units — reorder'}</b></div>`).join(''))}` : ''}`;
};

PAGES['b-inventory'] = () => panel('🗃️ Blood Group-wise Inventory', stockGrid(S.dash.inventory || {}),
  `<button class="btn pri sm" onclick="go('b-update')">✏️ Update</button>`) +
  `<div style="height:18px"></div>${panel('Expiry watch', (() => {
    const entries = Object.entries(S.dash.inventory || {});
    return entries.map(([g, v]) => `<div class="bd"><span>${bgTag(g)}</span><span>Expires: <b>${v.expiry ? fmtDay(new Date(v.expiry)) : '—'}</b></span><span>Updated: <b>${ago(v.updatedAt)}</b></span></div>`).join('') || empty('No data');
  })())}`;

PAGES['b-incoming'] = () => panel('📥 Incoming Requests', (S.dash.incoming || []).length ?
  S.dash.incoming.map(incomingCard).join('') : empty('No incoming requests for your city right now.'),
  `<span class="tag t-new">${(S.dash.incoming || []).length}</span>`);

PAGES['b-availability'] = () => {
  const bb = S.dash.bloodBank || {};
  const inv = S.dash.inventory || {};
  const open = bb.available;
  return `
  ${panel('🟢 Availability Status', `
    <div class="avail-box ${open ? '' : 'paused'}">
      <div class="avail-dot"></div>
      <div style="flex:1">
        <b style="font-size:1.05rem">${open ? 'Blood bank is OPEN — accepting requests' : 'Blood bank is CLOSED'}</b>
        <p style="font-size:.83rem;color:#7b8194;margin-top:4px">Hospitals and requesters see your live status on the network.</p>
      </div>
      <button class="switch ${open ? 'on' : ''}" onclick="toggleBankAvail(this)"></button>
    </div>`)}
  <div style="height:18px"></div>
  ${panel('Group-wise availability', Object.entries(inv).map(([g, v]) => `
    <div class="bd" style="align-items:center">
      <span>${bgTag(g)}</span>
      <span class="tag ${v.units === 0 ? 't-cancelled' : v.units <= 3 ? 't-pending' : 't-completed'}">${v.units === 0 ? 'UNAVAILABLE' : v.units <= 3 ? 'LIMITED' : 'AVAILABLE'}</span>
      <b>${v.units} unit(s)</b></div>`).join(''))}`;
};
async function toggleBankAvail(btn) {
  try {
    const next = !(S.dash.bloodBank || {}).available;
    await api('/bloodbanks/' + S.user.bloodBankId, 'PATCH', { available: next });
    toast(next ? '🟢 Bank is now open' : '⏸ Bank closed', 'ok'); refreshDash();
  } catch (e) { toast(e.message, 'bad'); }
}

PAGES['b-issues'] = () => issueRecords(S.dash.issues || []);
PAGES['ba-issues'] = () => issueRecords(S.dash.issues || []);
function issueRecords(list) {
  return panel('🧾 Blood Issue Records', list.length ? `
    <table><thead><tr><th>Record</th><th>Request</th><th>Group</th><th>Units</th><th>Hospital</th><th>Issued by</th><th>When</th></tr></thead>
    <tbody>${list.map(i => `<tr><td><code>${esc(i.id)}</code></td><td><code>${esc(i.requestId)}</code></td>
      <td>${bgTag(i.bloodGroup)}</td><td><b>${i.units}</b></td><td>${esc(i.hospitalName)}</td>
      <td>${esc(i.by)}</td><td>${fmtDate(i.at)}</td></tr>`).join('')}</tbody></table>`
    : empty('No issues recorded yet.'));
}

PAGES['b-update'] = () => panel('✏️ Update Inventory', `
  <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">Adjust stock after collection drives, transfers or wastage. Every change is written to the audit log.</p>
  <form onsubmit="return updateInv(event)">
    <div class="row3">
      <label>Blood group<select id="ivGroup">${['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => `<option>${g}</option>`).join('')}</select></label>
      <label>Mode<select id="ivMode"><option value="add">Add / subtract units</option><option value="set">Set exact count</option></select></label>
      <label>Units<input id="ivUnits" type="number" value="1"></label>
    </div>
    <label>Expiry date (optional)<input id="ivExp" type="date"></label>
    <button class="btn pri" type="submit">💾 Save inventory</button>
    <p class="err" id="ivErr"></p>
  </form>`);
async function updateInv(e) {
  e.preventDefault();
  const mode = $('ivMode').value, val = +$('ivUnits').value;
  try {
    await api('/bloodbanks/' + S.user.bloodBankId + '/inventory', 'PATCH', mode === 'set'
      ? { bloodGroup: $('ivGroup').value, mode: 'set', units: val, expiry: $('ivExp').value }
      : { bloodGroup: $('ivGroup').value, delta: val, expiry: $('ivExp').value });
    toast('Inventory updated ✓', 'ok'); refreshDash();
  } catch (err) { $('ivErr').textContent = err.message; }
  return false;
}
PAGES['b-history'] = () => bankHistory();
PAGES['ba-history'] = () => bankHistory();
function bankHistory() {
  return `<div id="bh">${empty('Loading request history…')}</div>`;
}
AFTER['b-history'] = loadBankHistory; AFTER['ba-history'] = loadBankHistory;
async function loadBankHistory() {
  const box = $('bh'); if (!box) return;
  try {
    const list = await api('/requests');
    box.innerHTML = panel('🗂️ Request History', list.length ? `
      <table><thead><tr><th>ID</th><th>Group</th><th>Hospital</th><th>Units</th><th>Status</th><th>Created</th><th></th></tr></thead>
      <tbody>${list.map(r => `<tr><td><code>${esc(r.id)}</code></td><td>${bgTag(r.bloodGroup)}</td>
        <td>${esc(r.hospitalName)}</td><td>${r.units}</td><td>${stTag(r.status)}</td>
        <td>${fmtDay(r.createdAt)}</td>
        <td><button class="btn sec sm" onclick="viewRequest('${r.id}')">View</button></td></tr>`).join('')}</tbody></table>`
      : empty('No requests in your city.'));
  } catch (e) { box.innerHTML = empty(e.message); }
}

/* ---- Blood Bank Admin ---- */
PAGES['ba-profile'] = () => PAGES['b-profile']();
PAGES['ba-stock'] = () => PAGES['b-stock']();
PAGES['ba-inventory'] = () => PAGES['b-inventory']();
PAGES['ba-incoming'] = () => PAGES['b-incoming']();

PAGES['ba-staff'] = () => {
  const staff = S.dash.staff || [];
  return panel('👥 Manage Blood Bank Staff', staff.length ? `
    <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
    <tbody>${staff.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.email)}</td>
      <td><span class="tag ${s.role === 'blood_bank_admin' ? 't-verified' : 't-new'}">${ROLE_NAME[s.role]}</span></td>
      <td>${s.active ? '<span class="tag t-completed">ACTIVE</span>' : '<span class="tag t-cancelled">REMOVED</span>'}</td>
      <td>${s.id !== S.user.id && s.active ? `<button class="btn no sm" onclick="removeBankStaff('${s.id}')">Remove</button>` : ''}</td></tr>`).join('')}</tbody></table>`
    : empty('No staff yet.'), `<button class="btn pri sm" onclick="go('ba-addstaff')">➕ Add</button>`);
};
async function removeBankStaff(id) {
  if (!confirm('Remove this staff member?')) return;
  try { await api('/bloodbanks/' + S.user.bloodBankId + '/staff/' + id, 'DELETE'); toast('Removed', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
PAGES['ba-addstaff'] = () => panel('➕ Add / Remove Staff', `
  <form onsubmit="return addBankStaff(event)">
    <div class="row2">
      <label>Full name<input id="bsName" required placeholder="Staff name"></label>
      <label>Email<input id="bsEmail" type="email" required placeholder="staff@bank.in"></label>
    </div>
    <div class="row3">
      <label>Role<select id="bsRole"><option value="blood_bank_staff">Blood Bank Staff</option><option value="blood_bank_admin">Blood Bank Admin</option></select></label>
      <label>Phone<input id="bsPhone" placeholder="98xxxxxxxx"></label>
      <label>Password<input id="bsPass" type="text" value="staff123"></label>
    </div>
    <button class="btn pri" type="submit">➕ Add staff member</button>
    <p class="err" id="bsErr"></p>
  </form>
  <hr style="border:none;border-top:1px solid #eceef4;margin:22px 0 16px">
  <p style="font-size:.82rem;color:#7b8194">To remove someone, open <a href="#" onclick="go('ba-staff');return false">Manage Blood Bank Staff</a> → Remove (instant deactivation).</p>`);
async function addBankStaff(e) {
  e.preventDefault();
  try {
    await api('/bloodbanks/' + S.user.bloodBankId + '/staff', 'POST', {
      name: $('bsName').value, email: $('bsEmail').value, role: $('bsRole').value,
      phone: $('bsPhone').value, city: (S.dash.bloodBank || {}).city, password: $('bsPass').value
    });
    toast('Staff added 🎉', 'ok'); e.target.reset(); $('bsPass').value = 'staff123'; refreshDash();
  } catch (err) { $('bsErr').textContent = err.message; }
  return false;
}

PAGES['ba-monitor'] = () => {
  const inv = S.dash.inventory || {};
  const pred = S.dash.prediction || { forecast: [] };
  const total = Object.values(inv).reduce((s, v) => s + v.units, 0);
  const lowCount = Object.values(inv).filter(v => v.units <= 3).length;
  return `
  <div class="stats">
    ${stat('Total stock', total, 'units', 'blue')}
    ${stat('Low-stock groups', lowCount, '≤ 3 units', lowCount ? 'warn' : 'ok')}
    ${stat('Expiring soon', Object.values(inv).filter(v => v.expiry && new Date(v.expiry) - Date.now() < 10 * 864e5).length, 'within 10 days', 'pur')}
    ${stat('AI risk', (pred.overallRisk || '—').toUpperCase(), '7-day horizon', pred.overallRisk === 'stable' ? 'ok' : 'warn')}
  </div>
  ${panel('📈 Inventory Monitoring', stockGrid(inv))}
  <div style="height:18px"></div>
  ${panel('🧠 AI vs stock (7-day)', pred.forecast && pred.forecast.length ? pred.forecast.map(f => `
    <div class="fc"><span class="g">${bgTag(f.bloodGroup)}</span>
      <div class="meters"><div class="m dem"><i style="width:${Math.min(100, f.predicted7d * 8)}%"></i></div>
      <div class="m stk"><i style="width:${Math.min(100, f.currentStock * 4)}%"></i></div></div>
      <span class="risk"><span class="tag ${f.risk === 'critical' ? 't-critical' : f.risk === 'high' ? 't-pending' : 't-completed'}">${f.risk.toUpperCase()}</span></span>
      <div class="act">Need ${f.predicted7d} · have ${f.currentStock} · ${esc(f.action)}</div></div>`).join('') : empty('Run AI to see forecast'))}`;
};

PAGES['ba-reports'] = () => `<div id="baRep">${empty('Loading analytics…')}</div>`;
AFTER['ba-reports'] = loadAnalytics;
PAGES['ba-ai'] = () => `<div id="aiBox">${empty('Loading AI forecast…')}</div>`;
AFTER['ba-ai'] = loadAi;

PAGES['ba-logs'] = () => logPage(S.dash.logs || []);
PAGES['ha-logs'] = () => logPage(S.dash.logs || []);
function logPage(logs) {
  return panel('🧾 Activity Logs', logs.length ? logs.map(l => `
    <div class="log"><div class="lico">🧾</div>
      <div><b>${esc(l.action)}</b> — ${esc(l.target || '')}
        <small>${esc(l.actorName)} (${ROLE_NAME[l.role] || l.role}) · ${fmtDate(l.at)}</small></div></div>`).join('')
    : empty('No activity recorded yet.'));
}

/* ================= SUPER ADMIN ================= */
function saBanner() {
  const s = S.dash.stats;
  return `
  <div class="banner">
    <div class="big">👑</div>
    <div><h2>LifeLink Network Control</h2><p>Entire network — users, hospitals, blood banks, requests & system</p></div>
    <div class="bstats">
      <div><b>${s.users}</b><span>Users</span></div>
      <div><b>${s.donors}</b><span>Donors</span></div>
      <div><b>${s.hospitals}</b><span>Hospitals</span></div>
      <div><b>${s.bloodBanks}</b><span>Banks</span></div>
      <div><b>${s.active}</b><span>Active req</span></div>
    </div>
  </div>`;
}
PAGES['s-users'] = () => {
  const s = S.dash.stats;
  return `<div class="stats">
    ${stat('Total Registered Users', s.users, 'all roles', 'blue')}
    ${stat('Total Donors', s.donors, 'verified + new', 'pur')}
    ${stat('Total Patients', s.patients, 'patients + families')}
    ${stat('Deactivated', S.dash.users.filter(u => !u.active).length, 'access revoked', 'warn')}
  </div>
  ${panel('Role distribution', Object.entries(ROLE_NAME).map(([r, n]) => {
    const c = S.dash.users.filter(u => u.role === r).length;
    const max = Math.max(...Object.keys(ROLE_NAME).map(x => S.dash.users.filter(u => u.role === x).length), 1);
    return `<div class="hbar"><span class="nm" style="width:110px">${n}</span><div class="tr"><i style="width:${c / max * 100}%"></i></div><span class="vl">${c}</span></div>`;
  }).join(''), `<button class="btn pri sm" onclick="go('s-usermgmt')">Manage →</button>`)}`;
};
PAGES['s-donors'] = () => userTable('donor', '🩸 Total Donors');
PAGES['s-patients'] = () => {
  const list = S.dash.users.filter(u => ['patient', 'family'].includes(u.role));
  return panel('🧍 Total Patients & Families', `
    <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Requests</th><th>Status</th></tr></thead>
    <tbody>${list.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td>
      <td><span class="tag t-new">${ROLE_NAME[u.role]}</span></td><td>${esc(u.city || '—')}</td>
      <td>${S.dash.requests.filter(r => r.requesterId === u.id).length}</td>
      <td>${u.active ? '<span class="tag t-completed">ACTIVE</span>' : '<span class="tag t-cancelled">OFF</span>'}</td></tr>`).join('')}</tbody></table>`,
    `<span class="tag t-grp">${list.length}</span>`);
};
function userTable(role, title) {
  const list = S.dash.users.filter(u => u.role === role);
  return panel(title, `
    <table><thead><tr><th>Name</th><th>Email</th><th>City</th><th>Group</th><th>Trust</th><th>Verified</th><th>Status</th></tr></thead>
    <tbody>${list.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td>
      <td>${esc(u.city || '—')}</td><td>${u.bloodGroup ? bgTag(u.bloodGroup) : '—'}</td>
      <td>${u.trust ? `<b style="color:${u.trust.score >= 70 ? '#16a34a' : '#d97706'}">⭐ ${u.trust.score}</b>` : '—'}</td>
      <td>${u.verified ? '✔' : '⏳'}</td>
      <td>${u.active ? '<span class="tag t-completed">ACTIVE</span>' : '<span class="tag t-cancelled">OFF</span>'}</td></tr>`).join('')}</tbody></table>`,
    `<span class="tag t-grp">${list.length}</span>`);
}

/* ================= DONOR MEDICAL VERIFICATION QUEUE ================= */
const MED_S_TAG = (m) => m.status === 'approved' ? '<span class="tag t-completed">✔ APPROVED</span>'
  : m.status === 'rejected' ? '<span class="tag t-cancelled">✘ REJECTED</span>'
  : '<span class="tag t-pending">⏳ PENDING</span>';
const MED_V_TAG = (m) => m.verdict === 'eligible' ? '<span class="tag t-completed">ELIGIBLE</span>'
  : `<span class="tag t-pending">DEFERRED · ${m.flags.length}</span>`;

PAGES['s-medverify'] = () => {
  const donors = (S.dash.users || []).filter(u => u.role === 'donor');
  const withMed = donors.filter(d => d.medical);
  const order = { pending: 0, rejected: 1, approved: 2 };
  const queue = withMed.slice().sort((a, b) => (order[a.medical.status] ?? 3) - (order[b.medical.status] ?? 3) || b.medical.submittedAt - a.medical.submittedAt);
  const pend = withMed.filter(d => d.medical.status === 'pending');
  const appr = withMed.filter(d => d.medical.status === 'approved');
  const rej = withMed.filter(d => d.medical.status === 'rejected');
  const none = donors.filter(d => !d.medical);

  const row = (d) => {
    const m = d.medical;
    const act = m.status === 'pending'
      ? `<button class="btn pri sm" onclick="reviewMed('${d.id}')">🩺 Review</button>`
      : `<button class="btn sec sm" onclick="reviewMed('${d.id}')">View</button>`;
    return `<tr>
      <td><b>${esc(d.name)}</b><br><small style="color:#7b8194">${esc(d.email)}</small></td>
      <td>${d.bloodGroup ? bgTag(d.bloodGroup) : '—'}</td>
      <td>${esc(d.city || '—')}</td>
      <td><small>Hb <b>${m.hb}</b> g/dL · <b>${m.weight}</b> kg · <b>${m.height}</b> cm<br>
        Last: ${m.lastDonation ? fmtDay(new Date(m.lastDonation + 'T00:00:00').getTime()) : 'never'} · Test: ${esc((m.test && m.test.result) || '—')}</small></td>
      <td>${MED_V_TAG(m)}</td>
      <td><small>${fmtDay(m.submittedAt)}<br>${ago(m.submittedAt)}</small></td>
      <td>${MED_S_TAG(m)}</td>
      <td>${d.trust ? `⭐ ${d.trust.score}` : '—'}</td>
      <td>${d.verified ? '<span class="tag t-completed">✔</span>' : '<span class="tag t-cancelled">✘</span>'}</td>
      <td>${act}</td></tr>`;
  };

  return `
  <div class="stats">
    ${stat('Pending review', pend.length, 'donor forms awaiting decision', pend.length ? 'warn' : 'ok')}
    ${stat('Approved', appr.length, 'verified donors', 'ok')}
    ${stat('Rejected / deferred', rej.length, 'sent back to donor')}
    ${stat('Not submitted', none.length, 'no medical form yet', 'blue')}
  </div>
  ${panel('🩺 Donor Verification Queue', queue.length ? `
    <table><thead><tr><th>Donor</th><th>Group</th><th>City</th><th>Vitals</th><th>Auto verdict</th><th>Submitted</th><th>Status</th><th>Trust</th><th>Verified</th><th></th></tr></thead>
    <tbody>${queue.map(row).join('')}</tbody></table>`
    : empty('No medical submissions yet — forms will appear here the moment a donor submits.'),
    pend.length ? `<span class="tag t-pending">${pend.length} pending</span>` : '<span class="tag t-completed">Queue clear 🎉</span>')}
  <div style="height:18px"></div>
  ${none.length ? panel('👤 Donors without a medical form', `
    <table><thead><tr><th>Donor</th><th>City</th><th>Group</th><th>Trust</th><th>Verified</th><th>Status</th></tr></thead>
    <tbody>${none.map(d => `<tr><td><b>${esc(d.name)}</b><br><small style="color:#7b8194">${esc(d.email)}</small></td>
      <td>${esc(d.city || '—')}</td><td>${d.bloodGroup ? bgTag(d.bloodGroup) : '—'}</td>
      <td>${d.trust ? '⭐ ' + d.trust.score : '—'}</td>
      <td>${d.verified ? '<span class="tag t-completed">✔</span>' : '<span class="tag t-cancelled">✘</span>'}</td>
      <td><span class="tag t-new">AWAITING FORM</span></td></tr>`).join('')}</tbody></table>`,
    `<span class="tag t-grp">${none.length}</span>`) : ''}
  <div style="height:18px"></div>
  ${panel('How donor verification works', `<p style="font-size:.85rem;color:#7b8194;line-height:1.7">
    Donors submit vitals (height, weight, haemoglobin), their last-donation date, an infectious-disease screening result and a 7-question health questionnaire. The engine runs an <b>instant auto-eligibility check</b> (140 cm · 50 kg · 12.5 g/dL · 84-day donation gap · no red-flag answers) and marks the form <b>ELIGIBLE</b> or <b>DEFERRED</b> with exact reasons.
    You review the full medical summary here and <b>Approve</b> (donor becomes verified → trust-score verification bonus applies → donor is notified) or <b>Reject/Defer</b> with a note the donor receives. Every decision is written to the audit log.</p>`,
    `<span class="tag t-grp">Super Admin only</span>`)}`;
};

function reviewMed(id) {
  const d = (S.dash.users || []).find(x => x.id === id);
  if (!d || !d.medical) return;
  const m = d.medical;
  const answersHtml = MED_Q.map(([k, q]) => {
    const val = (m.answers || {})[k] || '—';
    const good = k === 'well' ? val === 'yes' : k === 'infectious' ? val === 'Negative' : val === 'no';
    return `<div class="bd"><span style="max-width:70%">${q}</span><b style="color:${good ? '#16a34a' : '#b91c1c'}">${esc(val)} ${good ? '✔' : '✖'}</b></div>`;
  }).join('');

  openG(`
    <h2 class="mh">🩺 Medical review — ${esc(d.name)}</h2>
    <p class="msub">${esc(d.email)} · ${esc(d.city || '')} · joined ${fmtDay(d.createdAt)}</p>
    <div class="btn-row" style="margin-bottom:12px">${d.bloodGroup ? bgTag(d.bloodGroup) : ''} ${MED_S_TAG(m)} ${MED_V_TAG(m)}
      <span class="tag ${d.verified ? 't-completed' : 't-cancelled'}">${d.verified ? '✔ VERIFIED' : '✘ UNVERIFIED'}</span>
      <span class="tag t-grp">⭐ ${d.trust ? d.trust.score + ' ' + d.trust.level : '—'}</span></div>
    <div class="kv" style="margin-top:0">
      <div class="k"><span>Height</span><b>${m.height} cm</b></div>
      <div class="k"><span>Weight</span><b>${m.weight} kg</b></div>
      <div class="k"><span>Haemoglobin</span><b>${m.hb} g/dL</b></div>
      <div class="k"><span>Last donation</span><b>${m.lastDonation ? fmtDay(new Date(m.lastDonation + 'T00:00:00').getTime()) : 'Never'}</b></div>
      <div class="k"><span>Screening test</span><b>${esc((m.test && m.test.name) || '—')}</b></div>
      <div class="k"><span>Result · date</span><b>${esc((m.test && m.test.result) || '—')} · ${m.test && m.test.date ? fmtDay(new Date(m.test.date + 'T00:00:00').getTime()) : '—'}</b></div>
      <div class="k"><span>Submitted</span><b>${fmtDate(m.submittedAt)}</b></div>
      <div class="k"><span>Auto verdict</span><b style="color:${m.verdict === 'eligible' ? '#16a34a' : '#d97706'}">${m.verdict.toUpperCase()}</b></div>
    </div>
    <h3 style="font-size:.93rem;margin:16px 0 8px">🧪 Auto-check flags</h3>
    ${m.flags && m.flags.length ? `<div class="verdict bad" style="margin-top:0"><b>${m.flags.length} issue(s) need your attention</b><ul>${m.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>`
      : `<div class="verdict ok" style="margin-top:0"><b>✅ No issues — meets all donor criteria</b>Cleared by the eligibility engine.</div>`}
    <h3 style="font-size:.93rem;margin:16px 0 8px">📋 Screening questionnaire</h3>
    ${answersHtml}
    ${m.status === 'pending' ? `
      <label style="margin-top:14px">Review note (optional)<textarea id="rvNote" rows="2" placeholder="Reason / instructions the donor will receive"></textarea></label>
      <div class="btn-row">
        <button class="btn ok" onclick="decideMed('${d.id}','approve')">✔ Approve — mark verified</button>
        <button class="btn no" onclick="decideMed('${d.id}','reject')">✘ Reject / defer</button>
      </div>` : `
      <div class="bd" style="margin-top:14px"><span>Reviewed by</span><b>${esc(m.reviewedBy || '—')} · ${m.reviewedAt ? fmtDate(m.reviewedAt) : '—'}</b></div>
      ${m.reviewNote ? `<div class="bd" style="margin-top:8px;align-items:flex-start"><span>Note to donor</span><b style="text-align:right;max-width:65%">${esc(m.reviewNote)}</b></div>` : ''}`}
    <button class="btn pri" style="width:100%;margin-top:14px" onclick="closeG()">Close</button>`);
}
async function decideMed(id, action) {
  if (action === 'reject' && !confirm('Defer this donor? They will be notified with your note and can reapply.')) return;
  try {
    await api('/donor-verifications/' + id, 'POST', { action, note: $('rvNote') ? $('rvNote').value : '' });
    toast(action === 'approve' ? '✅ Donor verified — trust score updated, donor notified' : 'Donor deferred — notified with your note', 'ok');
    closeG(); refreshDash(); loadNotifs();
  } catch (e) { toast(e.message, 'bad'); }
}
PAGES['s-hospitals'] = () => hospTable(false);
PAGES['s-pendh'] = () => hospTable(true);
function hospTable(pendingOnly) {
  const list = S.dash.hospitals.filter(h => pendingOnly ? !h.verified : true);
  return panel(pendingOnly ? '⚠️ Pending Hospital Verification' : '🏥 Total Hospitals', list.length ? `
    <table><thead><tr><th>Hospital</th><th>City</th><th>Phone</th><th>Code</th><th>Requests</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.map(h => `<tr><td><b>${esc(h.name)}</b><br><small style="color:#7b8194">${esc(h.address)}</small></td>
      <td>${esc(h.city)}</td><td>${esc(h.phone || '—')}</td><td><code>${esc(h.code)}</code></td>
      <td>${S.dash.requests.filter(r => r.hospitalId === h.id).length}</td>
      <td>${h.verified ? '<span class="tag t-completed">✔ VERIFIED</span>' : '<span class="tag t-pending">⏳ PENDING</span>'}</td>
      <td><div class="btn-row">
        ${h.verified ? `<button class="btn no sm" onclick="verifyHosp('${h.id}',false)">Revoke</button>` : `<button class="btn ok sm" onclick="verifyHosp('${h.id}',true)">✔ Verify</button>`}
        <button class="btn sec sm" onclick="addHospModal()">+ Add</button></div></td></tr>`).join('')}</tbody></table>`
    : empty('Nothing pending — all hospitals verified 🎉'),
    `<button class="btn pri sm" onclick="addHospModal()">➕ Add hospital</button>`);
}
async function verifyHosp(id, v) {
  try { await api('/hospitals/' + id, 'PATCH', { verified: v }); toast(v ? 'Hospital verified ✓' : 'Verification revoked', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
function addHospModal() {
  openG(`<h2 class="mh">➕ Add hospital</h2><form onsubmit="return addHosp(event)">
    <label>Name<input id="nhName" required placeholder="Hospital name"></label>
    <div class="row2"><label>City<input id="nhCity" required placeholder="Delhi"></label>
      <label>Phone<input id="nhPhone" placeholder="011-xxxxxxx"></label></div>
    <label>Address<input id="nhAddr" placeholder="Full address"></label>
    <button class="btn pri" style="width:100%" type="submit">Add hospital (starts unverified)</button>
    <p class="err" id="nhErr"></p></form>`);
}
async function addHosp(e) {
  e.preventDefault();
  try { await api('/hospitals', 'POST', { name: $('nhName').value, city: $('nhCity').value, phone: $('nhPhone').value, address: $('nhAddr').value }); toast('Hospital added', 'ok'); closeG(); refreshDash(); }
  catch (err) { $('nhErr').textContent = err.message; }
  return false;
}
PAGES['s-banks'] = () => bankTable(false);
PAGES['s-pendb'] = () => bankTable(true);
function bankTable(pendingOnly) {
  const list = S.dash.bloodBanks.filter(b => pendingOnly ? !b.verified : true);
  return panel(pendingOnly ? '⚠️ Pending Blood Bank Verification' : '🧪 Total Blood Banks', list.length ? `
    <table><thead><tr><th>Blood Bank</th><th>City</th><th>Code</th><th>Requests</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.map(b => `<tr><td><b>${esc(b.name)}</b><br><small style="color:#7b8194">${esc(b.address)}</small></td>
      <td>${esc(b.city)}</td><td><code>${esc(b.code)}</code></td>
      <td>${S.dash.requests.filter(r => r.city === b.city).length}</td>
      <td>${b.verified ? '<span class="tag t-completed">✔ VERIFIED</span>' : '<span class="tag t-pending">⏳ PENDING</span>'}</td>
      <td><div class="btn-row">
        ${b.verified ? `<button class="btn no sm" onclick="verifyBank('${b.id}',false)">Revoke</button>` : `<button class="btn ok sm" onclick="verifyBank('${b.id}',true)">✔ Verify</button>`}
        <button class="btn sec sm" onclick="addBankModal()">+ Add</button></div></td></tr>`).join('')}</tbody></table>`
    : empty('Nothing pending.'), `<button class="btn pri sm" onclick="addBankModal()">➕ Add blood bank</button>`);
}
async function verifyBank(id, v) {
  try { await api('/bloodbanks/' + id, 'PATCH', { verified: v }); toast(v ? 'Blood bank verified ✓' : 'Revoked', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
function addBankModal() {
  openG(`<h2 class="mh">➕ Add blood bank</h2><form onsubmit="return addBank(event)">
    <label>Name<input id="nbName" required placeholder="Blood bank name"></label>
    <div class="row2"><label>City<input id="nbCity" required placeholder="Delhi"></label>
      <label>Phone<input id="nbPhone" placeholder="011-xxxxxxx"></label></div>
    <label>Address<input id="nbAddr" placeholder="Full address"></label>
    <button class="btn pri" style="width:100%" type="submit">Add blood bank (starts unverified)</button>
    <p class="err" id="nbErr"></p></form>`);
}
async function addBank(e) {
  e.preventDefault();
  try { await api('/bloodbanks', 'POST', { name: $('nbName').value, city: $('nbCity').value, phone: $('nbPhone').value, address: $('nbAddr').value }); toast('Blood bank added', 'ok'); closeG(); refreshDash(); }
  catch (err) { $('nbErr').textContent = err.message; }
  return false;
}

function reqTable(list, title, right) {
  return panel(title, list.length ? `
    <table><thead><tr><th>ID</th><th>Group</th><th>Units</th><th>Patient</th><th>Hospital</th><th>City</th><th>Urgency</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.map(r => `<tr><td><code>${esc(r.id)}</code></td><td>${bgTag(r.bloodGroup)}</td>
      <td>${r.units}</td><td>${esc(r.patientName)}</td><td>${esc(r.hospitalName)}</td>
      <td>${esc(r.city)}</td><td>${urgTag(r.urgency)}</td><td>${stTag(r.status)}</td>
      <td><button class="btn sec sm" onclick="viewRequest('${r.id}')">Open</button></td></tr>`).join('')}</tbody></table>`
    : empty('No requests.'), right);
}
PAGES['s-requests'] = () => reqTable(S.dash.requests, '📊 Total Blood Requests', `<span class="tag t-grp">${S.dash.requests.length}</span>`);
PAGES['s-active'] = () => reqTable(S.dash.requests.filter(r => !['completed', 'cancelled'].includes(r.status)), '🟢 Active Requests', `<span class="tag t-new">${S.dash.requests.filter(r => !['completed', 'cancelled'].includes(r.status)).length}</span>`);
PAGES['s-completed'] = () => reqTable(S.dash.requests.filter(r => r.status === 'completed'), '✅ Completed Requests', `<span class="tag t-completed">${S.dash.requests.filter(r => r.status === 'completed').length}</span>`);

PAGES['s-usermgmt'] = () => `
  ${panel('👥 User Management', `
    <div class="row2">
      <label>Search<input id="umQ" placeholder="name, email or city…" oninput="renderUsers()"></label>
      <label>Role filter<select id="umRole" onchange="renderUsers()"><option value="">All roles</option>
        ${Object.entries(ROLE_NAME).map(([r, n]) => `<option value="${r}">${n}</option>`).join('')}</select></label>
    </div>
    <div id="umTable"></div>`)}
  <div style="height:18px"></div>
  ${panel('Quick stats', `<div class="stats">
    ${stat('Users', S.dash.stats.users, 'total', 'blue')}
    ${stat('Donors', S.dash.stats.donors, 'active pool', 'pur')}
    ${stat('Verified', S.dash.users.filter(u => u.verified).length, 'identity checked', 'ok')}
    ${stat('Deactivated', S.dash.users.filter(u => !u.active).length, 'revoked', 'warn')}
  </div>`)}`;
AFTER['s-usermgmt'] = renderUsers;
function renderUsers() {
  const q = ($('umQ') || {}).value?.toLowerCase() || '';
  const role = ($('umRole') || {}).value || '';
  const list = S.dash.users.filter(u => (!role || u.role === role) &&
    (!q || (u.name + u.email + (u.city || '')).toLowerCase().includes(q)));
  const box = $('umTable'); if (!box) return;
  box.innerHTML = `<div style="overflow:auto;margin-top:14px"><table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>Trust</th><th>State</th><th>Actions</th></tr></thead>
    <tbody>${list.map(u => `<tr>
      <td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td>
      <td><span class="tag t-new">${ROLE_NAME[u.role]}</span></td>
      <td>${esc(u.city || '—')}</td>
      <td>${u.trust ? '⭐ ' + u.trust.score : '—'}</td>
      <td>${u.active ? '<span class="tag t-completed">ACTIVE</span>' : '<span class="tag t-cancelled">OFF</span>'}</td>
      <td><div class="btn-row">
        <button class="btn sec sm" onclick="editUser('${u.id}')">Edit</button>
        <button class="btn ${u.active ? 'no' : 'ok'} sm" onclick="toggleUser('${u.id}',${!u.active})">${u.active ? 'Deactivate' : 'Activate'}</button>
      </div></td></tr>`).join('') || `<tr><td colspan="7" class="empty">No users match</td></tr>`}</tbody></table></div>`;
}
async function toggleUser(id, active) {
  try { await api('/users/' + id, 'PATCH', { active }); toast(active ? 'Activated ✓' : 'Deactivated', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
function editUser(id) {
  const u = S.dash.users.find(x => x.id === id); if (!u) return;
  openG(`<h2 class="mh">✏️ Edit user</h2><form onsubmit="return saveUser(event,'${id}')">
    <label>Name<input id="euName" value="${esc(u.name)}" required></label>
    <div class="row2">
      <label>Role<select id="euRole">${Object.entries(ROLE_NAME).map(([r, n]) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>City<input id="euCity" value="${esc(u.city || '')}"></label>
    </div>
    <div class="row2">
      <label>Blood group<select id="euGroup"><option value="">—</option>${['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => `<option ${u.bloodGroup === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      <label>Verified<select id="euVer"><option value="true" ${u.verified ? 'selected' : ''}>Yes</option><option value="false" ${!u.verified ? 'selected' : ''}>No</option></select></label>
    </div>
    <label>Reset password (optional)<input id="euPass" type="text" placeholder="leave blank to keep"></label>
    <button class="btn pri" style="width:100%" type="submit">Save user</button>
    <p class="err" id="euErr"></p></form>`);
}
async function saveUser(e, id) {
  e.preventDefault();
  const body = { name: $('euName').value, role: $('euRole').value, city: $('euCity').value, bloodGroup: $('euGroup').value, verified: $('euVer').value === 'true' };
  if ($('euPass').value) body.password = $('euPass').value;
  try { await api('/users/' + id, 'PATCH', body); toast('User updated ✓', 'ok'); closeG(); refreshDash(); }
  catch (err) { $('euErr').textContent = err.message; }
  return false;
}

PAGES['s-hospmgmt'] = () => hospTable(false);
PAGES['s-bankmgmt'] = () => bankTable(false);

PAGES['s-roles'] = () => {
  const features = ['Own profile', 'Create requests', 'View nearby requests', 'Accept/Decline', 'Verify requests', 'Manage staff', 'Issue blood', 'Update inventory', 'Analytics', 'User management', 'AI forecast', 'Emergency broadcast'];
  const matrix = {
    donor: [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
    patient: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    family: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    hospital_staff: [1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    hospital_admin: [1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1],
    blood_bank_staff: [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1],
    blood_bank_admin: [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1],
    super_admin: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  };
  return `
  ${panel('🔑 Role & Permission Matrix', `
    <div style="overflow:auto"><table class="matrix">
      <thead><tr><th>Feature</th>${Object.values(ROLE_NAME).map(n => `<th>${n.replace(' / ', '/<br>')}</th>`).join('')}</tr></thead>
      <tbody>${features.map((f, i) => `<tr><td>${f}</td>${Object.keys(ROLE_NAME).map(r =>
        `<td class="${matrix[r][i] ? 'yes' : 'no'}">${matrix[r][i] ? '✓' : '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`,
    `<span class="tag t-grp">8 roles</span>`)}
  <div style="height:18px"></div>
  ${panel('Access rules', `<p style="font-size:.85rem;color:#7b8194;line-height:1.75">
    Every session is scoped server-side by role: donors only see compatible nearby requests and their own activities; patients/families only their own requests; hospital staff only their assigned hospital's requests; blood bank staff only their own bank's inventory; hospital & bank admins additionally manage their own staff; the Super Admin has read/write across the entire LifeLink network with every action written to the audit log.</p>`)}`;
};

PAGES['s-reports'] = () => `<div id="saRep">${empty('Loading analytics…')}</div>`;
AFTER['s-reports'] = loadAnalytics;

PAGES['s-complaints'] = () => {
  const list = S.dash.complaints || [];
  return panel('🚩 Complaint Management', list.length ? list.map(c => `
    <div class="rcard">
      <div class="rh"><span class="tag ${c.status === 'open' ? 't-pending' : 't-completed'}">${c.status.toUpperCase()}</span>
        <b>${esc(c.against)}</b> <span class="id">#${esc(c.id)}</span></div>
      <div class="rmeta"><span>💬 ${esc(c.message)}</span></div>
      <div class="ract">
        <span style="font-size:.78rem;color:#7b8194">By user ${esc(c.userId)} · ${fmtDate(c.at)}</span>
        ${c.status === 'open' ? `<button class="btn ok sm" onclick="resolveComplaint('${c.id}','resolved')">✔ Resolve</button>
          <button class="btn no sm" onclick="resolveComplaint('${c.id}','dismissed')">Dismiss</button>` : ''}
      </div></div>`).join('') : empty('No complaints 🎉'),
    `<button class="btn sec sm" onclick="newComplaintModal()">+ File complaint</button>`);
};
async function resolveComplaint(id, status) {
  try { await api('/complaints/' + id, 'PATCH', { status }); toast('Updated ✓', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
function newComplaintModal() {
  openG(`<h2 class="mh">🚩 File a complaint</h2><form onsubmit="return fileComplaint(event)">
    <label>Against<input id="cpAgainst" required placeholder="User / hospital / blood bank"></label>
    <label>Message<textarea id="cpMsg" rows="4" required placeholder="Describe the issue…"></textarea></label>
    <button class="btn pri" style="width:100%" type="submit">Submit complaint</button>
    <p class="err" id="cpErr"></p></form>`);
}
async function fileComplaint(e) {
  e.preventDefault();
  try { await api('/complaints', 'POST', { against: $('cpAgainst').value, message: $('cpMsg').value }); toast('Complaint filed', 'ok'); closeG(); refreshDash(); }
  catch (err) { $('cpErr').textContent = err.message; }
  return false;
}

PAGES['s-system'] = () => {
  const sys = S.dash.system || {};
  const mins = Math.floor(sys.uptime / 60);
  return `
  <div class="stats">
    ${stat('Uptime', mins + 'm ' + Math.floor(sys.uptime % 60) + 's', 'server running', 'ok')}
    ${stat('API calls', (sys.apiCalls || 0).toLocaleString('en-IN'), 'this session', 'blue')}
    ${stat('Heap used', Math.round((sys.memory || 0) / 1048576) + ' MB', 'node memory', 'pur')}
    ${stat('Last sync', sys.syncAt ? ago(sys.syncAt) : '—', 'app ↔ software', 'warn')}
  </div>
  <div class="grid2">
    ${panel('🖥️ System Monitoring', `
      <div class="kv" style="grid-template-columns:1fr">
        <div class="k"><span>Data file</span><b style="font-size:.8rem;word-break:break-all">${esc(sys.dataFile || '—')}</b></div>
        <div class="k"><span>Sync source</span><b>eRaktKosh (simulated)</b></div>
        <div class="k"><span>Server</span><b>Node.js · zero dependencies</b></div>
        <div class="k"><span>Auth</span><b>SHA-256 hashed · session tokens</b></div>
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn blue sm" onclick="syncNow()">🔄 Sync now</button>
        <button class="btn amber sm" onclick="resetDemo()">♻ Reset demo data</button>
      </div>`)}
    ${panel('Health checks', `
      <div class="bd"><span>API server</span><b style="color:#16a34a">● healthy</b></div>
      <div class="bd"><span>Database (JSON)</span><b style="color:#16a34a">● writable</b></div>
      <div class="bd"><span>Notification service</span><b style="color:#16a34a">● online</b></div>
      <div class="bd"><span>AI engine</span><b style="color:#16a34a">● forecasting</b></div>
      <div class="bd"><span>Emergency broadcaster</span><b style="color:#16a34a">● armed</b></div>
      <div class="bd"><span>Stock sync bridge</span><b style="color:#d97706">● simulated</b></div>`)}
  </div>`;
};
async function syncNow() {
  try { await api('/system/sync', 'POST'); toast('Synced with blood bank software ✓', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
async function resetDemo() {
  if (!confirm('Reset ALL demo data? This cannot be undone.')) return;
  try { await api('/system/reset', 'POST'); toast('Demo data reset', 'ok'); setTimeout(() => location.reload(), 800); }
  catch (e) { toast(e.message, 'bad'); }
}

PAGES['s-logs'] = () => `<div id="sLogs">${empty('Loading…')}</div>`;
AFTER['s-logs'] = async () => {
  try { const logs = await api('/system/logs'); if ($('sLogs')) $('sLogs').innerHTML = logPage(logs); }
  catch (e) { if ($('sLogs')) $('sLogs').innerHTML = empty(e.message); }
};

PAGES['s-trust'] = () => {
  const board = S.dash.trustBoard || [];
  return `
  ${panel('⭐ Trust Leaderboard', board.length ? `
    <table><thead><tr><th>#</th><th>Donor</th><th>City</th><th>Group</th><th>Trust</th><th>Level</th><th>Completed</th><th>Verified</th></tr></thead>
    <tbody>${board.map((d, i) => `<tr>
      <td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
      <td><b>${esc(d.name)}</b></td><td>${esc(d.city || '—')}</td>
      <td>${d.bloodGroup ? bgTag(d.bloodGroup) : '—'}</td>
      <td><div class="hbar" style="margin:0;min-width:120px"><div class="tr"><i style="width:${d.trust.score}%"></i></div><span class="vl">${d.trust.score}</span></div></td>
      <td><span class="tag ${d.trust.score >= 85 ? 't-completed' : d.trust.score >= 70 ? 't-verified' : 't-pending'}">${d.trust.level}</span></td>
      <td>${d.stats ? d.stats.completed : 0}</td>
      <td>${d.verified ? '✔' : '⏳'}</td></tr>`).join('')}</tbody></table>`
    : empty('No donors yet.'), `<span class="tag t-grp">${board.length} donors</span>`)}
  <div style="height:18px"></div>
  ${panel('How trust is calculated', `<p style="font-size:.85rem;color:#7b8194;line-height:1.7">
    <b>24%</b> response rate (accepted ÷ responded) · <b>24%</b> show-up rate (completed ÷ accepted) ·
    <b>16%</b> punctuality (on-time ÷ completed) · <b>14%</b> consistency (no missed commitments) ·
    <b>12%</b> experience (scales to 6+ donations) · <b>10%</b> verification status.
    Scores update in real time after every accept, decline and confirmed donation.</p>`)}`;
};

PAGES['s-ai'] = () => `<div id="aiBox">${empty('Loading AI forecast…')}</div>`;
AFTER['s-ai'] = loadAi;

PAGES['s-integration'] = () => {
  const sys = S.dash.system || {};
  return `
  ${panel('🔗 App ↔ Software Integration Hub', `
    <p style="font-size:.88rem;color:#7b8194;margin-bottom:16px">This is the bridge that existing apps don't have: donor-facing app data and hospital/blood-bank software data flow through one integration layer with a shared audit trail.</p>
    <div class="grid2">
      <div class="k" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:13px;padding:16px">
        <span style="font-size:.68rem;text-transform:uppercase;letter-spacing:1px;color:#15803d;font-weight:800">Sync status</span>
        <b style="display:block;font-size:1.15rem;margin-top:6px;color:#14532d">🟢 Connected</b>
        <span style="font-size:.78rem;color:#15803d">Last sync: ${sys.syncAt ? ago(sys.syncAt) : '—'} · source: eRaktKosh (simulated)</span>
      </div>
      <div class="k" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:13px;padding:16px">
        <span style="font-size:.68rem;text-transform:uppercase;letter-spacing:1px;color:#1d4ed8;font-weight:800">API calls served</span>
        <b style="display:block;font-size:1.15rem;margin-top:6px;color:#1e40af">${(sys.apiCalls || 0).toLocaleString('en-IN')}</b>
        <span style="font-size:.78rem;color:#1d4ed8">REST · JSON · session-token auth</span>
      </div>
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn blue sm" onclick="syncNow()">🔄 Sync now</button>
      <button class="btn sec sm" onclick="showEndpoints()">📄 View API endpoints</button>
    </div>`)}
  <div style="height:18px"></div>
  <div class="grid2">
    ${panel('Flow: donor app → hospital software', `
      <div class="tl" style="margin-top:4px">
        <div class="ev"><b>Donor accepts request</b><small>App → POST /api/donor/respond</small></div>
        <div class="ev"><b>Hospital staff verifies</b><small>Software → PATCH /api/requests/:id/status</small></div>
        <div class="ev"><b>Blood bank issues stock</b><small>Software → POST /api/requests/:id/issue (auto-decrements inventory)</small></div>
        <div class="ev"><b>Donation confirmed</b><small>App → POST /api/donor/donate (trust score + certificate updated)</small></div>
      </div>`)}
    ${panel('Flow: software → donor app', `
      <div class="tl" style="margin-top:4px">
        <div class="ev"><b>Inventory changes</b><small>Stock update → live availability on donor app</small></div>
        <div class="ev"><b>AI forecast published</b><small>Engine → /api/predict consumed by all dashboards</small></div>
        <div class="ev"><b>Emergency raised</b><small>One tap → broadcast to compatible donors (city-scoped)</small></div>
        <div class="ev"><b>Audit trail</b><small>Every mutation → /api/system/logs (Super Admin)</small></div>
      </div>`)}
  </div>`;
};
function showEndpoints() {
  const eps = [
    ['POST', '/api/auth/register|login', 'session tokens'],
    ['GET', '/api/dashboard', 'role-scoped payload'],
    ['GET', '/api/requests/:id', 'request + donor cards + trust'],
    ['POST', '/api/donor/respond|donate', 'trust-score inputs'],
    ['POST|GET', '/api/donor/medical', 'medical form + auto-eligibility'],
    ['POST', '/api/donor-verifications/:id', 'Super Admin approve / defer'],
    ['PATCH', '/api/bloodbanks/:id/inventory', 'live stock sync'],
    ['POST', '/api/requests/:id/issue', 'issue + stock decrement'],
    ['GET', '/api/predict', 'AI 7-day forecast'],
    ['POST', '/api/emergency', 'emergency broadcast'],
    ['GET', '/api/analytics', '14-day charts'],
    ['GET', '/api/system/logs', 'audit trail']
  ];
  openG(`<h2 class="mh">📄 LifeLink REST API</h2>
    <p class="msub">Same endpoints power the mobile app, hospital software and blood-bank software — the integration layer.</p>
    <div style="font-family:consolas,monospace;font-size:.78rem;background:#12141d;color:#d7e0ff;border-radius:13px;padding:16px;line-height:2;overflow:auto">
      ${eps.map(([m, p, d]) => `<div><span style="color:${m === 'GET' ? '#4ade80' : m === 'POST' ? '#60a5fa' : '#fbbf24'};font-weight:800">${m.padEnd(6)}</span> <span style="color:#fff">${p}</span> <span style="color:#8b93a7">— ${d}</span></div>`).join('')}
    </div>
    <button class="btn pri" style="width:100%;margin-top:14px" onclick="closeG()">Close</button>`);
}
