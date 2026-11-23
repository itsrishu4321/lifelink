/* ===== LifeLink dashboard core ===== */
const S = { token: localStorage.getItem('ll_token'), user: null, trust: null, dash: null, page: null, notifs: [] };

async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token },
    body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { logout(true); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function logout(silent) {
  if (!silent && S.token) fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + S.token } }).catch(() => {});
  localStorage.removeItem('ll_token'); localStorage.removeItem('ll_user');
  location.href = '/';
}
function toast(msg, kind) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast on' + (kind ? ' ' + kind : '');
  setTimeout(() => t.className = 'toast', 3400);
}
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDay = (t) => t ? new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
const ago = (t) => { const m = Math.floor((Date.now() - t) / 6e4); if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago'; };

const ROLE_NAME = {
  donor: 'Donor', patient: 'Patient', family: 'Family / Attendant',
  hospital_staff: 'Hospital Staff', hospital_admin: 'Hospital Admin',
  blood_bank_staff: 'Blood Bank Staff', blood_bank_admin: 'Blood Bank Admin', super_admin: 'Super Admin'
};
const STATUS_TAG = {
  new: 't-new', pending: 't-pending', verified: 't-verified', coordinating: 't-coordinating',
  completed: 't-completed', cancelled: 't-cancelled'
};
const stTag = (s) => `<span class="tag ${STATUS_TAG[s] || 't-new'}">${esc((s || '').toUpperCase())}</span>`;
const urgTag = (u) => u === 'critical' ? '<span class="tag t-critical">🚨 CRITICAL</span>' : '<span class="tag t-normal">Normal</span>';
const bgTag = (g) => `<span class="tag t-grp">${esc(g || '?')}</span>`;
function stat(lbl, val, sub, cls) {
  return `<div class="stat ${cls || ''}"><div class="lbl">${lbl}</div><div class="val">${val}</div>${sub ? `<div class="sub2">${sub}</div>` : ''}</div>`;
}
function panel(title, body, right) {
  return `<div class="panel"><div class="panel-head"><h3>${title}</h3>${right ? `<div class="right">${right}</div>` : ''}</div><div class="panel-body">${body}</div></div>`;
}
function panelTight(title, body, right) {
  return `<div class="panel"><div class="panel-head"><h3>${title}</h3>${right ? `<div class="right">${right}</div>` : ''}</div><div class="panel-body tight">${body}</div></div>`;
}
const empty = (msg) => `<div class="empty">🩸 ${msg}</div>`;

/* ---------- generic modal ---------- */
function openG(html) { $('gBody').innerHTML = html; $('gModal').classList.add('on'); }
function closeG() { $('gModal').classList.remove('on'); $('gBody').innerHTML = ''; }

/* ---------- notifications ---------- */
async function loadNotifs() {
  try { S.notifs = await api('/notifications'); } catch (e) { return; }
  const unread = S.notifs.filter(n => !n.read).length;
  const c = $('notifCount');
  c.hidden = unread === 0; c.textContent = unread;
}
function toggleNotif() {
  const p = $('notifPop');
  if (!p.hidden) { p.hidden = true; return; }
  p.hidden = false;
  p.innerHTML = S.notifs.length ? S.notifs.slice(0, 20).map(n =>
    `<div class="n ${n.read ? '' : 'unread'}"><span class="tm">${ago(n.at)}</span><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div>`
  ).join('') : '<div class="empty">No notifications yet</div>';
  if (S.notifs.some(n => !n.read)) api('/notifications/read', 'POST', {}).then(loadNotifs).catch(() => {});
}
document.addEventListener('click', e => {
  const p = $('notifPop');
  if (p && !p.hidden && !p.contains(e.target) && !e.target.closest('.bell')) p.hidden = true;
});

/* ---------- emergency ---------- */
function openEmergency() {
  $('eCity').value = (S.user && S.user.city) || '';
  $('emgModal').classList.add('on');
  renderEmgLive(null);
}
function closeEmergency() { $('emgModal').classList.remove('on'); }
async function sendEmergency(e) {
  e.preventDefault();
  try {
    const d = await api('/emergency', 'POST', {
      bloodGroup: $('eGroup').value, units: +$('eUnits').value, city: $('eCity').value,
      hospitalName: $('eHosp').value, patientName: $('ePatient').value
    });
    toast('🚨 Emergency broadcast sent to ' + d.emergency.notified.length + ' donors', 'ok');
    renderEmgLive(d.emergency);
    refreshDash();
  } catch (err) { $('eErr').textContent = err.message; }
  return false;
}
function renderEmgLive(er) {
  const box = $('emgLive');
  if (!er) {
    box.innerHTML = `<div class="emg-live-box"><div class="row"><span>Active emergencies</span><b>${(S.dash && S.dash.emergency ? S.dash.emergency.length : 0)}</b></div>
      <div class="row" style="color:#7b8194;font-size:.78rem">Broadcasting notifies all compatible, available donors in the selected city.</div></div>`;
    return;
  }
  box.innerHTML = `<div class="emg-live-box">
    <div class="row"><span>📨 Donors notified</span><b>${er.notified.length}</b></div>
    <div class="row"><span>✅ Donors accepted</span><b>${er.accepted.length}</b></div>
    <div class="row"><span>Status</span><b>${er.status === 'active' ? '🟢 Active' : '✔ Resolved'}</b></div>
    <div class="row"><span>Blood group</span><b>${esc(er.bloodGroup)} × ${er.units}</b></div></div>`;
}

/* ---------- menus (exactly per spec, + smart features) ---------- */
const MENUS = {
  donor: [
    ['My Profile', '👤', 'd-profile'],
    ['Blood Group', '🩸', 'd-bloodgroup'],
    ['Availability Status', '🟢', 'd-availability'],
    ['Nearby Blood Requests', '📍', 'd-nearby'],
    ['Accept / Decline Request', '✅', 'd-respond'],
    ['Donation History', '📜', 'd-history'],
    ['Notifications', '🔔', 'd-notifs'],
    ['Update Location', '🧭', 'd-location'],
    ['Privacy Settings', '🔒', 'd-privacy'],
    ['🩺 Medical & Eligibility', '🩺', 'd-medical'],
    ['⭐ Trust Score', '⭐', 'd-trust'],
    ['🧠 AI Demand Forecast', '🧠', 'd-ai']
  ],
  patient: [
    ['Request Blood', '🩸', 'p-request'],
    ['Select Blood Group', '🅰️', 'p-group'],
    ['Required Units', '🔢', 'p-units'],
    ['Hospital Details', '🏥', 'p-hospital'],
    ['Patient Details', '🧍', 'p-patient'],
    ['Request Status', '📊', 'p-status'],
    ['Donor Response Status', '🤝', 'p-response'],
    ['Notifications', '🔔', 'p-notifs'],
    ['Request History', '🗂️', 'p-history'],
    ['Cancel Request', '✖️', 'p-cancel']
  ],
  family: [
    ['Add / Select Patient', '➕', 'f-patient'],
    ['Request Blood', '🩸', 'f-request'],
    ['Patient Information', '🧍', 'f-pinfo'],
    ['Hospital Information', '🏥', 'f-hinfo'],
    ['Request Tracking', '📍', 'f-track'],
    ['Donor Response', '🤝', 'f-response'],
    ['Notifications', '🔔', 'f-notifs'],
    ['Previous Requests', '🗂️', 'f-history']
  ],
  hospital_staff: [
    ['Hospital Name', '🏥', 'h-name'],
    ['New Blood Requests', '🆕', 'h-new'],
    ['Pending Requests', '⏳', 'h-pending'],
    ['Verified Requests', '✔️', 'h-verified'],
    ['Patient Request Details', '📋', 'h-details'],
    ['Donor Response Status', '🤝', 'h-response'],
    ['Blood Bank Coordination', '🧪', 'h-bank'],
    ['Update Request Status', '🔄', 'h-update'],
    ['Notifications', '🔔', 'h-notifs'],
    ['Request History', '🗂️', 'h-history']
  ],
  hospital_admin: [
    ['Hospital Profile', '🏥', 'ha-profile'],
    ['Total Blood Requests', '📊', 'ha-total'],
    ['Pending Requests', '⏳', 'ha-pending'],
    ['Completed Requests', '✅', 'ha-completed'],
    ['Manage Hospital Staff', '👥', 'ha-staff'],
    ['Add / Remove Staff', '➕', 'ha-addstaff'],
    ['Assign Requests', '📌', 'ha-assign'],
    ['Donor Response Monitoring', '🤝', 'ha-donor'],
    ['Blood Bank Coordination', '🧪', 'ha-bank'],
    ['Reports and Analytics', '📈', 'ha-reports'],
    ['Notifications', '🔔', 'ha-notifs'],
    ['Activity Logs', '🧾', 'ha-logs'],
    ['🧠 AI Demand Forecast', '🧠', 'ha-ai']
  ],
  blood_bank_staff: [
    ['Blood Bank Profile', '🧪', 'b-profile'],
    ['Blood Stock', '🩸', 'b-stock'],
    ['Blood Group-wise Inventory', '🗃️', 'b-inventory'],
    ['Incoming Requests', '📥', 'b-incoming'],
    ['Availability Status', '🟢', 'b-availability'],
    ['Blood Issue Records', '🧾', 'b-issues'],
    ['Update Inventory', '✏️', 'b-update'],
    ['Request History', '🗂️', 'b-history'],
    ['Notifications', '🔔', 'b-notifs'],
    ['🧠 AI Demand Forecast', '🧠', 'b-ai']
  ],
  blood_bank_admin: [
    ['Blood Bank Profile', '🧪', 'ba-profile'],
    ['Total Blood Stock', '🩸', 'ba-stock'],
    ['Blood Group-wise Stock', '🗃️', 'ba-inventory'],
    ['Incoming Requests', '📥', 'ba-incoming'],
    ['Manage Blood Bank Staff', '👥', 'ba-staff'],
    ['Add / Remove Staff', '➕', 'ba-addstaff'],
    ['Inventory Monitoring', '📈', 'ba-monitor'],
    ['Blood Issue Records', '🧾', 'ba-issues'],
    ['Reports and Analytics', '📊', 'ba-reports'],
    ['Request History', '🗂️', 'ba-history'],
    ['Activity Logs', '🧾', 'ba-logs'],
    ['🧠 AI Forecast + Integration', '🧠', 'ba-ai']
  ],
  super_admin: [
    ['Total Registered Users', '👤', 's-users'],
    ['Total Donors', '🩸', 's-donors'],
    ['Total Patients', '🧍', 's-patients'],
    ['Total Hospitals', '🏥', 's-hospitals'],
    ['Total Blood Banks', '🧪', 's-banks'],
    ['Pending Hospital Verification', '⚠️', 's-pendh'],
    ['Pending Blood Bank Verification', '⚠️', 's-pendb'],
    ['🩺 Donor Verification Queue', '🩺', 's-medverify'],
    ['Total Blood Requests', '📊', 's-requests'],
    ['Active Requests', '🟢', 's-active'],
    ['Completed Requests', '✅', 's-completed'],
    ['User Management', '👥', 's-usermgmt'],
    ['Hospital Management', '🏥', 's-hospmgmt'],
    ['Blood Bank Management', '🧪', 's-bankmgmt'],
    ['Role & Permission Management', '🔑', 's-roles'],
    ['Reports and Analytics', '📈', 's-reports'],
    ['Complaint Management', '🚩', 's-complaints'],
    ['System Monitoring', '🖥️', 's-system'],
    ['Audit Logs', '🧾', 's-logs'],
    ['⭐ Trust Leaderboard', '⭐', 's-trust'],
    ['🧠 AI Prediction', '🧠', 's-ai'],
    ['🔗 App ↔ Software Integration', '🔗', 's-integration']
  ]
};

function buildMenu() {
  const items = MENUS[S.user.role] || [];
  $('menu').innerHTML = items.map(([label, ic, page], i) =>
    (i === 0 || items[i - 1][0] === '⭐ Trust Score' && page === 'd-ai' ? '' : '') +
    `<button data-page="${page}" onclick="go('${page}')"><span class="ic">${ic}</span>${label}</button>`
  ).join('');
}
function go(page) {
  S.page = page;
  document.querySelectorAll('.menu button').forEach(b => b.classList.toggle('on', b.dataset.page === page));
  document.body.classList.remove('nav-open');
  const fn = PAGES[page];
  $('content').innerHTML = fn ? fn() : empty('Page not found');
  if (AFTER[page]) AFTER[page]();
  const t = (MENUS[S.user.role] || []).find(m => m[2] === page);
  $('pageTitle').textContent = t ? t[0] : 'Dashboard';
  $('pageSub').textContent = (ROLE_NAME[S.user.role] || '') + ' · ' + (S.user.hospitalId || S.user.bloodBankId || S.user.city || 'LifeLink');
  window.scrollTo(0, 0);
}
async function refreshDash() {
  try { S.dash = await api('/dashboard'); } catch (e) {}
  if (S.page) go(S.page);
  loadNotifs();
}

/* ---------- boot ---------- */
async function boot() {
  if (!S.token) return location.href = '/';
  try {
    const me = await api('/auth/me');
    S.user = me.user; S.trust = me.trust;
  } catch (e) { return; }
  $('avatar').textContent = (S.user.name || '?').trim()[0].toUpperCase();
  const tp = S.trust ? `<div class="trust-pill ${S.trust.score >= 70 ? 'good' : S.trust.score >= 50 ? 'mid' : 'low'}">⭐ ${S.trust.score} · ${S.trust.level}</div>` : '';
  $('whoBox').innerHTML = `<div class="nm">${esc(S.user.name)}</div>
    <div class="rl">${ROLE_NAME[S.user.role]}</div>
    <div class="meta">${esc(S.user.email)}${S.user.bloodGroup ? ' · ' + esc(S.user.bloodGroup) : ''}</div>${tp}`;
  buildMenu();
  await refreshDash();
  const first = (MENUS[S.user.role] || [])[0];
  if (first) go(first[2]);
}
window.addEventListener('DOMContentLoaded', boot);
