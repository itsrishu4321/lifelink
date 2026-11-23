/* LifeLink — Blood Donation Network | Zero-dependency Node.js server */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createSeed, GROUPS } = require('./data');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'db.json');
const PUBLIC = path.join(__dirname, 'public');

let db;
if (fs.existsSync(DATA_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { db = createSeed(); }
} else db = createSeed();

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(db)); } catch (e) {}
  }, 300);
}
setInterval(() => { try { fs.writeFileSync(DATA_FILE, JSON.stringify(db)); } catch (e) {} }, 15000).unref();

const ROLES = ['donor', 'patient', 'family', 'hospital_staff', 'hospital_admin', 'blood_bank_staff', 'blood_bank_admin', 'super_admin'];
const hash = (pw) => crypto.createHash('sha256').update('lifelink::' + pw).digest('hex');
const id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------------- Trust / Reliability score (0-100) ---------------- */
function trustScore(u) {
  if (u.role !== 'donor') return null;
  const s = u.stats || { responded: 0, accepted: 0, completed: 0, onTime: 0, missed: 0 };
  const respRate = s.responded ? s.accepted / s.responded : 0.6;
  const showUp = s.accepted ? s.completed / s.accepted : 0.6;
  const punctual = s.completed ? s.onTime / s.completed : 0.6;
  const noMiss = s.accepted + s.missed ? 1 - s.missed / (s.accepted + s.missed) : 0.6;
  const volume = Math.min(1, s.completed / 6);                 // 6+ donations = full marks
  const verified = u.verified ? 1 : 0.45;
  const score = Math.round(100 * (
    0.24 * respRate + 0.24 * showUp + 0.16 * punctual + 0.14 * noMiss + 0.12 * volume + 0.10 * verified
  ));
  const level = score >= 85 ? 'Excellent' : score >= 70 ? 'Reliable' : score >= 50 ? 'Average' : 'New / Low';
  return { score, level, breakdown: { responseRate: Math.round(respRate * 100), showUpRate: Math.round(showUp * 100), punctuality: Math.round(punctual * 100), consistency: Math.round(noMiss * 100), experience: Math.round(volume * 100), verified: u.verified ? 100 : 45 } };
}

/* ---------------- Donor medical verification ---------------- */
const MED_ANSWER_KEYS = ['well', 'recentIllness', 'bodyMod', 'chronic', 'medication', 'risk', 'infectious'];
function evaluateEligibility(med) {
  const flags = [];
  const h = Number(med.height), w = Number(med.weight), hb = Number(med.hb);
  if (!(h >= 140)) flags.push('Height ' + (h || '?') + ' cm — minimum 140 cm required');
  if (!(w >= 50)) flags.push('Weight ' + (w || '?') + ' kg — minimum 50 kg required');
  if (!(hb >= 12.5)) flags.push('Haemoglobin ' + (hb || '?') + ' g/dL — minimum 12.5 g/dL required');
  if (med.lastDonation) {
    const days = Math.floor((Date.now() - new Date(med.lastDonation + 'T00:00:00').getTime()) / 864e5);
    if (!isNaN(days) && days >= 0 && days < 84) flags.push('Last donation ' + days + ' day(s) ago — 84-day gap required');
  }
  const a = med.answers || {};
  if (a.well === 'no') flags.push('Not feeling well today (fever / cold / sore throat)');
  if (a.recentIllness === 'yes') flags.push('Illness reported in the last 14 days');
  if (a.bodyMod === 'yes') flags.push('Tattoo / piercing / surgery / transfusion in last 6 months');
  if (a.chronic === 'yes') flags.push('Chronic condition declared — physician review needed');
  if (a.medication === 'yes') flags.push('Current medication declared — physician review needed');
  if (a.risk === 'yes') flags.push('High-risk travel or exposure declared');
  if (a.infectious !== 'Negative') flags.push('Infectious screening not cleared (' + (a.infectious || 'no result') + ')');
  return flags;
}

/* ---------------- AI demand prediction (client-safe heuristic) ---------------- */
function predictDemand() {
  const now = Date.now(), day = 864e5;
  const stats = {};
  GROUPS.forEach(g => stats[g] = { count: 0, recent: 0, critical: 0, week: 0 });
  db.requests.forEach(r => {
    if (!stats[r.bloodGroup]) return;
    stats[r.bloodGroup].count++;
    if (now - r.createdAt < 7 * day) stats[r.bloodGroup].week++;
    if (now - r.createdAt < 30 * day) stats[r.bloodGroup].recent++;
    if (r.urgency === 'critical') stats[r.bloodGroup].critical++;
  });
  const stock = {};
  GROUPS.forEach(g => stock[g] = 0);
  db.bloodBanks.filter(b => b.verified).forEach(b => GROUPS.forEach(g => stock[g] += (b.inventory[g] || { units: 0 }).units));

  const out = GROUPS.map(g => {
    const s = stats[g];
    const base = (s.recent || 0) / 30;                       // avg daily demand (30d)
    const weekAvg = (s.week || 0) / 7;
    const trend = base > 0 ? (weekAvg - base) / base : 0;    // momentum
    const pred7 = Math.max(0, Math.round((weekAvg * 0.6 + base * 4 * 0.4) * 7 * (1 + Math.max(0, trend) * 0.5)));
    const gap = pred7 - stock[g];
    const risk = stock[g] <= 0 ? 'critical' : gap > stock[g] * 0.5 ? 'high' : gap > 0 ? 'watch' : 'safe';
    const actions = {
      critical: 'Broadcast emergency appeal to all compatible donors immediately',
      high: 'Run targeted donor push + schedule a mobile camp in 48h',
      watch: 'Monitor daily; nudge idle donors in the area',
      safe: 'Stock healthy — thank donors & maintain cadence'
    };
    return { bloodGroup: g, predicted7d: pred7, currentStock: stock[g], gap: Math.max(0, gap), risk, action: actions[risk], recent30d: s.recent, criticalCount: s.critical };
  });
  const cities = {};
  db.requests.forEach(r => { if (now - r.createdAt < 30 * day) cities[r.city] = (cities[r.city] || 0) + 1; });
  const hotspot = Object.entries(cities).sort((a, b) => b[1] - a[1])[0];
  return {
    generatedAt: now,
    horizon: '7 days',
    overallRisk: out.some(o => o.risk === 'critical') ? 'critical' : out.some(o => o.risk === 'high') ? 'elevated' : 'stable',
    hotspot: hotspot ? { city: hotspot[0], requests30d: hotspot[1] } : null,
    forecast: out
  };
}

/* ---------------- Auth helpers ---------------- */
function getUser(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.headers['x-token'] || '');
  if (!t) return null;
  const uid = db.sessions[t];
  return db.users.find(u => u.id === uid && u.active) || null;
}
const canSee = (u, ...roles) => roles.includes(u.role);

function notify(userId, title, body, type) {
  db.notifications.unshift({ id: id('N'), userId, title, body, type: type || 'info', read: false, at: Date.now() });
  db.notifications = db.notifications.slice(0, 300);
}
function logAct(actor, action, target) {
  db.logs.unshift({ id: id('L'), actorId: actor.id, actorName: actor.name, role: actor.role, action, target, at: Date.now() });
  db.logs = db.logs.slice(0, 500);
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve({}); } });
  });
}

/* ---------------- Compatibility (donor for recipient) ---------------- */
const COMPAT = {
  'O-': ['O-'], 'O+': ['O-', 'O+'], 'A-': ['O-', 'A-'], 'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'], 'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'], 'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

/* ---------------- Emergency broadcast ---------------- */
function emergencyBroadcast({ bloodGroup, units, city, hospitalName, requesterId, patientName, contactPhone }) {
  const now = Date.now();
  const er = {
    id: id('E'), bloodGroup, units: units || 1, city, hospitalName: hospitalName || 'Not specified',
    requesterId, patientName: patientName || 'Emergency patient', contactPhone: contactPhone || '',
    at: now, status: 'active', notified: [], accepted: []
  };
  const compat = COMPAT[bloodGroup] || [bloodGroup];
  db.users.filter(u => u.role === 'donor' && u.active && u.availability === 'available'
    && compat.includes(u.bloodGroup)
    && (!city || !u.city || u.city === city)).forEach(d => {
      er.notified.push(d.id);
      notify(d.id, '🚨 EMERGENCY: ' + bloodGroup + ' needed', `${units || 1} unit(s) of ${bloodGroup} needed at ${hospitalName || city}. Tap to accept.`, 'emergency');
    });
  db.emergency = db.emergency || [];
  db.emergency.unshift(er);
  db.emergency = db.emergency.slice(0, 50);
  return er;
}

/* ---------------- API router ---------------- */
async function api(req, res, pathname, query) {
  const method = req.method;
  const seg = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const u = getUser(req);

  // ---------- auth ----------
  if (seg[0] === 'auth') {
    if (method === 'POST' && seg[1] === 'register') {
      const b = await readBody(req);
      if (!b.email || !b.password || !b.name) return send(res, 400, { error: 'name, email, password required' });
      if (db.users.some(x => x.email.toLowerCase() === b.email.toLowerCase())) return send(res, 409, { error: 'Email already registered' });
      const role = ROLES.includes(b.role) ? b.role : 'donor';
      if (['hospital_staff', 'hospital_admin', 'blood_bank_staff', 'blood_bank_admin', 'super_admin'].includes(role) && b.inviteCode !== 'LIFELINK2026')
        return send(res, 403, { error: 'Valid invite code required for this role (demo: LIFELINK2026)' });
      const nu = {
        id: id('U'), name: b.name, email: b.email.toLowerCase(), password: hash(b.password), role,
        phone: b.phone || '', bloodGroup: b.bloodGroup || '', city: b.city || '',
        availability: 'available', verified: role === 'donor' ? false : true, active: true,
        hospitalId: b.hospitalId || null, bloodBankId: b.bloodBankId || null,
        location: b.city ? { lat: 28.6139, lng: 77.209, radius: 25 } : null,
        privacy: { showPhone: false, showProfile: true, showHistory: true, discoverable: true },
        stats: { responded: 0, accepted: 0, completed: 0, onTime: 0, missed: 0 },
        patients: [], createdAt: Date.now()
      };
      db.users.push(nu);
      logAct(nu, 'Registered', nu.role + ' account');
      const tok = crypto.randomBytes(24).toString('hex');
      db.sessions[tok] = nu.id;
      save();
      return send(res, 201, { token: tok, user: pub(nu) });
    }
    if (method === 'POST' && seg[1] === 'login') {
      const b = await readBody(req);
      const found = db.users.find(x => x.email.toLowerCase() === (b.email || '').toLowerCase());
      if (!found || found.password !== hash(b.password || '')) return send(res, 401, { error: 'Invalid email or password' });
      if (!found.active) return send(res, 403, { error: 'Account deactivated' });
      const tok = crypto.randomBytes(24).toString('hex');
      db.sessions[tok] = found.id;
      save();
      return send(res, 200, { token: tok, user: pub(found) });
    }
    if (method === 'POST' && seg[1] === 'logout') {
      const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      delete db.sessions[t]; save(); return send(res, 200, { ok: true });
    }
    if (method === 'GET' && seg[1] === 'me') {
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      return send(res, 200, { user: pub(u), trust: trustScore(u) });
    }
  }

  if (!u) return send(res, 401, { error: 'Unauthorized' });

  // ---------- notifications ----------
  if (seg[0] === 'notifications') {
    if (method === 'GET') return send(res, 200, db.notifications.filter(n => n.userId === u.id).slice(0, 50));
    if (method === 'POST' && seg[1] === 'read') {
      const b = await readBody(req);
      db.notifications.forEach(n => { if (n.userId === u.id && (!b.id || n.id === b.id)) n.read = true; });
      save(); return send(res, 200, { ok: true });
    }
  }

  // ---------- dashboard (role-aware) ----------
  if (seg[0] === 'dashboard' && method === 'GET') {
    const now = Date.now(), day = 864e5;
    const r = u.role;
    if (r === 'donor') {
      const compat = [];
      db.requests.forEach(req2 => {
        if (!['new', 'pending', 'verified'].includes(req2.status)) return;
        if ((COMPAT[req2.bloodGroup] || []).includes(u.bloodGroup)) {
          const d = db.donations.find(d => d.donorId === u.id && d.requestId === req2.id);
          const resp = (req2.responses || []).find(x => x.donorId === u.id);
          compat.push({ ...req2, myResponse: resp ? resp.status : null, alreadyDonated: !!d });
        }
      });
      compat.sort((a, b) => (b.urgency === 'critical') - (a.urgency === 'critical') || b.createdAt - a.createdAt);
      return send(res, 200, {
        profile: pub(u), trust: trustScore(u),
        availability: u.availability,
        nearbyRequests: compat.slice(0, 20),
        donationHistory: db.donations.filter(d => d.donorId === u.id).sort((a, b) => b.date - a.date),
        stats: {
          totalDonations: db.donations.filter(d => d.donorId === u.id).length,
          livesHelped: new Set(db.donations.filter(d => d.donorId === u.id).map(d => d.requestId)).size,
          pendingNearby: compat.length
        },
        emergency: (db.emergency || []).filter(e => e.status === 'active').slice(0, 5)
      });
    }
    if (r === 'patient' || r === 'family') {
      const mine = db.requests.filter(x => x.requesterId === u.id || (u.patients || []).some(p => x.patientName === p.name));
      return send(res, 200, {
        profile: pub(u),
        requests: mine.sort((a, b) => b.createdAt - a.createdAt),
        patients: u.patients || [],
        stats: {
          total: mine.length,
          active: mine.filter(x => !['completed', 'cancelled'].includes(x.status)).length,
          completed: mine.filter(x => x.status === 'completed').length
        }
      });
    }
    if (r === 'hospital_staff' || r === 'hospital_admin') {
      const hosp = db.hospitals.find(h => h.id === u.hospitalId);
      const mine = db.requests.filter(x => x.hospitalId === u.hospitalId);
      const out = {
        hospital: hosp, requests: mine.sort((a, b) => b.createdAt - a.createdAt),
        stats: {
          total: mine.length,
          pending: mine.filter(x => ['new', 'pending'].includes(x.status)).length,
          verified: mine.filter(x => ['verified', 'coordinating'].includes(x.status)).length,
          completed: mine.filter(x => x.status === 'completed').length
        },
        bloodBanks: db.bloodBanks.filter(b => b.verified && b.city === (hosp ? hosp.city : null)),
        staff: r === 'hospital_admin' ? db.users.filter(x => x.hospitalId === u.hospitalId) : undefined,
        logs: r === 'hospital_admin' ? db.logs.filter(l => l.actorId === u.id || (db.users.some(su => su.hospitalId === u.hospitalId && su.id === l.actorId))).slice(0, 30) : undefined
      };
      return send(res, 200, out);
    }
    if (r === 'blood_bank_staff' || r === 'blood_bank_admin') {
      const bb = db.bloodBanks.find(b => b.id === u.bloodBankId);
      const incoming = db.requests.filter(x => x.city === (bb ? bb.city : '') && ['new', 'pending', 'verified', 'coordinating'].includes(x.status));
      return send(res, 200, {
        bloodBank: bb, inventory: bb ? bb.inventory : {},
        incoming: incoming.sort((a, b) => b.createdAt - a.createdAt),
        issues: db.issues.filter(i => i.bloodBankId === u.bloodBankId).sort((a, b) => b.at - a.at),
        staff: r === 'blood_bank_admin' ? db.users.filter(x => x.bloodBankId === u.bloodBankId) : undefined,
        logs: r === 'blood_bank_admin' ? db.logs.filter(l => db.users.some(su => su.bloodBankId === u.bloodBankId && su.id === l.actorId)).slice(0, 30) : undefined,
        prediction: predictDemand(),
        stats: {
          totalUnits: bb ? GROUPS.reduce((s, g) => s + ((bb.inventory[g] || {}).units || 0), 0) : 0,
          groups: bb ? GROUPS.filter(g => ((bb.inventory[g] || {}).units || 0) > 0).length : 0,
          incoming: incoming.length,
          issuedToday: db.issues.filter(i => i.bloodBankId === u.bloodBankId && now - i.at < day).length
        }
      });
    }
    if (r === 'super_admin') {
      const now2 = Date.now();
      return send(res, 200, {
        stats: {
          users: db.users.length,
          donors: db.users.filter(x => x.role === 'donor').length,
          patients: db.users.filter(x => ['patient', 'family'].includes(x.role)).length,
          hospitals: db.hospitals.length,
          bloodBanks: db.bloodBanks.length,
          pendingHospitals: db.hospitals.filter(h => !h.verified).length,
          pendingBanks: db.bloodBanks.filter(b => !b.verified).length,
          pendingMedical: db.users.filter(x => x.role === 'donor' && x.medical && x.medical.status === 'pending').length,
          requests: db.requests.length,
          active: db.requests.filter(x => !['completed', 'cancelled'].includes(x.status)).length,
          completed: db.requests.filter(x => x.status === 'completed').length,
          totalUnitsIssued: db.issues.reduce((s, i) => s + i.units, 0)
        },
        users: db.users.map(pub),
        hospitals: db.hospitals, bloodBanks: db.bloodBanks.map(b => ({ ...b, inventory: undefined })),
        requests: db.requests.slice(0, 60),
        complaints: db.complaints, logs: db.logs.slice(0, 50),
        prediction: predictDemand(),
        trustBoard: db.users.filter(x => x.role === 'donor').map(x => ({ ...pub(x), trust: trustScore(x) })).sort((a, b) => b.trust.score - a.trust.score),
        system: { uptime: process.uptime(), apiCalls: (db.meta.apiCalls || 0) + 1, syncAt: db.meta.syncAt, memory: process.memoryUsage().heapUsed, dataFile: DATA_FILE },
        emergency: db.emergency || []
      });
    }
  }

  // ---------- donor actions ----------
  if (seg[0] === 'donor') {
    if (seg[1] === 'medical') {
      if (!canSee(u, 'donor')) return send(res, 403, { error: 'Donors only' });
      if (method === 'GET') return send(res, 200, { medical: u.medical || null });
      if (method === 'POST') {
        const b = await readBody(req);
        const hb = Number(b.hb), h = Number(b.height), w = Number(b.weight);
        if (!(hb >= 5 && hb <= 25)) return send(res, 400, { error: 'Haemoglobin must be between 5 and 25 g/dL' });
        if (!(h >= 100 && h <= 250)) return send(res, 400, { error: 'Height must be between 100 and 250 cm' });
        if (!(w >= 20 && w <= 250)) return send(res, 400, { error: 'Weight must be between 20 and 250 kg' });
        const answers = {};
        for (const k of MED_ANSWER_KEYS) {
          if (!b.answers || !b.answers[k]) return send(res, 400, { error: 'Please answer all screening questions (' + k + ')' });
          answers[k] = String(b.answers[k]).slice(0, 60);
        }
        const med = {
          height: h, weight: w, hb,
          lastDonation: b.lastDonation || null,
          test: { name: (b.test && b.test.name) || '', date: (b.test && b.test.date) || '', result: (b.test && b.test.result) || 'Not tested' },
          answers,
          submittedAt: Date.now(),
          status: 'pending', reviewNote: '', reviewedBy: null, reviewedAt: null
        };
        med.flags = evaluateEligibility(med);
        med.verdict = med.flags.length ? 'deferred' : 'eligible';
        u.medical = med;
        db.users.filter(x => x.role === 'super_admin' && x.active).forEach(a =>
          notify(a.id, '🩺 Donor medical form submitted', u.name + ' (' + u.bloodGroup + ', ' + u.city + ') — auto verdict: ' + med.verdict.toUpperCase() + (med.flags.length ? ' · ' + med.flags.length + ' flag(s)' : ''), 'verify'));
        logAct(u, 'Submitted medical verification form', u.name + ' — verdict: ' + med.verdict);
        save();
        return send(res, 201, { medical: med, trust: trustScore(u) });
      }
    }
    if (seg[1] === 'availability' && method === 'POST') {
      const b = await readBody(req);
      u.availability = b.availability === 'paused' ? 'paused' : 'available';
      save(); return send(res, 200, { availability: u.availability });
    }
    if (seg[1] === 'respond' && method === 'POST') {
      const b = await readBody(req);
      const rq = db.requests.find(x => x.id === b.requestId);
      if (!rq) return send(res, 404, { error: 'Request not found' });
      if (!canSee(u, 'donor')) return send(res, 403, { error: 'Donors only' });
      let resp = (rq.responses || []).find(x => x.donorId === u.id);
      if (!resp) { resp = { donorId: u.id, status: b.action, at: Date.now() }; (rq.responses = rq.responses || []).push(resp); u.stats.responded++; }
      else { resp.status = b.action; resp.at = Date.now(); }
      if (b.action === 'accepted') { u.stats.accepted++; rq.timeline.push({ status: 'donor_accepted', at: Date.now(), by: u.id, note: u.name + ' accepted' }); notify(rq.requesterId, 'Donor accepted your request', u.name + ' (' + u.bloodGroup + ') accepted request ' + rq.id, 'response'); }
      if (b.action === 'declined') rq.timeline.push({ status: 'donor_declined', at: Date.now(), by: u.id, note: u.name + ' declined' });
      rq.updatedAt = Date.now();
      save();
      return send(res, 200, { ok: true, trust: trustScore(u) });
    }
    if (seg[1] === 'donate' && method === 'POST') {
      const b = await readBody(req);
      const rq = db.requests.find(x => x.id === b.requestId);
      if (!rq) return send(res, 404, { error: 'Request not found' });
      const d = { id: id('D'), donorId: u.id, requestId: rq.id, bloodGroup: u.bloodGroup, units: 1, hospitalName: rq.hospitalName, city: rq.city, date: Date.now(), verified: true, certificateId: 'LL-CERT-' + Date.now().toString(36).toUpperCase() };
      db.donations.push(d);
      u.stats.completed++; u.stats.onTime++;
      if (rq.status !== 'completed') { rq.status = 'completed'; rq.updatedAt = Date.now(); rq.timeline.push({ status: 'completed', at: Date.now(), by: u.id, note: 'Donation confirmed by donor' }); }
      notify(rq.requesterId, 'Donation completed 🙏', u.name + ' donated for request ' + rq.id, 'donation');
      save();
      return send(res, 200, { donation: d, trust: trustScore(u) });
    }
    if (seg[1] === 'location' && method === 'POST') {
      const b = await readBody(req);
      u.location = { lat: Number(b.lat) || 28.6139, lng: Number(b.lng) || 77.209, radius: Number(b.radius) || 25 };
      if (b.city) u.city = b.city;
      save(); return send(res, 200, { location: u.location, city: u.city });
    }
    if (seg[1] === 'privacy' && method === 'POST') {
      const b = await readBody(req);
      u.privacy = Object.assign(u.privacy || {}, b);
      save(); return send(res, 200, { privacy: u.privacy });
    }
  }

  // ---------- requests (patient / family / hospital) ----------
  if (seg[0] === 'requests') {
    if (method === 'POST' && !seg[1]) {
      const b = await readBody(req);
      if (!b.bloodGroup || !b.patientName) return send(res, 400, { error: 'bloodGroup and patientName required' });
      const hosp = b.hospitalId ? db.hospitals.find(h => h.id === b.hospitalId) : null;
      const rq = {
        id: id('R'), requesterId: u.id, requesterRole: u.role,
        patientName: b.patientName, patientAge: b.patientAge || '', gender: b.gender || '',
        bloodGroup: b.bloodGroup, units: Number(b.units) || 1,
        hospitalId: hosp ? hosp.id : null, hospitalName: b.hospitalName || (hosp ? hosp.name : 'Not specified'),
        city: b.city || u.city || '', address: b.address || (hosp ? hosp.address : ''),
        contactPhone: b.contactPhone || u.phone, condition: b.condition || '',
        urgency: b.urgency === 'critical' ? 'critical' : 'normal',
        status: 'new', assignedTo: null, responses: [],
        timeline: [{ status: 'new', at: Date.now(), by: u.id, note: 'Request created' }],
        createdAt: Date.now(), updatedAt: Date.now()
      };
      db.requests.unshift(rq);
      if (b.emergency) emergencyBroadcast({ bloodGroup: rq.bloodGroup, units: rq.units, city: rq.city, hospitalName: rq.hospitalName, requesterId: u.id, patientName: rq.patientName, contactPhone: rq.contactPhone });
      // notify compatible donors
      const compat = COMPAT[rq.bloodGroup] || [rq.bloodGroup];
      db.users.filter(d => d.role === 'donor' && d.active && compat.includes(d.bloodGroup) && (!rq.city || d.city === rq.city))
        .forEach(d => notify(d.id, 'New ' + rq.bloodGroup + ' request nearby', rq.hospitalName + ' needs ' + rq.units + ' unit(s) — ' + (rq.condition || 'transfusion'), 'request'));
      if (['hospital_staff', 'hospital_admin'].includes(u.role))
        db.users.filter(x => x.hospitalId === u.hospitalId && x.id !== u.id).forEach(s => notify(s.id, 'New request in your hospital', rq.id + ' · ' + rq.bloodGroup + ' · ' + rq.units + ' units', 'request'));
      save();
      return send(res, 201, { request: rq });
    }
    if (method === 'GET' && !seg[1]) {
      let list = db.requests;
      if (u.role === 'patient' || u.role === 'family') list = list.filter(x => x.requesterId === u.id);
      else if (u.role === 'hospital_staff' || u.role === 'hospital_admin') list = list.filter(x => x.hospitalId === u.hospitalId);
      else if (u.role === 'blood_bank_staff' || u.role === 'blood_bank_admin') list = list.filter(x => x.city === (db.bloodBanks.find(b => b.id === u.bloodBankId) || {}).city);
      return send(res, 200, list.slice(0, 100));
    }
    if (seg[1] && method === 'GET') {
      const rq = db.requests.find(x => x.id === seg[1]);
      if (!rq) return send(res, 404, { error: 'Not found' });
      const donors = (rq.responses || []).map(r => {
        const d = db.users.find(x => x.id === r.donorId);
        return { ...r, name: d ? d.name : 'Donor', bloodGroup: d ? d.bloodGroup : '', city: d ? d.city : '', phone: d && d.privacy && d.privacy.showPhone ? d.phone : null, trust: d ? trustScore(d) : null };
      });
      return send(res, 200, { request: rq, donors });
    }
    if (seg[1] && seg[2] === 'status' && method === 'PATCH') {
      const b = await readBody(req);
      const rq = db.requests.find(x => x.id === seg[1]);
      if (!rq) return send(res, 404, { error: 'Not found' });
      const allowed = { hospital_staff: ['pending', 'verified', 'coordinating'], hospital_admin: ['pending', 'verified', 'coordinating', 'completed', 'cancelled'], blood_bank_staff: ['completed'], blood_bank_admin: ['completed', 'cancelled'], patient: ['cancelled'], family: ['cancelled'], super_admin: ['pending', 'verified', 'coordinating', 'completed', 'cancelled'] };
      if (!(allowed[u.role] || []).includes(b.status)) return send(res, 403, { error: 'Not allowed for your role' });
      rq.status = b.status; rq.updatedAt = Date.now();
      rq.timeline.push({ status: b.status, at: Date.now(), by: u.id, note: b.note || ('Status → ' + b.status) });
      notify(rq.requesterId, 'Request ' + rq.id + ' ' + b.status, b.note || ('Status updated to ' + b.status), 'status');
      save(); return send(res, 200, { request: rq });
    }
    if (seg[1] && seg[2] === 'assign' && method === 'POST') {
      const b = await readBody(req);
      if (!canSee(u, 'hospital_admin', 'super_admin')) return send(res, 403, { error: 'Forbidden' });
      const rq = db.requests.find(x => x.id === seg[1]);
      if (!rq) return send(res, 404, { error: 'Not found' });
      rq.assignedTo = b.staffId; rq.updatedAt = Date.now();
      rq.timeline.push({ status: 'assigned', at: Date.now(), by: u.id, note: 'Assigned to staff ' + b.staffId });
      if (b.staffId) notify(b.staffId, 'Request assigned to you', rq.id + ' · ' + rq.bloodGroup, 'assign');
      logAct(u, 'Assigned request', rq.id + ' → ' + b.staffId);
      save(); return send(res, 200, { request: rq });
    }
    if (seg[1] && seg[2] === 'issue' && method === 'POST') {
      if (!canSee(u, 'blood_bank_staff', 'blood_bank_admin', 'super_admin')) return send(res, 403, { error: 'Forbidden' });
      const b = await readBody(req);
      const rq = db.requests.find(x => x.id === seg[1]);
      const bb = db.bloodBanks.find(x => x.id === u.bloodBankId);
      if (!rq || !bb) return send(res, 404, { error: 'Not found' });
      const units = Number(b.units) || rq.units;
      const slot = bb.inventory[rq.bloodGroup];
      if (!slot || slot.units < units) return send(res, 409, { error: 'Insufficient stock of ' + rq.bloodGroup });
      slot.units -= units; slot.updatedAt = Date.now();
      db.issues.unshift({ id: id('I'), bloodBankId: bb.id, requestId: rq.id, bloodGroup: rq.bloodGroup, units, hospitalName: rq.hospitalName, by: u.id, at: Date.now() });
      rq.status = 'completed'; rq.updatedAt = Date.now();
      rq.issued = { units, bloodBankId: bb.id, at: Date.now() };
      rq.timeline.push({ status: 'completed', at: Date.now(), by: u.id, note: units + ' unit(s) issued from ' + bb.name });
      notify(rq.requesterId, 'Blood issued ✅', units + ' unit(s) of ' + rq.bloodGroup + ' issued for ' + rq.id, 'issue');
      logAct(u, 'Issued blood', rq.id + ' → ' + units + 'u ' + rq.bloodGroup);
      save(); return send(res, 200, { request: rq, stock: bb.inventory[rq.bloodGroup] });
    }
  }

  // ---------- hospitals ----------
  if (seg[0] === 'hospitals') {
    if (method === 'GET') return send(res, 200, db.hospitals);
    if (method === 'POST' && canSee(u, 'super_admin')) {
      const b = await readBody(req);
      const h = { id: id('H'), name: b.name, city: b.city, address: b.address || '', phone: b.phone || '', lat: 28.61, lng: 77.2, verified: false, code: 'HOSP' + Math.random().toString(36).slice(2, 6).toUpperCase(), createdAt: Date.now() };
      db.hospitals.push(h); logAct(u, 'Added hospital', h.name); save(); return send(res, 201, { hospital: h });
    }
    if (seg[1] && method === 'PATCH' && canSee(u, 'super_admin')) {
      const b = await readBody(req);
      const h = db.hospitals.find(x => x.id === seg[1]);
      if (!h) return send(res, 404, { error: 'Not found' });
      Object.assign(h, b); logAct(u, b.verified !== undefined ? (b.verified ? 'Verified hospital' : 'De-verified hospital') : 'Edited hospital', h.name); save();
      return send(res, 200, { hospital: h });
    }
    if (seg[1] && seg[2] === 'staff' && method === 'GET' && canSee(u, 'hospital_admin', 'super_admin'))
      return send(res, 200, db.users.filter(x => x.hospitalId === seg[1]).map(pub));
    if (seg[1] && seg[2] === 'staff' && method === 'POST' && canSee(u, 'hospital_admin', 'super_admin')) {
      const b = await readBody(req);
      if (db.users.some(x => x.email.toLowerCase() === (b.email || '').toLowerCase())) return send(res, 409, { error: 'Email exists' });
      const nu = { id: id('U'), name: b.name, email: b.email.toLowerCase(), password: hash(b.password || 'staff123'), role: b.role === 'hospital_admin' ? 'hospital_admin' : 'hospital_staff', phone: b.phone || '', bloodGroup: '', city: b.city || '', availability: 'available', verified: true, active: true, hospitalId: seg[1], bloodBankId: null, location: null, privacy: { showPhone: false, showProfile: true, showHistory: true, discoverable: true }, stats: { responded: 0, accepted: 0, completed: 0, onTime: 0, missed: 0 }, patients: [], createdAt: Date.now() };
      db.users.push(nu); logAct(u, 'Added staff', nu.name + ' (' + nu.role + ')'); save();
      return send(res, 201, { user: pub(nu) });
    }
    if (seg[1] && seg[2] === 'staff' && seg[3] && method === 'DELETE' && canSee(u, 'hospital_admin', 'super_admin')) {
      const s = db.users.find(x => x.id === seg[3] && x.hospitalId === seg[1]);
      if (!s) return send(res, 404, { error: 'Not found' });
      s.active = false; logAct(u, 'Removed staff', s.name); save(); return send(res, 200, { ok: true });
    }
  }

  // ---------- blood banks ----------
  if (seg[0] === 'bloodbanks') {
    if (method === 'GET') return send(res, 200, db.bloodBanks.map(b => ({ ...b, inventory: undefined })));
    if (method === 'POST' && canSee(u, 'super_admin')) {
      const b = await readBody(req);
      const nb = { id: id('BB'), name: b.name, city: b.city, address: b.address || '', phone: b.phone || '', lat: 28.61, lng: 77.2, verified: false, code: 'BB' + Math.random().toString(36).slice(2, 6).toUpperCase(), available: true, inventory: {}, createdAt: Date.now() };
      GROUPS.forEach(g => nb.inventory[g] = { units: 0, expiry: '', updatedAt: Date.now() });
      db.bloodBanks.push(nb); logAct(u, 'Added blood bank', nb.name); save(); return send(res, 201, { bloodBank: nb });
    }
    if (seg[1] && method === 'PATCH') {
      const b = await readBody(req);
      const bb = db.bloodBanks.find(x => x.id === seg[1]);
      if (!bb) return send(res, 404, { error: 'Not found' });
      const isOwn = u.bloodBankId === bb.id && canSee(u, 'blood_bank_staff', 'blood_bank_admin');
      if (!isOwn && !canSee(u, 'super_admin')) return send(res, 403, { error: 'Forbidden' });
      if (isOwn && !canSee(u, 'super_admin')) {
        // own bank staff/admin may only toggle availability
        if (b.available !== undefined) bb.available = !!b.available;
        logAct(u, 'Toggled availability', bb.name + ' → ' + (bb.available ? 'OPEN' : 'CLOSED'));
        save(); return send(res, 200, { bloodBank: { ...bb, inventory: undefined } });
      }
      const wasVerified = bb.verified;
      Object.assign(bb, b);
      if (b.verified && !wasVerified) db.users.filter(x => x.bloodBankId === bb.id).forEach(x => notify(x.id, 'Blood bank verified ✅', bb.name + ' is now live on LifeLink', 'verify'));
      logAct(u, b.verified !== undefined ? (b.verified ? 'Verified blood bank' : 'De-verified blood bank') : 'Edited blood bank', bb.name); save();
      return send(res, 200, { bloodBank: { ...bb, inventory: undefined } });
    }
    if (seg[1] && seg[2] === 'inventory' && method === 'GET') {
      const bb = db.bloodBanks.find(x => x.id === seg[1]);
      if (!bb) return send(res, 404, { error: 'Not found' });
      return send(res, 200, bb.inventory);
    }
    if (seg[1] && seg[2] === 'inventory' && method === 'PATCH') {
      const bb = db.bloodBanks.find(x => x.id === seg[1]);
      if (!bb) return send(res, 404, { error: 'Not found' });
      const isOwn = u.bloodBankId === bb.id && canSee(u, 'blood_bank_staff', 'blood_bank_admin');
      if (!isOwn && !canSee(u, 'super_admin')) return send(res, 403, { error: 'Forbidden' });
      const b = await readBody(req);
      if (!bb.inventory[b.bloodGroup]) bb.inventory[b.bloodGroup] = { units: 0, expiry: '', updatedAt: Date.now() };
      const slot = bb.inventory[b.bloodGroup];
      if (b.mode === 'set') slot.units = Math.max(0, Number(b.units) || 0);
      else slot.units = Math.max(0, slot.units + (Number(b.delta) || 0));
      if (b.expiry) slot.expiry = b.expiry;
      slot.updatedAt = Date.now();
      logAct(u, 'Updated inventory', b.bloodGroup + ' → ' + slot.units + ' units');
      if (slot.units <= 3 && isOwn) db.users.filter(x => x.bloodBankId === bb.id && x.role === 'blood_bank_admin').forEach(a => notify(a.id, 'Low stock: ' + b.bloodGroup, 'Only ' + slot.units + ' units left at ' + bb.name, 'stock'));
      save(); return send(res, 200, { inventory: bb.inventory });
    }
    if (seg[1] && seg[2] === 'staff' && method === 'GET' && canSee(u, 'blood_bank_admin', 'super_admin'))
      return send(res, 200, db.users.filter(x => x.bloodBankId === seg[1]).map(pub));
    if (seg[1] && seg[2] === 'staff' && method === 'POST' && canSee(u, 'blood_bank_admin', 'super_admin')) {
      const b = await readBody(req);
      if (db.users.some(x => x.email.toLowerCase() === (b.email || '').toLowerCase())) return send(res, 409, { error: 'Email exists' });
      const nu = { id: id('U'), name: b.name, email: b.email.toLowerCase(), password: hash(b.password || 'staff123'), role: b.role === 'blood_bank_admin' ? 'blood_bank_admin' : 'blood_bank_staff', phone: b.phone || '', bloodGroup: '', city: b.city || '', availability: 'available', verified: true, active: true, hospitalId: null, bloodBankId: seg[1], location: null, privacy: { showPhone: false, showProfile: true, showHistory: true, discoverable: true }, stats: { responded: 0, accepted: 0, completed: 0, onTime: 0, missed: 0 }, patients: [], createdAt: Date.now() };
      db.users.push(nu); logAct(u, 'Added blood bank staff', nu.name); save();
      return send(res, 201, { user: pub(nu) });
    }
    if (seg[1] && seg[2] === 'staff' && seg[3] && method === 'DELETE' && canSee(u, 'blood_bank_admin', 'super_admin')) {
      const s = db.users.find(x => x.id === seg[3] && x.bloodBankId === seg[1]);
      if (!s) return send(res, 404, { error: 'Not found' });
      s.active = false; logAct(u, 'Removed staff', s.name); save(); return send(res, 200, { ok: true });
    }
  }

  // ---------- users (super admin) ----------
  if (seg[0] === 'users') {
    if (!canSee(u, 'super_admin')) return send(res, 403, { error: 'Super admin only' });
    if (method === 'GET') {
      let list = db.users;
      if (query.role) list = list.filter(x => x.role === query.role);
      if (query.q) list = list.filter(x => (x.name + x.email + x.city).toLowerCase().includes(query.q.toLowerCase()));
      return send(res, 200, list.map(pub));
    }
    if (seg[1] && method === 'PATCH') {
      const b = await readBody(req);
      const t = db.users.find(x => x.id === seg[1]);
      if (!t) return send(res, 404, { error: 'Not found' });
      if (b.password) t.password = hash(b.password);
      ['name', 'phone', 'city', 'bloodGroup', 'active', 'verified', 'role', 'availability'].forEach(k => { if (b[k] !== undefined) t[k] = b[k]; });
      logAct(u, 'Updated user', t.name + ' (' + t.email + ')'); save();
      return send(res, 200, { user: pub(t) });
    }
    if (seg[1] && method === 'DELETE') {
      const t = db.users.find(x => x.id === seg[1]);
      if (!t) return send(res, 404, { error: 'Not found' });
      if (t.id === u.id) return send(res, 400, { error: 'Cannot delete yourself' });
      t.active = false; logAct(u, 'Deactivated user', t.name); save(); return send(res, 200, { ok: true });
    }
  }

  // ---------- donor medical verification queue (super admin) ----------
  if (seg[0] === 'donor-verifications') {
    if (!canSee(u, 'super_admin')) return send(res, 403, { error: 'Super admin only' });
    if (method === 'GET') {
      const list = db.users.filter(x => x.role === 'donor').map(x => ({ ...pub(x), medical: x.medical || null }));
      return send(res, 200, list);
    }
    if (seg[1] && method === 'POST') {
      const b = await readBody(req);
      const d = db.users.find(x => x.id === seg[1] && x.role === 'donor');
      if (!d) return send(res, 404, { error: 'Donor not found' });
      if (!d.medical || d.medical.status !== 'pending') return send(res, 400, { error: 'No pending medical submission for this donor' });
      const note = String(b.note || '').slice(0, 400);
      if (b.action === 'approve') {
        d.verified = true;
        Object.assign(d.medical, { status: 'approved', reviewNote: note || 'Meets donor eligibility criteria', reviewedBy: u.name, reviewedAt: Date.now() });
        notify(d.id, 'Medical verification approved ✅', 'You are now a verified LifeLink donor — the verification bonus is applied to your trust score.', 'verify');
        logAct(u, 'Verified donor medical', d.name + ' (' + d.email + ')');
      } else if (b.action === 'reject') {
        d.verified = false;
        Object.assign(d.medical, { status: 'rejected', reviewNote: note || 'Did not meet eligibility criteria', reviewedBy: u.name, reviewedAt: Date.now() });
        notify(d.id, 'Medical verification deferred ❌', (note || 'Did not meet eligibility criteria') + ' — update your medical form and reapply.', 'verify');
        logAct(u, 'Deferred donor medical', d.name + ' (' + d.email + ')');
      } else return send(res, 400, { error: 'action must be approve or reject' });
      save();
      return send(res, 200, { medical: d.medical, verified: d.verified, trust: trustScore(d) });
    }
  }

  // ---------- profile ----------
  if (seg[0] === 'profile') {
    if (method === 'POST' && seg[1] === 'patients') {
      if (!canSee(u, 'family', 'patient')) return send(res, 403, { error: 'Only family/patient can add patients' });
      const b = await readBody(req);
      const p = b.patient || {};
      if (!p.name) return send(res, 400, { error: 'Patient name required' });
      u.patients = u.patients || [];
      p.id = p.id || id('P');
      u.patients.push(p);
      save(); return send(res, 201, { patients: u.patients });
    }
    if (method === 'DELETE' && seg[1] === 'patients' && seg[2]) {
      u.patients = (u.patients || []).filter(p => p.id !== seg[2]);
      save(); return send(res, 200, { patients: u.patients });
    }
    if (method === 'PATCH') {
      const b = await readBody(req);
      ['name', 'phone', 'city', 'bloodGroup'].forEach(k => { if (b[k] !== undefined) u[k] = b[k]; });
      if (b.password) u.password = hash(b.password);
      save(); return send(res, 200, { user: pub(u) });
    }
  }

  // ---------- AI prediction ----------
  if (seg[0] === 'predict' && method === 'GET') {
    return send(res, 200, predictDemand());
  }

  // ---------- emergency ----------
  if (seg[0] === 'emergency') {
    if (method === 'GET') return send(res, 200, (db.emergency || []).slice(0, 20));
    if (method === 'POST') {
      const b = await readBody(req);
      if (!b.bloodGroup) return send(res, 400, { error: 'bloodGroup required' });
      const er = emergencyBroadcast({ ...b, requesterId: u.id });
      logAct(u, 'Emergency broadcast', b.bloodGroup + ' @ ' + (b.city || u.city));
      save(); return send(res, 201, { emergency: er });
    }
    if (seg[1] && seg[2] === 'accept' && method === 'POST') {
      const er = (db.emergency || []).find(x => x.id === seg[1]);
      if (!er) return send(res, 404, { error: 'Not found' });
      if (!er.accepted.includes(u.id)) er.accepted.push(u.id);
      notify(er.requesterId, 'Emergency accepted 🙏', u.name + ' (' + u.bloodGroup + ') is coming to help!', 'emergency');
      save(); return send(res, 200, { emergency: er });
    }
    if (seg[1] && seg[2] === 'resolve' && method === 'POST') {
      const er = (db.emergency || []).find(x => x.id === seg[1]);
      if (!er) return send(res, 404, { error: 'Not found' });
      er.status = 'resolved'; save(); return send(res, 200, { emergency: er });
    }
  }

  // ---------- complaints ----------
  if (seg[0] === 'complaints') {
    if (method === 'GET' && canSee(u, 'super_admin')) return send(res, 200, db.complaints);
    if (method === 'POST') {
      const b = await readBody(req);
      const c = { id: id('C'), userId: u.id, against: b.agAgainst || b.against || 'Platform', message: b.message, status: 'open', at: Date.now() };
      db.complaints.unshift(c); save(); return send(res, 201, { complaint: c });
    }
    if (seg[1] && method === 'PATCH' && canSee(u, 'super_admin')) {
      const b = await readBody(req);
      const c = db.complaints.find(x => x.id === seg[1]);
      if (!c) return send(res, 404, { error: 'Not found' });
      c.status = b.status || c.status; save(); return send(res, 200, { complaint: c });
    }
  }

  // ---------- system / audit ----------
  if (seg[0] === 'system') {
    if (!canSee(u, 'super_admin')) return send(res, 403, { error: 'Super admin only' });
    if (seg[1] === 'logs' && method === 'GET') return send(res, 200, db.logs.slice(0, 100));
    if (seg[1] === 'reset' && method === 'POST') {
      db = createSeed(); save(); return send(res, 200, { ok: true, message: 'Demo data reset' });
    }
    if (seg[1] === 'sync' && method === 'POST') {
      db.meta.syncAt = Date.now(); save(); return send(res, 200, { syncAt: db.meta.syncAt });
    }
  }

  // ---------- analytics ----------
  if (seg[0] === 'analytics' && method === 'GET') {
    const now3 = Date.now(), day = 864e5;
    const byDay = Array.from({ length: 14 }, (_, i) => {
      const start = now3 - (13 - i) * day;
      const end = start + day;
      return {
        day: new Date(start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        requests: db.requests.filter(r => r.createdAt >= start && r.createdAt < end).length,
        donations: db.donations.filter(d => d.date >= start && d.date < end).length
      };
    });
    const byGroup = GROUPS.map(g => ({ group: g, requests: db.requests.filter(r => r.bloodGroup === g).length }));
    const byStatus = ['new', 'pending', 'verified', 'coordinating', 'completed', 'cancelled'].map(s => ({ status: s, count: db.requests.filter(r => r.status === s).length }));
    return send(res, 200, { byDay, byGroup, byStatus, prediction: predictDemand() });
  }

  return send(res, 404, { error: 'Unknown API route' });
}

function pub(u) {
  const { password, ...rest } = u;
  rest.trust = trustScore(u);
  return rest;
}

/* ---------------- static files ---------------- */
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serveStatic(req, res, pathname) {
  let p = pathname === '/' ? '/index.html' : pathname;
  if (p === '/app') p = '/app.html';
  const file = path.join(PUBLIC, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA fallback to index for unknown paths (except /app)
      return fs.readFile(path.join(PUBLIC, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); return res.end('Not Found'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d2);
      });
    }
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  db.meta.apiCalls = (db.meta.apiCalls || 0) + 1;
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams);
    if (pathname.startsWith('/api/')) {
      await api(req, res, pathname, query);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, pathname);
    } else {
      send(res, 405, { error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('[LifeLink] error:', err);
    if (!res.headersSent) send(res, 500, { error: 'Internal server error' });
    else try { res.end(); } catch (e) {}
  }
});

server.listen(PORT, () => {
  console.log('\n  ❤  LifeLink Blood Donation Network');
  console.log('  → http://localhost:' + PORT);
  console.log('  → Demo logins: superadmin@lifelink.in/admin123, donor@demo.in/donor123,\n' +
              '     patient@demo.in/patient123, family@demo.in/family123, staff@demo.in/staff123,\n' +
              '     hadmin@demo.in/admin123, bstaff@demo.in/staff123, badmin@demo.in/admin123\n');
});
