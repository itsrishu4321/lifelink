/* ===== LifeLink pages: Donor + Patient ===== */
const PAGES = window.PAGES || {};
const AFTER = window.AFTER || {};
window.PAGES = PAGES; window.AFTER = AFTER;

/* ================= DONOR ================= */
PAGES['d-profile'] = () => {
  const u = S.dash.profile, t = S.dash.trust, s = S.dash.stats;
  const bd = t ? t.breakdown : {};
  return `
  ${panel('My Profile', `
    <div class="prof">
      <div class="pic">${esc((u.name || '?')[0])}</div>
      <div style="flex:1;min-width:230px">
        <h2 style="letter-spacing:-.6px">${esc(u.name)}</h2>
        <p style="color:#7b8194;font-size:.87rem;margin-top:4px">${esc(u.email)} · ${esc(u.phone || 'no phone')}</p>
        <div class="btn-row" style="margin-top:12px">
          ${bgTag(u.bloodGroup)}
          <span class="tag ${u.verified ? 't-completed' : 't-pending'}">${u.verified ? '✔ VERIFIED DONOR' : '⏳ UNVERIFIED'}</span>
          <span class="tag ${u.availability === 'available' ? 't-completed' : 't-cancelled'}">${u.availability === 'available' ? '🟢 AVAILABLE' : '⏸ PAUSED'}</span>
        </div>
      </div>
      <button class="btn pri" onclick="editProfile()">✏️ Edit profile</button>
    </div>
    <div class="kv">
      <div class="k"><span>City</span><b>${esc(u.city || '—')}</b></div>
      <div class="k"><span>Member since</span><b>${fmtDay(u.createdAt)}</b></div>
      <div class="k"><span>Total donations</span><b>${s.totalDonations}</b></div>
      <div class="k"><span>Lives helped</span><b>${s.livesHelped}</b></div>
      <div class="k"><span>Nearby pending</span><b>${s.pendingNearby}</b></div>
      <div class="k"><span>Trust score</span><b>${t ? t.score + ' · ' + t.level : '—'}</b></div>
    </div>`,
    `<div class="online">Live</div>`)}

  ${panel('⭐ Reliability breakdown', t ? `
    <div class="trust-ring">
      <div class="ring" style="--p:${t.score}"><div class="inner">${t.score}<small>TRUST</small></div></div>
      <div class="bd-list">
        ${Object.entries(bd).map(([k, v]) => `<div class="bd"><span>${k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</span><b>${v}%</b></div>`).join('')}
      </div>
    </div>
    <p style="font-size:.78rem;color:#7b8194;margin-top:14px">Trust score is computed from response rate, show-up rate, punctuality, consistency, experience and verification. Patients see this score before accepting a donor.</p>` : empty('Not a donor'))}`;
};

PAGES['d-bloodgroup'] = () => {
  const u = S.dash.profile;
  const targets = { 'O-': 'O− O+ A− A+ B− B+ AB− AB+', 'O+': 'O+ A+ B+ AB+', 'A-': 'A− A+ AB− AB+', 'A+': 'A+ AB+', 'B-': 'B− B+ AB− AB+', 'B+': 'B+ AB+', 'AB-': 'AB− AB+', 'AB+': 'AB+ (universal recipient)' }[u.bloodGroup] || '—';
  const hist = S.dash.donationHistory;
  const last = hist.length ? hist[0].date : null;
  const nextEligible = last ? last + 56 * 864e5 : Date.now();
  const daysLeft = Math.max(0, Math.ceil((nextEligible - Date.now()) / 864e5));
  return `
  ${panel('My Blood Group', `
    <div style="text-align:center;padding:22px 0">
      <div style="font-size:4.4rem;font-weight:800;letter-spacing:-4px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">${esc(u.bloodGroup || 'NA')}</div>
      <p style="color:#7b8194;font-size:.9rem;margin-top:8px">You can donate to: <b style="color:#1c1f2b">${targets}</b></p>
      <p style="color:#7b8194;font-size:.82rem;margin-top:6px">Universal donors: O− · Universal recipients: AB+</p>
    </div>`)}
  <div class="grid2" style="margin-top:18px">
    ${panel('⏳ Donation eligibility', `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:2rem;font-weight:800;color:${daysLeft === 0 ? '#16a34a' : '#e63946'}">${daysLeft === 0 ? 'ELIGIBLE NOW' : daysLeft + ' days left'}</div>
        <p style="font-size:.83rem;color:#7b8194;margin-top:8px">Minimum gap between whole-blood donations is 56 days.</p>
        <p style="font-size:.8rem;margin-top:8px">Last donation: <b>${last ? fmtDay(last) : 'no donations yet'}</b></p>
      </div>`)}
    ${panel('🩸 Donation impact', `
      <div class="kv" style="grid-template-columns:1fr 1fr">
        <div class="k"><span>Total donations</span><b>${S.dash.stats.totalDonations}</b></div>
        <div class="k"><span>Lives helped</span><b>${S.dash.stats.livesHelped}</b></div>
        <div class="k"><span>Units given</span><b>${S.dash.donationHistory.reduce((a, d) => a + (d.units || 1), 0)}</b></div>
        <div class="k"><span>Certificates</span><b>${S.dash.donationHistory.length}</b></div>
      </div>
      <p style="font-size:.78rem;color:#7b8194;margin-top:12px">1 donation can save up to 3 lives (RBC, platelets, plasma).</p>`)}
  </div>`;
};

PAGES['d-availability'] = () => {
  const av = S.dash.availability;
  return panel('Availability Status', `
    <div class="avail-box ${av === 'available' ? '' : 'paused'}">
      <div class="avail-dot"></div>
      <div style="flex:1">
        <b style="font-size:1.05rem">${av === 'available' ? 'You are AVAILABLE for requests' : 'You are PAUSED — not receiving alerts'}</b>
        <p style="font-size:.83rem;color:#7b8194;margin-top:4px">${av === 'available' ? 'Nearby compatible blood requests will notify you in real time.' : 'Toggle on when you are ready to donate again.'}</p>
      </div>
      <button class="switch ${av === 'available' ? 'on' : ''}" onclick="toggleAvail(this)"></button>
    </div>
    <div class="stats" style="margin-top:18px">
      ${stat('Nearby pending', S.dash.stats.pendingNearby, 'compatible requests', 'blue')}
      ${stat('Response rate', S.trust ? S.trust.breakdown.responseRate + '%' : '—', 'accepted / responded')}
      ${stat('Show-up rate', S.trust ? S.trust.breakdown.showUpRate + '%' : '—', 'completed / accepted', 'ok')}
      ${stat('Trust score', S.trust ? S.trust.score : '—', S.trust ? S.trust.level : '', 'pur')}
    </div>`);
};
async function toggleAvail(btn) {
  try {
    const d = await api('/donor/availability', 'POST', { availability: S.dash.availability === 'available' ? 'paused' : 'available' });
    toast(d.availability === 'available' ? '🟢 You are now available' : '⏸ You are paused', 'ok');
    refreshDash();
  } catch (e) { toast(e.message, 'bad'); }
}

function reqCard(r, actions) {
  return `<div class="rcard ${r.urgency === 'critical' ? 'crit' : ''}">
    <div class="rh">${bgTag(r.bloodGroup)} <b>${esc(r.hospitalName)}</b> <span class="id">#${esc(r.id)}</span> ${urgTag(r.urgency)} ${stTag(r.status)}
      ${r.myResponse ? `<span class="tag ${r.myResponse === 'accepted' ? 't-accepted' : 't-declined'}">You: ${r.myResponse}</span>` : ''}
      ${r.alreadyDonated ? '<span class="tag t-completed">✅ Donated</span>' : ''}</div>
    <div class="rmeta">
      <span>🧍 Patient: <b>${esc(r.patientName)}</b></span>
      <span>🔢 Units: <b>${r.units}</b></span>
      <span>📍 ${esc(r.city)}</span>
      <span>🕐 ${ago(r.createdAt)}</span>
      ${r.condition ? `<span>🩺 ${esc(r.condition)}</span>` : ''}
    </div>
    <div class="ract">${actions || ''}</div>
  </div>`;
}

PAGES['d-nearby'] = () => {
  const list = S.dash.nearbyRequests;
  const emg = S.dash.emergency || [];
  return `
  ${emg.length ? panel('🚨 Active emergencies in your area', emg.map(e =>
    `<div class="rcard crit"><div class="rh">${bgTag(e.bloodGroup)} <b>${esc(e.hospitalName || e.city)}</b> ${urgTag('critical')} <span class="tag t-${e.status}">${e.status.toUpperCase()}</span></div>
     <div class="rmeta"><span>🔢 ${e.units} unit(s)</span><span>📍 ${esc(e.city)}</span><span>🕐 ${ago(e.at)}</span></div>
     <div class="ract">${e.accepted && e.accepted.includes(S.user.id) ? '<span class="tag t-accepted">✅ You accepted</span>' : `<button class="btn pri sm" onclick="acceptEmg('${e.id}')">I'll help 🚨</button>`}</div></div>`).join('')) : ''}
  ${panel('📍 Nearby Blood Requests', list.length ? list.map(r => reqCard(r,
    (!r.myResponse && !r.alreadyDonated) ?
      `<button class="btn ok sm" onclick="respond('${r.id}','accepted')">✅ Accept</button>
       <button class="btn no sm" onclick="respond('${r.id}','declined')">✖ Decline</button>` :
      (r.myResponse === 'accepted' && !r.alreadyDonated) ? `<button class="btn pri sm" onclick="confirmDonate('${r.id}')">🩸 Confirm I donated</button>` :
      `<button class="btn sec sm" onclick="viewRequest('${r.id}')">View details</button>`
  )).join('') : empty('No compatible requests right now — we will notify you the moment one appears.'))}`;
};

PAGES['d-respond'] = () => {
  const list = S.dash.nearbyRequests;
  const pending = list.filter(r => !r.myResponse && !r.alreadyDonated);
  const accepted = list.filter(r => r.myResponse === 'accepted');
  const declined = list.filter(r => r.myResponse === 'declined');
  return `
  ${panel('✅ Accept / Decline Request', `
    <div class="stats">
      ${stat('Awaiting response', pending.length, 'needs your action', 'warn')}
      ${stat('Accepted', accepted.length, 'you committed', 'ok')}
      ${stat('Declined', declined.length, 'passed')}
    </div>`, '')}
  <div style="height:18px"></div>
  ${panel('⏳ Awaiting your response', pending.length ? pending.map(r => reqCard(r,
    `<button class="btn ok sm" onclick="respond('${r.id}','accepted')">✅ Accept</button>
     <button class="btn no sm" onclick="respond('${r.id}','declined')">✖ Decline</button>`)).join('') : empty('Nothing pending — great job!'))}
  <div style="height:18px"></div>
  ${panel('🤝 Accepted by you', accepted.length ? accepted.map(r => reqCard(r,
    r.alreadyDonated ? '<span class="tag t-completed">✅ Donation confirmed</span>' :
    `<button class="btn pri sm" onclick="confirmDonate('${r.id}')">🩸 Confirm I donated</button>
     <button class="btn sec sm" onclick="respond('${r.id}','declined')">Change mind</button>`)).join('') : empty('No accepted requests yet.'))}
  <div style="height:18px"></div>
  ${panel('✖ Declined', declined.length ? declined.map(r => reqCard(r, `<button class="btn sec sm" onclick="respond('${r.id}','accepted')">Accept now</button>`)).join('') : empty('Nothing declined.'))}`;
};

async function respond(id, action) {
  try {
    const d = await api('/donor/respond', 'POST', { requestId: id, action });
    S.trust = d.trust;
    toast(action === 'accepted' ? '✅ Request accepted — the requester has been notified' : 'Request declined', 'ok');
    refreshDash();
  } catch (e) { toast(e.message, 'bad'); }
}
async function confirmDonate(id) {
  try {
    const d = await api('/donor/donate', 'POST', { requestId: id });
    S.trust = d.trust;
    openG(`<h2 class="mh">🙏 Donation recorded</h2>
      <p class="msub">Thank you for saving a life. Your certificate:</p>
      <div style="border:2px dashed #ffb3ba;border-radius:16px;padding:26px;text-align:center;background:#fff8f8">
        <div style="font-size:2.4rem">🩸</div>
        <h3 style="letter-spacing:-.5px;margin:8px 0">Certificate of Appreciation</h3>
        <p style="font-size:.9rem;color:#555">${esc(S.user.name)} · ${esc(S.user.bloodGroup)}</p>
        <p style="font-size:.82rem;color:#7b8194;margin-top:6px">Certificate ID: <b>${esc(d.donation.certificateId)}</b></p>
        <p style="font-size:.78rem;color:#7b8194;margin-top:10px">New trust score: <b style="color:#e63946">${d.trust.score} · ${d.trust.level}</b></p>
      </div>
      <button class="btn pri full" style="margin-top:16px;width:100%" onclick="closeG();refreshDash()">Done</button>`);
    loadNotifs();
  } catch (e) { toast(e.message, 'bad'); }
}
async function acceptEmg(id) {
  try {
    await api('/emergency/' + id + '/accept', 'POST', {});
    toast('🚨 You are marked as responding — requester notified', 'ok');
    refreshDash();
  } catch (e) { toast(e.message, 'bad'); }
}

PAGES['d-history'] = () => {
  const h = S.dash.donationHistory;
  return panel('📜 Donation History', h.length ? `
    <table><thead><tr><th>Certificate</th><th>Date</th><th>Group</th><th>Units</th><th>Hospital</th><th>City</th><th>Verified</th></tr></thead>
    <tbody>${h.map(d => `<tr>
      <td><code>${esc(d.certificateId)}</code></td><td>${fmtDay(d.date)}</td><td>${bgTag(d.bloodGroup)}</td>
      <td>${d.units}</td><td>${esc(d.hospitalName)}</td><td>${esc(d.city)}</td>
      <td>${d.verified ? '<span class="tag t-completed">✔</span>' : '<span class="tag t-pending">⏳</span>'}</td></tr>`).join('')}</tbody></table>`
    : empty('No donations yet. Accept a nearby request to start your history.'));
};

PAGES['d-notifs'] = () => notifPage();
PAGES['p-notifs'] = () => notifPage();
PAGES['f-notifs'] = () => notifPage();
PAGES['h-notifs'] = () => notifPage();
PAGES['ha-notifs'] = () => notifPage();
PAGES['b-notifs'] = () => notifPage();
function notifPage() {
  return panel('🔔 Notifications', S.notifs.length ? S.notifs.map(n =>
    `<div class="n" style="padding:13px 15px;border-radius:13px;margin-bottom:9px;background:${n.read ? '#f8f9fd' : '#fff1f2'};border:1px solid ${n.read ? 'transparent' : '#ffd9dd'}">
      <b style="font-size:.9rem">${esc(n.title)}</b>
      <span style="display:block;font-size:.84rem;color:#555;margin-top:3px">${esc(n.body)}</span>
      <small style="color:#a5aab8;font-size:.72rem">${ago(n.at)}</small></div>`).join('') : empty('No notifications yet.'));
}

PAGES['d-location'] = () => panel('🧭 Update Location', `
  <p style="font-size:.87rem;color:#7b8194;margin-bottom:16px">Your location decides which requests you see. Set your city and search radius.</p>
  <div class="row3">
    <label>City<input id="locCity" value="${esc(S.user.city || '')}" placeholder="Delhi"></label>
    <label>Latitude<input id="locLat" type="number" step="any" value="${(S.user.location && S.user.location.lat) || 28.6139}"></label>
    <label>Longitude<input id="locLng" type="number" step="any" value="${(S.user.location && S.user.location.lng) || 77.209}"></label>
  </div>
  <label>Search radius (km)<input id="locRad" type="number" value="${(S.user.location && S.user.location.radius) || 25}" min="1" max="200"></label>
  <div class="btn-row">
    <button class="btn pri" onclick="saveLocation()">💾 Save location</button>
    <button class="btn sec" onclick="useGps()">📍 Use my GPS</button>
  </div>
  <p class="err" id="locErr"></p>`);
async function saveLocation() {
  try {
    await api('/donor/location', 'POST', { city: $('locCity').value, lat: $('locLat').value, lng: $('locLng').value, radius: $('locRad').value });
    toast('Location updated', 'ok'); refreshDash();
  } catch (e) { $('locErr').textContent = e.message; }
}
function useGps() {
  if (!navigator.geolocation) return toast('GPS not supported', 'bad');
  navigator.geolocation.getCurrentPosition(
    p => { $('locLat').value = p.coords.latitude.toFixed(4); $('locLng').value = p.coords.longitude.toFixed(4); toast('GPS captured — press Save', 'ok'); },
    () => toast('Location permission denied', 'bad'));
}

PAGES['d-privacy'] = () => {
  const p = S.user.privacy || {};
  const row = (k, label, desc) => `<div class="bd" style="align-items:center;padding:14px 16px">
    <div><b style="font-size:.9rem">${label}</b><span style="display:block;font-size:.78rem;color:#7b8194;margin-top:3px">${desc}</span></div>
    <button class="switch ${p[k] ? 'on' : ''}" onclick="togglePrivacy('${k}',this)"></button></div>`;
  return panel('🔒 Privacy Settings', `
    <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">You are in full control. Your phone number is <b>never public</b> unless you enable it.</p>
    ${row('showPhone', 'Show my phone number', 'Recipients can call you directly (revealed only after they open your response)')}
    ${row('showProfile', 'Show my profile to requesters', 'Name, blood group & trust score appear in donor responses')}
    ${row('showHistory', 'Show my donation history', 'Displays verified past donations on your response card')}
    ${row('discoverable', 'Discoverable in search', 'Appear when hospitals search for donors of your group')}`,
    `<span class="tag t-verified">GDPR-style controls</span>`);
};
async function togglePrivacy(k, btn) {
  const next = !(S.user.privacy && S.user.privacy[k]);
  try {
    await api('/donor/privacy', 'POST', { [k]: next });
    S.user.privacy = S.user.privacy || {}; S.user.privacy[k] = next;
    btn.classList.toggle('on', next);
    toast('Privacy updated', 'ok');
  } catch (e) { toast(e.message, 'bad'); }
}

/* ---- Medical & Eligibility (donor verification) ---- */
const MED_Q = [
  ['well', 'Are you feeling well today?', 'No fever, cough, cold or sore throat right now'],
  ['recentIllness', 'Any fever / illness in the last 14 days?', 'Flu, dengue, COVID or any infection'],
  ['bodyMod', 'Tattoo, piercing, surgery or blood transfusion in the last 6 months?', 'Skin procedures or transfusion raise screening risk'],
  ['chronic', 'Any chronic disease? (diabetes, BP, heart, epilepsy, kidney)', 'Declare honestly — needs physician review'],
  ['medication', 'Are you on any medication? (steroids, blood thinners, hepatitis treatment)', 'Some medicines defer donation'],
  ['risk', 'High-risk travel or exposure to infectious disease?', 'Endemic areas or a known contact'],
  ['infectious', 'Blood screening test result (HIV, HBsAg, HCV, VDRL)', 'Full screening preferred — carries the most weight']
];
const MED_RES = ['Negative', 'Pending', 'Positive', 'Not tested'];
const MED_TESTS = ['Full screening (HIV, HBsAg, HCV, VDRL)', 'HIV only', 'HBsAg only', 'HCV only', 'VDRL only', 'Not tested yet'];

/* client-side mirror of the server eligibility engine (live preview) */
function medFlags(h, w, hb, lastDon, a) {
  const f = [];
  if (!(h >= 140)) f.push('Height ' + (h || '?') + ' cm — minimum 140 cm required');
  if (!(w >= 50)) f.push('Weight ' + (w || '?') + ' kg — minimum 50 kg required');
  if (!(hb >= 12.5)) f.push('Haemoglobin ' + (hb || '?') + ' g/dL — minimum 12.5 g/dL required');
  if (lastDon) {
    const days = Math.floor((Date.now() - new Date(lastDon + 'T00:00:00').getTime()) / 864e5);
    if (!isNaN(days) && days >= 0 && days < 84) f.push('Last donation ' + days + ' day(s) ago — 84-day gap required');
  }
  if (a.well === 'no') f.push('Not feeling well today (fever / cold / sore throat)');
  if (a.recentIllness === 'yes') f.push('Illness reported in the last 14 days');
  if (a.bodyMod === 'yes') f.push('Tattoo / piercing / surgery / transfusion in last 6 months');
  if (a.chronic === 'yes') f.push('Chronic condition declared — physician review needed');
  if (a.medication === 'yes') f.push('Current medication declared — physician review needed');
  if (a.risk === 'yes') f.push('High-risk travel or exposure declared');
  if (a.infectious !== 'Negative') f.push('Infectious screening not cleared (' + (a.infectious || 'no result') + ')');
  return f;
}

PAGES['d-medical'] = () => {
  const m = (S.dash.profile || {}).medical;
  const today = new Date().toISOString().slice(0, 10);
  const statusTag = !m ? '<span class="tag t-pending">NOT SUBMITTED</span>'
    : m.status === 'approved' ? '<span class="tag t-completed">✔ APPROVED</span>'
    : m.status === 'rejected' ? '<span class="tag t-cancelled">✘ DEFERRED</span>'
    : '<span class="tag t-pending">⏳ UNDER REVIEW</span>';
  const verdictTag = m ? (m.verdict === 'eligible'
    ? '<span class="tag t-completed">AUTO: ELIGIBLE</span>'
    : `<span class="tag t-pending">AUTO: DEFERRED · ${m.flags.length} flag(s)</span>`) : '';

  const statusPanel = m ? panel('🩺 Verification status', `
    <div class="btn-row" style="margin-bottom:14px">${statusTag} ${verdictTag}
      <span class="tag ${S.user.verified ? 't-completed' : 't-cancelled'}">${S.user.verified ? '✔ VERIFIED DONOR' : '✘ UNVERIFIED'}</span></div>
    <div class="kv" style="margin-top:0">
      <div class="k"><span>Height</span><b>${m.height} cm</b></div>
      <div class="k"><span>Weight</span><b>${m.weight} kg</b></div>
      <div class="k"><span>Haemoglobin</span><b>${m.hb} g/dL</b></div>
      <div class="k"><span>Last donation</span><b>${m.lastDonation ? fmtDay(new Date(m.lastDonation + 'T00:00:00').getTime()) : 'Never'}</b></div>
      <div class="k"><span>Screening test</span><b>${esc((m.test && m.test.name) || '—')}</b></div>
      <div class="k"><span>Result</span><b>${esc((m.test && m.test.result) || '—')}</b></div>
      <div class="k"><span>Submitted</span><b>${fmtDate(m.submittedAt)}</b></div>
      <div class="k"><span>Reviewed by</span><b>${m.reviewedBy ? esc(m.reviewedBy) + '<br>' + fmtDay(m.reviewedAt) : '—'}</b></div>
    </div>
    ${m.flags && m.flags.length ? `<div class="verdict bad" style="margin-top:14px"><b>⚠️ Auto-check flagged ${m.flags.length} issue(s)</b><ul>${m.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>`
      : `<div class="verdict ok" style="margin-top:14px"><b>✅ Auto-check passed — all donor criteria met</b>No eligibility issues found in your submission.</div>`}
    ${m.reviewNote ? `<div class="bd" style="margin-top:12px;align-items:flex-start"><span>Reviewer note</span><b style="text-align:right;max-width:60%">${esc(m.reviewNote)}</b></div>` : ''}
    <p style="font-size:.78rem;color:#7b8194;margin-top:12px">Verification contributes <b>10% of your trust score</b> (45% → 100% when verified). Patients and hospitals see the ✔ verified badge on your donor card.</p>`,
    `<span class="tag t-grp">Form #MED-${String(m.submittedAt).slice(-6)}</span>`)
    : panel('🩺 Medical & Eligibility Verification', `
    <div style="text-align:center;padding:16px 0 8px">
      <div style="font-size:3rem">🩺</div>
      <h3 style="letter-spacing:-.5px;margin:8px 0">Complete your medical screening</h3>
      <p style="font-size:.87rem;color:#7b8194;max-width:560px;margin:0 auto">Fill your vitals, screening test and the health questionnaire below. LifeLink runs an <b>instant auto-eligibility check</b>, then a Super Admin reviews & approves — after which you become a <b>✔ verified donor</b> with a trust-score bonus.</p>
    </div>`);

  const qRow = ([k, q, hint]) => {
    const cur = m && m.answers ? (m.answers[k] || '') : '';
    const control = k === 'infectious'
      ? `<select id="q_infectious">${MED_RES.map(r => `<option ${cur === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`
      : `<select id="q_${k}"><option value="" ${!cur ? 'selected' : ''}>— select —</option><option value="no" ${cur === 'no' ? 'selected' : ''}>No</option><option value="yes" ${cur === 'yes' ? 'selected' : ''}>Yes</option></select>`;
    return `<div class="qrow"><span class="qt">${q}${hint ? `<small>${hint}</small>` : ''}</span>${control}</div>`;
  };

  const form = panel(m ? '✏️ Update medical form' : '📝 Medical & eligibility form', `
    <p style="font-size:.85rem;color:#7b8194;margin-bottom:14px">All fields are required. Answers are reviewed by the Super Admin — declare everything honestly; flagged submissions still go through for physician review.</p>
    <div class="qrow" style="background:#fff5f5;border:1.5px solid #ffd3d6">
      <span class="qt"><b>1 · Vitals</b><small>Minimum: 140 cm height · 50 kg weight · 12.5 g/dL haemoglobin</small></span>
    </div>
    <div class="row3">
      <label>Height (cm)<input id="mdHeight" type="number" min="100" max="250" step="0.1" value="${m ? m.height : ''}" placeholder="e.g. 172" required></label>
      <label>Weight (kg)<input id="mdWeight" type="number" min="20" max="250" step="0.1" value="${m ? m.weight : ''}" placeholder="e.g. 65" required></label>
      <label>Haemoglobin (g/dL)<input id="mdHb" type="number" min="5" max="25" step="0.1" value="${m ? m.hb : ''}" placeholder="e.g. 14.5" required></label>
    </div>
    <div class="row3">
      <label>Last whole-blood donation<input id="mdLast" type="date" max="${today}" value="${m && m.lastDonation ? m.lastDonation : ''}"></label>
      <label>Screening test date<input id="mdTestDate" type="date" max="${today}" value="${m && m.test && m.test.date ? m.test.date : ''}"></label>
      <label>Screening result<select id="mdTestResult">${MED_RES.map(r => `<option ${m && m.test && m.test.result === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
    </div>
    <label>Screening test done<select id="mdTestName">${MED_TESTS.map(t => `<option ${m && m.test && m.test.name === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>

    <div class="qrow" style="background:#fff5f5;border:1.5px solid #ffd3d6;margin-top:18px">
      <span class="qt"><b>2 · Health screening questionnaire</b><small>Standard blood-donor eligibility questions</small></span>
    </div>
    ${MED_Q.map(qRow).join('')}

    <div id="medVerdict" class="verdict">⏳ <b>Auto-check</b>Fill every field to see your instant eligibility verdict.</div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn pri" type="submit">📨 Submit for verification</button>
      <button class="btn sec" type="button" onclick="medCheck()">🔍 Re-run auto-check</button>
    </div>
    <p class="err" id="medErr"></p>`, `<span class="tag t-grp">Auto + admin review</span>`);

  return statusPanel + `<div style="height:18px"></div><form onsubmit="return submitMedical(event)" oninput="medCheck()" onchange="medCheck()">${form}</form>`;
};
AFTER['d-medical'] = medCheck;

function medCheck() {
  const box = $('medVerdict');
  if (!box) return;
  const h = +($('mdHeight') || {}).value, w = +($('mdWeight') || {}).value, hb = +($('mdHb') || {}).value;
  const lastDon = ($('mdLast') || {}).value || '';
  const answers = {};
  MED_Q.forEach(([k]) => { const el = $('q_' + k); if (el) answers[k] = el.value; });
  const incomplete = !$('mdHeight').value || !$('mdWeight').value || !$('mdHb').value || MED_Q.some(([k]) => !answers[k]);
  if (incomplete) {
    box.className = 'verdict';
    box.innerHTML = '<b>⏳ Auto-check pending</b>Fill all vitals and answer every screening question to see the instant verdict.';
    return;
  }
  const f = medFlags(h, w, hb, lastDon, answers);
  if (!f.length) {
    box.className = 'verdict ok';
    box.innerHTML = '<b>✅ AUTO VERDICT: ELIGIBLE</b>All donor criteria met — submit for Super Admin approval.';
  } else {
    box.className = 'verdict bad';
    box.innerHTML = `<b>⚠️ AUTO VERDICT: DEFERRED — ${f.length} issue(s)</b><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul><span style="font-size:.78rem">You can still submit — flagged forms go to the admin for physician review.</span>`;
  }
}

async function submitMedical(e) {
  e.preventDefault();
  const answers = {};
  MED_Q.forEach(([k]) => { const el = $('q_' + k); if (el) answers[k] = el.value; });
  const missing = MED_Q.filter(([k]) => !answers[k]);
  if (missing.length) { $('medErr').textContent = 'Please answer all ' + MED_Q.length + ' screening questions'; return false; }
  if (!$('mdHeight').value || !$('mdWeight').value || !$('mdHb').value) { $('medErr').textContent = 'Height, weight and haemoglobin are required'; return false; }
  try {
    const d = await api('/donor/medical', 'POST', {
      height: +$('mdHeight').value, weight: +$('mdWeight').value, hb: +$('mdHb').value,
      lastDonation: $('mdLast').value || null,
      test: { name: $('mdTestName').value, date: $('mdTestDate').value || '', result: $('mdTestResult').value },
      answers
    });
    if (d.trust) S.trust = d.trust;
    toast(d.medical.verdict === 'eligible'
      ? '✅ Submitted — auto-eligible, now awaiting admin approval'
      : `⚠️ Submitted with ${d.medical.flags.length} flag(s) — admin will review`, 'ok');
    await refreshDash();
  } catch (err) { $('medErr').textContent = err.message; }
  return false;
}

PAGES['d-trust'] = () => {
  const t = S.trust;
  if (!t) return empty('Trust score is only for donors.');
  const tips = [
    ['Respond fast', 'Accept/decline every request you receive (+' + Math.min(10, 100 - t.breakdown.responseRate) + ' potential)'],
    ['Never no-show', 'If you accept, go — missed commitments are the biggest penalty'],
    ['Stay verified', 'Complete phone verification for the verification bonus'],
    ['Donate regularly', 'Experience grows until 6+ completed donations'],
    ['Be punctual', 'Reach the hospital within the promised window']
  ];
  return `
  ${panel('⭐ Your Trust Score', `
    <div class="trust-ring">
      <div class="ring" style="--p:${t.score}"><div class="inner">${t.score}<small>${t.level.toUpperCase()}</small></div></div>
      <div class="bd-list">${Object.entries(t.breakdown).map(([k, v]) =>
        `<div class="bd"><span>${k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</span><b>${v}%</b></div>`).join('')}</div>
    </div>`, `<span class="tag t-grp">${t.level}</span>`)}
  <div style="height:18px"></div>
  ${panel('🚀 How to improve', `<div class="grid2">${tips.map(([a, b]) =>
    `<div class="k" style="background:#f8f9fd;border-radius:13px;padding:14px 16px"><b style="font-size:.9rem">${a}</b><p style="font-size:.8rem;color:#7b8194;margin-top:4px">${b}</p></div>`).join('')}</div>`)}
  <div style="height:18px"></div>
  ${panel('🏆 Top donors nearby', S.dash && S.dash.trustBoard ? '' : '')}`;
};

PAGES['d-ai'] = () => aiPage();
PAGES['ha-ai'] = () => aiPage();
PAGES['b-ai'] = () => aiPage();
function aiPage() {
  return `<div id="aiBox">${empty('Loading AI forecast…')}</div>`;
}
AFTER['d-ai'] = loadAi; AFTER['ha-ai'] = loadAi; AFTER['b-ai'] = loadAi;
async function loadAi() {
  try {
    const p = await api('/predict');
    if ($('aiBox')) $('aiBox').innerHTML = aiHtml(p);
  } catch (e) { if ($('aiBox')) $('aiBox').innerHTML = empty(e.message); }
}
function aiHtml(p) {
  const riskTag = r => `<span class="tag ${r === 'critical' ? 't-critical' : r === 'high' ? 't-pending' : r === 'watch' ? 't-verified' : 't-completed'}">${r.toUpperCase()}</span>`;
  const max = Math.max(...p.forecast.map(f => Math.max(f.predicted7d, f.currentStock)), 1);
  return `
  ${panel('🧠 AI Demand Prediction — next ' + p.horizon, `
    <div class="stats" style="margin-bottom:6px">
      ${stat('Overall risk', p.overallRisk.toUpperCase(), p.overallRisk === 'stable' ? 'network healthy' : 'action needed', p.overallRisk === 'stable' ? 'ok' : 'warn')}
      ${stat('Hotspot', p.hotspot ? p.hotspot.city : '—', p.hotspot ? p.hotspot.requests30d + ' requests (30d)' : '', 'blue')}
      ${stat('Groups tracked', p.forecast.length, 'all blood groups', 'pur')}
    </div>
    <div class="legend" style="margin-top:14px"><span><i style="background:#f59e0b"></i>Predicted demand (7d)</span><span><i style="background:#16a34a"></i>Current stock</span></div>
    ${p.forecast.map(f => `
      <div class="fc">
        <span class="g">${bgTag(f.bloodGroup)}</span>
        <div class="meters">
          <div class="m dem"><i style="width:${Math.round(f.predicted7d / max * 100)}%"></i></div>
          <div class="m stk"><i style="width:${Math.round(f.currentStock / max * 100)}%"></i></div>
        </div>
        <span class="risk">${riskTag(f.risk)}</span>
        <div class="act">🧠 ${esc(f.action)} · gap ${f.gap} unit(s) · ${f.recent30d} req/30d${f.criticalCount ? ' · ' + f.criticalCount + ' critical' : ''}</div>
      </div>`).join('')}`,
    `<span class="tag t-grp">Auto-generated ${fmtDay(p.generatedAt)}</span>`)}
  <div style="height:18px"></div>
  ${panel('How the model works', `<p style="font-size:.85rem;color:#7b8194;line-height:1.7">
    The engine tracks per-group request velocity over 30 days, weights the last 7 days (momentum), compares against live blood-bank stock across verified banks, and classifies shortage risk as
    <b>critical / high / watch / safe</b> — then recommends the exact operational action (emergency appeal, targeted push, camp scheduling or steady cadence). Hotspot detection surfaces the city with the highest request concentration.</p>`)}`;
}

/* ================= PATIENT ================= */
function hospitalPicker(selectedId) {
  return `<div id="hospList">${empty('Loading hospitals…')}</div>
    <input type="hidden" id="reqHospId" value="${selectedId || ''}">`;
}
async function loadHospitals(sel) {
  try {
    const hs = await api('/hospitals');
    const verified = hs.filter(h => h.verified);
    if (!$('hospList')) return;
    $('hospList').innerHTML = verified.map(h => `
      <label style="display:flex;gap:12px;align-items:center;background:${sel === h.id ? '#fff1f2' : '#f8f9fd'};border:1.5px solid ${sel === h.id ? '#ffb3ba' : 'transparent'};border-radius:13px;padding:13px 15px;margin-bottom:9px;cursor:pointer">
        <input type="radio" name="hosp" value="${h.id}" ${sel === h.id ? 'checked' : ''} style="width:auto;margin:0" onchange="pickHosp(this)">
        <div style="flex:1"><b style="font-size:.92rem">${esc(h.name)}</b>
          <span style="display:block;font-size:.78rem;color:#7b8194">${esc(h.address)} · ${esc(h.city)}</span></div>
        <span class="tag t-completed">✔ VERIFIED</span></label>`).join('') || empty('No verified hospitals yet');
  } catch (e) { if ($('hospList')) $('hospList').innerHTML = empty(e.message); }
}
function pickHosp(inp) {
  document.querySelectorAll('#hospList label').forEach(l => { l.style.background = '#f8f9fd'; l.style.borderColor = 'transparent'; });
  const lb = inp.closest('label'); lb.style.background = '#fff1f2'; lb.style.borderColor = '#ffb3ba';
  $('reqHospId').value = inp.value;
}

const DRAFT = { bloodGroup: '', units: 1, urgency: 'normal', hospitalId: '', patientName: '', patientAge: '', gender: 'Male', condition: '', contactPhone: '' };

PAGES['p-request'] = () => `
  ${panel('🩸 Request Blood', `
    <p style="font-size:.9rem;color:#7b8194;margin-bottom:16px">New request? Start the 4-step flow — or track your open requests below.</p>
    <div class="btn-row">
      <button class="btn pri" onclick="go('p-group')">Start new request →</button>
      <button class="btn sec" onclick="go('p-status')">Track my requests</button>
    </div>`, `<span class="online">Live matching</span>`)}
  <div style="height:18px"></div>
  ${activeRequestsHtml('Your active requests')}`;

function activeRequestsHtml(title) {
  const list = (S.dash.requests || []).filter(r => !['completed', 'cancelled'].includes(r.status));
  return panel(title + ` <span class="tag t-pending">${list.length} active</span>`, list.length ? list.map(r => reqCard(r,
    `<button class="btn sec sm" onclick="viewRequest('${r.id}')">View</button>
     <button class="btn no sm" onclick="cancelRequest('${r.id}')">Cancel</button>`)).join('') : empty('No active requests.'));
}

PAGES['p-group'] = () => {
  const groups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  return panel('🅰️ Select Blood Group', `
    <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">Select the required blood group — compatible donors for that group will be alerted.</p>
    <div class="stock-grid">${groups.map(g => `
      <button class="stock ${DRAFT.bloodGroup === g ? '' : ''}" style="${DRAFT.bloodGroup === g ? 'border-color:#e63946;background:#fff5f5' : ''};cursor:pointer" onclick="pickGroup('${g}',this)">
        <div class="g" style="color:${DRAFT.bloodGroup === g ? '#e63946' : ''}">${g}</div>
        <div class="u" style="font-size:.95rem">${DRAFT.bloodGroup === g ? '✔ SELECTED' : 'select'}</div>
      </button>`).join('')}</div>
    <div class="btn-row" style="margin-top:18px">
      <button class="btn pri" ${DRAFT.bloodGroup ? '' : 'disabled'} onclick="go('p-units')">Next: Required Units →</button>
    </div>`);
};
function pickGroup(g, el) {
  DRAFT.bloodGroup = g;
  document.querySelectorAll('.stock-grid .stock').forEach(s => { s.style.borderColor = ''; s.style.background = ''; s.querySelector('.u').style.color = ''; s.querySelector('.u').textContent = 'select'; });
  el.style.borderColor = '#e63946'; el.style.background = '#fff5f5';
  el.querySelector('.u').style.color = '#e63946'; el.querySelector('.u').textContent = '✔ SELECTED';
  document.querySelector('.btn.pri').disabled = false;
}

PAGES['p-units'] = () => `
  ${panel('🔢 Required Units', `
    <p style="font-size:.87rem;color:#7b8194;margin-bottom:16px">How many units of <b>${DRAFT.bloodGroup || '—'}</b> are needed?</p>
    <div class="row2">
      <label>Units<input type="number" id="reqUnits" min="1" max="10" value="${DRAFT.units}" oninput="DRAFT.units=this.value"></label>
      <label>Urgency<select id="reqUrg" onchange="DRAFT.urgency=this.value">
        <option value="normal" ${DRAFT.urgency === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="critical" ${DRAFT.urgency === 'critical' ? 'selected' : ''}>🚨 Critical (emergency)</option></select></label>
    </div>
    <div class="btn-row">
      <button class="btn pri" onclick="go('p-hospital')">Next: Hospital Details →</button>
      <button class="btn sec" onclick="go('p-group')">← Back</button>
    </div>`)}`;

PAGES['p-hospital'] = () => `
  ${panel('🏥 Hospital Details', `
    <p style="font-size:.87rem;color:#7b8194;margin-bottom:14px">Choose where the blood is needed. Only verified hospitals are listed.</p>
    ${hospitalPicker(DRAFT.hospitalId)}
    <label style="margin-top:12px">Or enter address manually<input id="reqAddr" placeholder="Hospital / address" value="${esc(DRAFT.address || '')}"></label>
    <div class="btn-row">
      <button class="btn pri" onclick="go('p-patient')">Next: Patient Details →</button>
      <button class="btn sec" onclick="go('p-units')">← Back</button>
    </div>`)}`;
AFTER['p-hospital'] = () => loadHospitals(DRAFT.hospitalId);

PAGES['p-patient'] = () => `
  ${panel('🧍 Patient Details', `
    <div class="row2">
      <label>Patient name<input id="patName" value="${esc(DRAFT.patientName)}" required></label>
      <label>Age<input id="patAge" type="number" value="${esc(DRAFT.patientAge)}"></label>
    </div>
    <div class="row2">
      <label>Gender<select id="patGen"><option>Male</option><option ${DRAFT.gender === 'Female' ? 'selected' : ''}>Female</option><option>Other</option></select></label>
      <label>Contact phone<input id="patPhone" value="${esc(DRAFT.contactPhone || S.user.phone || '')}"></label>
    </div>
    <label>Condition / reason<input id="patCond" placeholder="e.g. Surgery – pre-op transfusion" value="${esc(DRAFT.condition)}"></label>
    <div class="btn-row">
      <button class="btn pri" onclick="submitRequest(false)">✅ Submit request</button>
      <button class="btn no" onclick="submitRequest(true)">🚨 Submit + Emergency broadcast</button>
      <button class="btn sec" onclick="go('p-hospital')">← Back</button>
    </div>
    <p class="err" id="reqErr"></p>`)}`;

async function submitRequest(emergency) {
  const name = $('patName').value.trim();
  if (!name) { $('reqErr').textContent = 'Patient name is required'; return; }
  if (!DRAFT.bloodGroup) { $('reqErr').textContent = 'Select a blood group first'; return; }
  try {
    const d = await api('/requests', 'POST', {
      bloodGroup: DRAFT.bloodGroup, units: +DRAFT.units || 1, urgency: DRAFT.urgency,
      hospitalId: $('reqHospId') ? $('reqHospId').value : '', address: $('reqAddr') ? $('reqAddr').value : '',
      patientName: name, patientAge: $('patAge').value, gender: $('patGen').value,
      contactPhone: $('patPhone').value, condition: $('patCond').value, emergency
    });
    toast(emergency ? '🚨 Request created + emergency broadcast sent!' : '✅ Request submitted — donors are being alerted', 'ok');
    DRAFT.bloodGroup = ''; DRAFT.units = 1; DRAFT.hospitalId = '';
    await refreshDash();
    go('p-status');
    viewRequest(d.request.id);
  } catch (e) { $('reqErr').textContent = e.message; }
}

PAGES['p-status'] = () => activeRequestsHtml('Request Status') + `
  <div style="height:18px"></div>
  ${panel('📊 Request overview', `
    <div class="stats">
      ${stat('Total requests', S.dash.stats.total)}
      ${stat('Active', S.dash.stats.active, 'in progress', 'warn')}
      ${stat('Completed', S.dash.stats.completed, 'blood delivered', 'ok')}
    </div>`)}`;

PAGES['p-response'] = () => donorResponsePage();
PAGES['f-response'] = () => donorResponsePage();
function donorResponsePage() {
  const list = (S.dash.requests || []).filter(r => (r.responses || []).length);
  if (!list.length) return panel('🤝 Donor Response Status', empty('No donor responses yet — alerts go out to compatible donors instantly.'));
  return panel('🤝 Donor Response Status', list.map(r => `
    <div class="rcard ${r.urgency === 'critical' ? 'crit' : ''}">
      <div class="rh">${bgTag(r.bloodGroup)} <b>#${esc(r.id)}</b> ${stTag(r.status)} <span class="id">${esc(r.hospitalName)}</span></div>
      <div class="rmeta">
        <span>👤 Accepted: <b style="color:#16a34a">${r.responses.filter(x => x.status === 'accepted').length}</b></span>
        <span>✖ Declined: <b>${r.responses.filter(x => x.status === 'declined').length}</b></span>
        <span>🕐 ${ago(r.createdAt)}</span>
      </div>
      <button class="btn sec sm" onclick="viewRequest('${r.id}')">View donor cards (with trust scores)</button>
    </div>`).join(''));
}

PAGES['p-history'] = () => requestHistoryPage();
PAGES['f-history'] = () => requestHistoryPage();
function requestHistoryPage() {
  const list = S.dash.requests || [];
  return panel('🗂️ Request History', list.length ? `
    <table><thead><tr><th>ID</th><th>Group</th><th>Units</th><th>Patient</th><th>Hospital</th><th>Created</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.map(r => `<tr>
      <td><code>${esc(r.id)}</code></td><td>${bgTag(r.bloodGroup)}</td><td>${r.units}</td>
      <td>${esc(r.patientName)}</td><td>${esc(r.hospitalName)}</td><td>${fmtDay(r.createdAt)}</td>
      <td>${stTag(r.status)}</td>
      <td><button class="btn sec sm" onclick="viewRequest('${r.id}')">View</button></td></tr>`).join('')}</tbody></table>`
    : empty('No requests yet.'));
}

PAGES['p-cancel'] = () => {
  const list = (S.dash.requests || []).filter(r => !['completed', 'cancelled'].includes(r.status));
  return panel('✖️ Cancel Request', list.length ? list.map(r => reqCard(r,
    `<button class="btn no sm" onclick="cancelRequest('${r.id}')">Cancel request</button>
     <button class="btn sec sm" onclick="viewRequest('${r.id}')">View</button>`)).join('') : empty('Nothing to cancel.'));
};
async function cancelRequest(id) {
  if (!confirm('Cancel this blood request?')) return;
  try {
    await api('/requests/' + id + '/status', 'PATCH', { status: 'cancelled', note: 'Cancelled by requester' });
    toast('Request cancelled', 'ok'); refreshDash();
  } catch (e) { toast(e.message, 'bad'); }
}

/* request detail modal (shared) */
async function viewRequest(id) {
  try {
    const d = await api('/requests/' + id);
    const r = d.request, donors = d.donors;
    openG(`
      <h2 class="mh">Request #${esc(r.id)}</h2>
      <p class="msub">${esc(r.hospitalName)} · ${esc(r.city)}</p>
      <div class="btn-row" style="margin-bottom:14px">${bgTag(r.bloodGroup)} ${stTag(r.status)} ${urgTag(r.urgency)}</div>
      <div class="kv" style="grid-template-columns:1fr 1fr;margin-top:0">
        <div class="k"><span>Patient</span><b>${esc(r.patientName)}</b></div>
        <div class="k"><span>Units</span><b>${r.units}</b></div>
        <div class="k"><span>Condition</span><b>${esc(r.condition || '—')}</b></div>
        <div class="k"><span>Contact</span><b>${esc(r.contactPhone || '—')}</b></div>
        <div class="k"><span>Created</span><b>${fmtDate(r.createdAt)}</b></div>
        <div class="k"><span>Assigned</span><b>${esc(r.assignedTo || 'unassigned')}</b></div>
      </div>
      <h3 style="font-size:.95rem;margin:18px 0 10px">🤝 Donor responses ${donors.length ? '' : '(none yet)'}</h3>
      ${donors.map(dr => `<div class="bd" style="align-items:center;margin-bottom:8px">
        <div><b>${esc(dr.name)}</b> ${bgTag(dr.bloodGroup)}
          <span style="display:block;font-size:.75rem;color:#7b8194">${esc(dr.city || '')} ${dr.phone ? '· ' + esc(dr.phone) : '· number hidden'} ${dr.trust ? '· ⭐ ' + dr.trust.score + ' ' + dr.trust.level : ''}</span></div>
        <span class="tag ${dr.status === 'accepted' ? 't-accepted' : 't-declined'}">${dr.status}</span></div>`).join('')}
      <h3 style="font-size:.95rem;margin:18px 0 10px">📜 Timeline</h3>
      <div class="tl">${(r.timeline || []).slice().reverse().map(ev =>
        `<div class="ev"><b>${esc((ev.status || '').replace(/_/g, ' ').toUpperCase())}</b><small>${esc(ev.note || '')} · ${fmtDate(ev.at)}</small></div>`).join('')}</div>
      <button class="btn pri" style="width:100%;margin-top:8px" onclick="closeG()">Close</button>`);
  } catch (e) { toast(e.message, 'bad'); }
}

/* profile edit (donor/patient shared) */
function editProfile() {
  const u = S.user;
  openG(`
    <h2 class="mh">✏️ Edit profile</h2>
    <form onsubmit="return saveProfile(event)">
      <div class="row2">
        <label>Name<input id="epName" value="${esc(u.name)}" required></label>
        <label>Phone<input id="epPhone" value="${esc(u.phone || '')}"></label>
      </div>
      <div class="row2">
        <label>City<input id="epCity" value="${esc(u.city || '')}"></label>
        <label>Blood group<select id="epGroup">
          <option value="">—</option>${['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => `<option ${u.bloodGroup === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select></label>
      </div>
      <label>New password (optional)<input id="epPass" type="password" placeholder="leave blank to keep"></label>
      <button class="btn pri" style="width:100%" type="submit">Save changes</button>
      <p class="err" id="epErr"></p>
    </form>`);
}
async function saveProfile(e) {
  e.preventDefault();
  const body = { name: $('epName').value, phone: $('epPhone').value, city: $('epCity').value, bloodGroup: $('epGroup').value };
  if ($('epPass').value) body.password = $('epPass').value;
  try {
    const d = await api('/profile', 'PATCH', body);
    S.user = Object.assign(S.user, d.user);
    toast('Profile updated', 'ok'); closeG(); refreshDash();
  } catch (err) { $('epErr').textContent = err.message; }
  return false;
}
