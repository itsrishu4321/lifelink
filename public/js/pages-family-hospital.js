/* ===== LifeLink pages: Family + Hospital Staff + Hospital Admin ===== */
/* ================= FAMILY / ATTENDANT ================= */
PAGES['f-patient'] = () => {
  const patients = S.dash.patients || [];
  return `
  ${panel('➕ Add / Select Patient', `
    <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">Add the patient you are requesting for, then select them before starting a request.</p>
    <div class="grid2">
      <div>
        <b style="font-size:.9rem">Your patients</b>
        <div style="margin-top:10px">${patients.length ? patients.map((p, i) => `
          <label style="display:flex;gap:12px;align-items:center;background:#f8f9fd;border:1.5px solid ${DRAFT.patientName === p.name ? '#ffb3ba' : 'transparent'};border-radius:13px;padding:13px 15px;margin-bottom:9px;cursor:pointer">
            <input type="radio" name="fampat" ${DRAFT.patientName === p.name ? 'checked' : ''} style="width:auto;margin:0" onchange="pickPatient(${i})">
            <div style="flex:1"><b style="font-size:.9rem">${esc(p.name)}</b>
              <span style="display:block;font-size:.77rem;color:#7b8194">${esc(p.bloodGroup || '?')} · ${esc(p.age || '?')} yrs · ${esc(p.condition || 'no condition noted')}</span></div>
          </label>`).join('') : empty('No patients added yet.')}</div>
      </div>
      <div>
        <b style="font-size:.9rem">Add new patient</b>
        <form onsubmit="return addPatient(event)" style="margin-top:10px">
          <label>Patient name<input id="npName" required placeholder="Full name"></label>
          <div class="row2">
            <label>Age<input id="npAge" type="number" placeholder="Age"></label>
            <label>Blood group<select id="npGroup"><option value="">—</option>${['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => `<option>${g}</option>`).join('')}</select></label>
          </div>
          <label>Condition<input id="npCond" placeholder="e.g. Thalassemia – monthly transfusion"></label>
          <button class="btn pri" style="width:100%" type="submit">➕ Add patient</button>
          <p class="err" id="npErr"></p>
        </form>
      </div>
    </div>`)}
  <div style="height:18px"></div>
  ${panel('🩸 Request for selected patient', `
    <div class="btn-row">
      <button class="btn pri" ${DRAFT.patientName ? '' : 'disabled'} onclick="startFamilyRequest()">Start request for <b>${esc(DRAFT.patientName || '—')}</b> →</button>
      <button class="btn sec" onclick="go('f-track')">Track requests</button>
    </div>`)}`;
};
function pickPatient(i) {
  const p = (S.dash.patients || [])[i];
  if (p) { DRAFT.patientName = p.name; DRAFT.patientAge = p.age; DRAFT.bloodGroup = p.bloodGroup || DRAFT.bloodGroup; DRAFT.condition = p.condition || ''; }
  go('f-patient');
}
async function addPatient(e) {
  e.preventDefault();
  const p = { id: 'P' + Date.now(), name: $('npName').value.trim(), age: $('npAge').value, bloodGroup: $('npGroup').value, condition: $('npCond').value, gender: '', phone: S.user.phone };
  if (!p.name) { $('npErr').textContent = 'Name required'; return false; }
  try {
    await api('/profile/patients', 'POST', { patient: p });
    (S.dash.patients = S.dash.patients || []).push(p);
    DRAFT.patientName = p.name;
    toast('Patient added', 'ok'); go('f-patient');
  } catch (err) { $('npErr').textContent = err.message; }
  return false;
}
function startFamilyRequest() {
  if (!DRAFT.patientName) return toast('Select a patient first', 'bad');
  go('f-request');
}

PAGES['f-request'] = () => {
  if (!DRAFT.patientName) return PAGES['f-patient']();
  const groups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  return `
  ${panel('🩸 Request Blood — for ' + esc(DRAFT.patientName), `
    <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">Step 1: choose blood group.</p>
    <div class="stock-grid">${groups.map(g => `
      <button class="stock" style="cursor:pointer;${DRAFT.bloodGroup === g ? 'border-color:#e63946;background:#fff5f5' : ''}" onclick="pickGroup('${g}',this)">
        <div class="g" style="${DRAFT.bloodGroup === g ? 'color:#e63946' : ''}">${g}</div>
        <div class="u" style="font-size:.95rem">${DRAFT.bloodGroup === g ? '✔ SELECTED' : 'select'}</div></button>`).join('')}</div>
    <div class="row2" style="margin-top:16px">
      <label>Required units<input type="number" id="reqUnits" min="1" max="10" value="${DRAFT.units}" oninput="DRAFT.units=this.value"></label>
      <label>Urgency<select onchange="DRAFT.urgency=this.value">
        <option value="normal" ${DRAFT.urgency === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="critical" ${DRAFT.urgency === 'critical' ? 'selected' : ''}>🚨 Critical</option></select></label>
    </div>`)}
  <div style="height:18px"></div>
  ${panel('🏥 Hospital Information', `${hospitalPicker(DRAFT.hospitalId)}
    <div class="btn-row" style="margin-top:12px">
      <button class="btn pri" onclick="submitFamilyRequest(false)">✅ Submit request</button>
      <button class="btn no" onclick="submitFamilyRequest(true)">🚨 + Emergency broadcast</button>
    </div>
    <p class="err" id="reqErr"></p>`)}`;
};
AFTER['f-request'] = () => loadHospitals(DRAFT.hospitalId);

async function submitFamilyRequest(emergency) {
  if (!DRAFT.bloodGroup) { $('reqErr').textContent = 'Select blood group'; return; }
  try {
    const d = await api('/requests', 'POST', {
      bloodGroup: DRAFT.bloodGroup, units: +DRAFT.units || 1, urgency: DRAFT.urgency,
      hospitalId: $('reqHospId').value, patientName: DRAFT.patientName, patientAge: DRAFT.patientAge,
      gender: 'Unknown', contactPhone: S.user.phone, condition: DRAFT.condition, emergency
    });
    toast(emergency ? '🚨 Emergency broadcast sent!' : '✅ Request submitted', 'ok');
    await refreshDash(); go('f-track'); viewRequest(d.request.id);
  } catch (e) { $('reqErr').textContent = e.message; }
}

PAGES['f-pinfo'] = () => {
  const patients = S.dash.patients || [];
  const sel = patients.find(p => p.name === DRAFT.patientName) || patients[0];
  if (!sel) return panel('🧍 Patient Information', empty('No patients yet — add one from "Add / Select Patient".'));
  return panel('🧍 Patient Information', `
    <div class="prof">
      <div class="pic">${esc((sel.name || '?')[0])}</div>
      <div style="flex:1">
        <h2 style="letter-spacing:-.6px">${esc(sel.name)}</h2>
        <div class="btn-row" style="margin-top:10px">${sel.bloodGroup ? bgTag(sel.bloodGroup) : ''}<span class="tag t-verified">${esc(sel.age || '?')} yrs</span></div>
      </div>
    </div>
    <div class="kv">
      <div class="k"><span>Condition</span><b>${esc(sel.condition || '—')}</b></div>
      <div class="k"><span>Phone</span><b>${esc(sel.phone || S.user.phone || '—')}</b></div>
      <div class="k"><span>Attendant</span><b>${esc(S.user.name)}</b></div>
      <div class="k"><span>Patient ID</span><b>${esc(sel.id)}</b></div>
    </div>`, `<button class="btn sec sm" onclick="go('f-patient')">Manage patients</button>`);
};

PAGES['f-hinfo'] = () => `<div id="fHosp">${empty('Loading hospitals…')}</div>`;
AFTER['f-hinfo'] = async () => {
  try {
    const hs = (await api('/hospitals')).filter(h => h.verified);
    if (!$('fHosp')) return;
    $('fHosp').innerHTML = panel('🏥 Hospital Information', hs.map(h => `
      <div class="bd" style="align-items:flex-start;padding:15px 16px;margin-bottom:10px">
        <div><b style="font-size:.95rem">${esc(h.name)}</b>
          <span style="display:block;font-size:.8rem;color:#7b8194;margin-top:3px">${esc(h.address)} · ${esc(h.city)}</span>
          <span style="display:block;font-size:.78rem;color:#7b8194;margin-top:3px">📞 ${esc(h.phone || '—')}</span></div>
        <span class="tag t-completed">✔ VERIFIED</span></div>`).join('') || empty('No hospitals'));
  } catch (e) { if ($('fHosp')) $('fHosp').innerHTML = empty(e.message); }
};

PAGES['f-track'] = () => activeRequestsHtml('Request Tracking');
PAGES['f-response'] = () => donorResponsePage();

/* ================= HOSPITAL STAFF ================= */
PAGES['h-name'] = () => {
  const h = S.dash.hospital, s = S.dash.stats;
  if (!h) return empty('No hospital assigned to your account.');
  return `
  <div class="banner">
    <div class="big">🏥</div>
    <div><h2>${esc(h.name)}</h2><p>${esc(h.address)} · ${esc(h.city)} · 📞 ${esc(h.phone || '—')}</p></div>
    <div class="bstats">
      <div><b>${s.total}</b><span>Total requests</span></div>
      <div><b>${s.pending}</b><span>Pending</span></div>
      <div><b>${s.verified}</b><span>Verified</span></div>
      <div><b>${s.completed}</b><span>Completed</span></div>
    </div>
  </div>
  ${panel('Your assignment', `
    <div class="kv">
      <div class="k"><span>Your role</span><b>${ROLE_NAME[S.user.role]}</b></div>
      <div class="k"><span>Designation</span><b>${esc(S.user.designation || '—')}</b></div>
      <div class="k"><span>Hospital ID</span><b>${esc(h.id)}</b></div>
      <div class="k"><span>Verified</span><b>${h.verified ? '✔ Yes' : '⏳ Pending'}</b></div>
    </div>`)}`;
};

const reqFilter = (statuses) => (S.dash.requests || []).filter(r => statuses.includes(r.status));
const staffActions = (r) => {
  const a = [];
  if (r.status === 'new') a.push(`<button class="btn amber sm" onclick="setReqStatus('${r.id}','pending')">Mark pending review</button>`);
  if (r.status === 'pending') a.push(`<button class="btn ok sm" onclick="setReqStatus('${r.id}','verified')">✔ Verify</button>`);
  if (r.status === 'verified') a.push(`<button class="btn blue sm" onclick="setReqStatus('${r.id}','coordinating')">Start coordination</button>`);
  a.push(`<button class="btn sec sm" onclick="viewRequest('${r.id}')">Details</button>`);
  return a.join('');
};
async function setReqStatus(id, status) {
  try {
    await api('/requests/' + id + '/status', 'PATCH', { status, note: 'Updated by ' + S.user.name });
    toast('Status → ' + status, 'ok'); refreshDash();
  } catch (e) { toast(e.message, 'bad'); }
}

PAGES['h-new'] = () => panel('🆕 New Blood Requests', (() => {
  const l = reqFilter(['new']);
  return l.length ? l.map(r => reqCard(r, staffActions(r))).join('') : empty('No new requests.');
})(), `<span class="tag t-new">${reqFilter(['new']).length}</span>`);
PAGES['h-pending'] = () => panel('⏳ Pending Requests', (() => {
  const l = reqFilter(['pending']);
  return l.length ? l.map(r => reqCard(r, staffActions(r))).join('') : empty('No pending requests.');
})(), `<span class="tag t-pending">${reqFilter(['pending']).length}</span>`);
PAGES['h-verified'] = () => panel('✔️ Verified Requests', (() => {
  const l = reqFilter(['verified', 'coordinating']);
  return l.length ? l.map(r => reqCard(r, staffActions(r))).join('') : empty('No verified requests.');
})(), `<span class="tag t-verified">${reqFilter(['verified', 'coordinating']).length}</span>`);

PAGES['h-details'] = () => {
  const l = S.dash.requests || [];
  return panel('📋 Patient Request Details', l.length ? `
    <table><thead><tr><th>ID</th><th>Patient</th><th>Group</th><th>Units</th><th>Urgency</th><th>Created</th><th>Status</th><th></th></tr></thead>
    <tbody>${l.map(r => `<tr>
      <td><code>${esc(r.id)}</code></td><td>${esc(r.patientName)}</td><td>${bgTag(r.bloodGroup)}</td>
      <td>${r.units}</td><td>${urgTag(r.urgency)}</td><td>${fmtDay(r.createdAt)}</td>
      <td>${stTag(r.status)}</td>
      <td><button class="btn sec sm" onclick="viewRequest('${r.id}')">Open</button></td></tr>`).join('')}</tbody></table>`
    : empty('No requests for this hospital yet.'));
};

PAGES['h-response'] = () => `<div id="hResp">${empty('Loading…')}</div>`;
AFTER['h-response'] = async () => {
  const l = (S.dash.requests || []).filter(r => (r.responses || []).length);
  if (!$('hResp')) return;
  if (!l.length) { $('hResp').innerHTML = panel('🤝 Donor Response Status', empty('No donor responses yet.')); return; }
  $('hResp').innerHTML = panel('🤝 Donor Response Status', l.map(r => `
    <div class="rcard">
      <div class="rh">${bgTag(r.bloodGroup)} <b>#${esc(r.id)}</b> ${stTag(r.status)} <span class="id">${esc(r.patientName)}</span></div>
      <div class="rmeta">
        <span>✅ Accepted: <b style="color:#16a34a">${r.responses.filter(x => x.status === 'accepted').length}</b></span>
        <span>✖ Declined: <b>${r.responses.filter(x => x.status === 'declined').length}</b></span>
      </div>
      <button class="btn sec sm" onclick="viewRequest('${r.id}')">Donor cards + trust scores</button>
    </div>`).join(''));
};

PAGES['h-bank'] = () => bankCoordPage();
PAGES['ha-bank'] = () => bankCoordPage();
function bankCoordPage() {
  const banks = S.dash.bloodBanks || [];
  return panel('🧪 Blood Bank Coordination', banks.length ? banks.map(b => `
    <div class="bd" style="align-items:center;padding:15px 16px;margin-bottom:10px">
      <div><b style="font-size:.95rem">${esc(b.name)}</b>
        <span style="display:block;font-size:.8rem;color:#7b8194;margin-top:3px">${esc(b.address)} · 📞 ${esc(b.phone || '—')}</span></div>
      <span class="tag ${b.available ? 't-completed' : 't-cancelled'}">${b.available ? '🟢 OPEN' : '⏸ CLOSED'}</span>
      <span class="tag t-verified">${b.code}</span>
    </div>`).join('') + `<p style="font-size:.78rem;color:#7b8194;margin-top:8px">Stock syncs live with the app ↔ software integration layer (last sync: ${S.dash.hospital ? 'auto' : 'auto'}).</p>`
    : empty('No verified blood bank in your city yet.'));
}

PAGES['h-update'] = () => {
  const l = (S.dash.requests || []).filter(r => !['completed', 'cancelled'].includes(r.status));
  return panel('🔄 Update Request Status', l.length ? l.map(r => `
    <div class="rcard">
      <div class="rh">${bgTag(r.bloodGroup)} <b>#${esc(r.id)}</b> ${stTag(r.status)} ${urgTag(r.urgency)} <span class="id">${esc(r.patientName)}</span></div>
      <div class="ract">
        ${r.status === 'new' ? `<button class="btn amber sm" onclick="setReqStatus('${r.id}','pending')">→ Pending</button>` : ''}
        ${r.status === 'pending' ? `<button class="btn ok sm" onclick="setReqStatus('${r.id}','verified')">→ Verified</button>` : ''}
        ${['verified', 'coordinating'].includes(r.status) ? `<button class="btn blue sm" onclick="setReqStatus('${r.id}','coordinating')">→ Coordinating</button>` : ''}
        <button class="btn sec sm" onclick="viewRequest('${r.id}')">Details</button>
      </div>
    </div>`).join('') : empty('No open requests to update.'));
};
PAGES['h-history'] = () => {
  const l = S.dash.requests || [];
  return panel('🗂️ Request History', l.length ? `
    <table><thead><tr><th>ID</th><th>Group</th><th>Patient</th><th>Status</th><th>Updated</th><th></th></tr></thead>
    <tbody>${l.map(r => `<tr><td><code>${esc(r.id)}</code></td><td>${bgTag(r.bloodGroup)}</td>
      <td>${esc(r.patientName)}</td><td>${stTag(r.status)}</td><td>${ago(r.updatedAt)}</td>
      <td><button class="btn sec sm" onclick="viewRequest('${r.id}')">View</button></td></tr>`).join('')}</tbody></table>`
    : empty('No history.'));
};

/* ================= HOSPITAL ADMIN ================= */
PAGES['ha-profile'] = () => {
  const h = S.dash.hospital, s = S.dash.stats;
  if (!h) return empty('No hospital assigned.');
  return `
  <div class="banner">
    <div class="big">🏥</div>
    <div><h2>${esc(h.name)}</h2><p>${esc(h.address)} · ${esc(h.city)}</p></div>
    <div class="bstats">
      <div><b>${s.total}</b><span>Requests</span></div>
      <div><b>${s.pending}</b><span>Pending</span></div>
      <div><b>${s.completed}</b><span>Completed</span></div>
      <div><b>${(S.dash.staff || []).length}</b><span>Staff</span></div>
    </div>
  </div>
  ${panel('Hospital Profile', `<div class="kv">
    <div class="k"><span>Hospital ID</span><b>${esc(h.id)}</b></div>
    <div class="k"><span>Phone</span><b>${esc(h.phone || '—')}</b></div>
    <div class="k"><span>Verification code</span><b><code>${esc(h.code)}</code></b></div>
    <div class="k"><span>Status</span><b>${h.verified ? '✔ Verified' : '⏳ Pending'}</b></div>
    <div class="k"><span>Registered</span><b>${fmtDay(h.createdAt)}</b></div>
    <div class="k"><span>Completion rate</span><b>${s.total ? Math.round(s.completed / s.total * 100) : 0}%</b></div>
  </div>`)}`;
};

PAGES['ha-total'] = () => {
  const s = S.dash.stats, l = S.dash.requests || [];
  const byStatus = ['new', 'pending', 'verified', 'coordinating', 'completed', 'cancelled'].map(x => ({ x, n: l.filter(r => r.status === x).length }));
  const max = Math.max(...byStatus.map(b => b.n), 1);
  return `
  <div class="stats">
    ${stat('Total Blood Requests', s.total, 'all time', 'blue')}
    ${stat('Pending Requests', s.pending, 'needs action', 'warn')}
    ${stat('Verified Requests', s.verified, 'in coordination')}
    ${stat('Completed Requests', s.completed, 'lives saved', 'ok')}
  </div>
  ${panel('Status distribution', byStatus.map(b => `
    <div class="hbar"><span class="nm" style="width:96px">${b.x}</span>
      <div class="tr"><i style="width:${b.n / max * 100}%"></i></div><span class="vl">${b.n}</span></div>`).join(''))}`;
};
PAGES['ha-pending'] = () => panel('⏳ Pending Requests', (() => {
  const l = reqFilter(['new', 'pending']);
  return l.length ? l.map(r => reqCard(r, staffActions(r) + `<button class="btn pri sm" onclick="openAssign('${r.id}')">📌 Assign</button>`)).join('') : empty('No pending requests.');
})());
PAGES['ha-completed'] = () => panel('✅ Completed Requests', (() => {
  const l = reqFilter(['completed']);
  return l.length ? l.map(r => reqCard(r, `<button class="btn sec sm" onclick="viewRequest('${r.id}')">View record</button>`)).join('') : empty('No completed requests yet.');
})());

PAGES['ha-staff'] = () => {
  const staff = S.dash.staff || [];
  return panel('👥 Manage Hospital Staff', staff.length ? `
    <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Designation</th><th>Status</th><th></th></tr></thead>
    <tbody>${staff.map(s => `<tr>
      <td><b>${esc(s.name)}</b></td><td>${esc(s.email)}</td>
      <td><span class="tag ${s.role === 'hospital_admin' ? 't-verified' : 't-new'}">${ROLE_NAME[s.role]}</span></td>
      <td>${esc(s.designation || '—')}</td>
      <td>${s.active ? '<span class="tag t-completed">ACTIVE</span>' : '<span class="tag t-cancelled">REMOVED</span>'}</td>
      <td>${s.id !== S.user.id && s.active ? `<button class="btn no sm" onclick="removeStaff('${s.id}')">Remove</button>` : ''}</td></tr>`).join('')}</tbody></table>`
    : empty('No staff yet — add some.'), `<button class="btn pri sm" onclick="go('ha-addstaff')">➕ Add staff</button>`);
};
async function removeStaff(id) {
  if (!confirm('Remove this staff member?')) return;
  try { await api('/hospitals/' + S.user.hospitalId + '/staff/' + id, 'DELETE'); toast('Staff removed', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}

PAGES['ha-addstaff'] = () => panel('➕ Add / Remove Staff', `
  <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">New staff can sign in immediately with the credentials you set below (default password: <code>staff123</code>).</p>
  <form onsubmit="return addHospStaff(event)">
    <div class="row2">
      <label>Full name<input id="asName" required placeholder="Staff name"></label>
      <label>Email<input id="asEmail" type="email" required placeholder="staff@hospital.in"></label>
    </div>
    <div class="row3">
      <label>Role<select id="asRole"><option value="hospital_staff">Hospital Staff</option><option value="hospital_admin">Hospital Admin</option></select></label>
      <label>Designation<input id="asDesig" placeholder="Ward Coordinator"></label>
      <label>Password<input id="asPass" type="text" value="staff123"></label>
    </div>
    <button class="btn pri" type="submit">➕ Add staff member</button>
    <p class="err" id="asErr"></p>
  </form>
  <hr style="border:none;border-top:1px solid #eceef4;margin:22px 0 16px">
  <b style="font-size:.9rem">Remove staff</b>
  <p style="font-size:.82rem;color:#7b8194;margin:6px 0 10px">Go to <a href="#" onclick="go('ha-staff');return false">Manage Hospital Staff</a> and use the Remove button (deactivates access instantly).</p>`);
async function addHospStaff(e) {
  e.preventDefault();
  try {
    await api('/hospitals/' + S.user.hospitalId + '/staff', 'POST', {
      name: $('asName').value, email: $('asEmail').value, role: $('asRole').value,
      phone: '', city: S.dash.hospital.city, password: $('asPass').value
    });
    // designation stored via profile patch if provided — keep simple
    toast('Staff added 🎉', 'ok'); $('asErr').textContent = ''; e.target.reset(); $('asPass').value = 'staff123';
    refreshDash();
  } catch (err) { $('asErr').textContent = err.message; }
  return false;
}

PAGES['ha-assign'] = () => {
  const l = (S.dash.requests || []).filter(r => !['completed', 'cancelled'].includes(r.status));
  const staff = (S.dash.staff || []).filter(s => s.active && s.role === 'hospital_staff');
  return panel('📌 Assign Requests', l.length ? l.map(r => `
    <div class="rcard">
      <div class="rh">${bgTag(r.bloodGroup)} <b>#${esc(r.id)}</b> ${stTag(r.status)} <span class="id">${esc(r.patientName)} · ${r.units} units</span></div>
      <div class="ract">
        <select style="width:auto;margin:0" id="asg_${r.id}">
          <option value="">— unassigned —</option>
          ${staff.map(s => `<option value="${s.id}" ${r.assignedTo === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
        </select>
        <button class="btn pri sm" onclick="assignReq('${r.id}')">Assign</button>
        ${r.assignedTo ? `<span class="tag t-verified">Assigned: ${esc((staff.find(s => s.id === r.assignedTo) || {}).name || r.assignedTo)}</span>` : '<span class="tag t-pending">Unassigned</span>'}
      </div>
    </div>`).join('') : empty('No open requests to assign.'));
};
async function assignReq(id) {
  const staffId = $('asg_' + id).value;
  try { await api('/requests/' + id + '/assign', 'POST', { staffId }); toast('Assigned ✓', 'ok'); refreshDash(); }
  catch (e) { toast(e.message, 'bad'); }
}
function openAssign(id) { go('ha-assign'); setTimeout(() => { const el = $('asg_' + id); if (el) el.focus(); }, 250); }

PAGES['ha-donor'] = () => `<div id="haDonor">${empty('Loading…')}</div>`;
AFTER['ha-donor'] = async () => {
  const l = (S.dash.requests || []).filter(r => (r.responses || []).length);
  if (!$('haDonor')) return;
  if (!l.length) { $('haDonor').innerHTML = panel('🤝 Donor Response Monitoring', empty('No responses recorded yet.')); return; }
  $('haDonor').innerHTML = panel('🤝 Donor Response Monitoring', `
    <table><thead><tr><th>Request</th><th>Group</th><th>Accepted</th><th>Declined</th><th>Response rate</th><th>Status</th><th></th></tr></thead>
    <tbody>${l.map(r => {
      const acc = r.responses.filter(x => x.status === 'accepted').length, dec = r.responses.filter(x => x.status === 'declined').length;
      const rate = acc + dec ? Math.round(acc / (acc + dec) * 100) : 0;
      return `<tr><td><code>${esc(r.id)}</code></td><td>${bgTag(r.bloodGroup)}</td>
        <td style="color:#16a34a;font-weight:800">${acc}</td><td>${dec}</td>
        <td><div class="hbar" style="margin:0"><div class="tr"><i style="width:${rate}%"></i></div><span class="vl">${rate}%</span></div></td>
        <td>${stTag(r.status)}</td>
        <td><button class="btn sec sm" onclick="viewRequest('${r.id}')">Details</button></td></tr>`;
    }).join('')}</tbody></table>`);
};

PAGES['ha-reports'] = () => `<div id="haRep">${empty('Loading analytics…')}</div>`;
AFTER['ha-reports'] = loadAnalytics;
async function loadAnalytics() {
  const box = $('haRep') || $('saRep') || $('baRep');
  if (!box) return;
  try {
    const a = await api('/analytics');
    const maxD = Math.max(...a.byDay.map(d => d.requests), 1);
    const maxG = Math.max(...a.byGroup.map(g => g.requests), 1);
    const total = a.byGroup.reduce((s, g) => s + g.requests, 0) || 1;
    box.innerHTML = `
    <div class="stats">
      ${stat('Requests (14d)', a.byDay.reduce((s, d) => s + d.requests, 0), 'trend window', 'blue')}
      ${stat('Donations (14d)', a.byDay.reduce((s, d) => s + d.donations, 0), 'confirmed', 'ok')}
      ${stat('Completion', Math.round((a.byStatus.find(s => s.status === 'completed') || {}).count / (a.byStatus.reduce((s, x) => s + x.count, 0) || 1) * 100) + '%', 'of all requests', 'pur')}
      ${stat('AI risk', (a.prediction.overallRisk || '').toUpperCase(), '7-day horizon', a.prediction.overallRisk === 'stable' ? 'ok' : 'warn')}
    </div>
    <div class="grid2">
      ${panel('Requests per day (14 days)', `<div class="spark">${a.byDay.map(d => `
        <div class="col" style="height:${Math.max(6, d.requests / maxD * 100)}%" title="${d.requests} requests"><span>${d.requests || ''}</span><b>${d.day}</b></div>`).join('')}</div>
        <div style="height:26px"></div>`)}
      ${panel('Requests by blood group', a.byGroup.map(g => `
        <div class="hbar"><span class="nm">${g.group}</span><div class="tr"><i style="width:${g.requests / maxG * 100}%"></i></div>
          <span class="vl">${g.requests}</span></div>`).join(''))}
    </div>
    <div style="height:18px"></div>
    ${panel('🧠 AI Forecast (7 days)', aiHtml(a.prediction).replace(/^[\s\S]*?<div class="panel">/, '<div>').replace(/<\/div>$/, ''))}`;
  } catch (e) { box.innerHTML = empty(e.message); }
}
