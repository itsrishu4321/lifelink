/* LifeLink — Seed Data Generator (deterministic) */
const crypto = require('crypto');
const pw = (plain) => crypto.createHash('sha256').update('lifelink::' + plain).digest('hex');

function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const CITIES = {
  Delhi: { lat: 28.6139, lng: 77.209 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Chennai: { lat: 13.0827, lng: 80.2707 }
};

function inventory(base) {
  const exp = new Date(Date.now() + 38 * 864e5).toISOString().slice(0, 10);
  const inv = {};
  GROUPS.forEach((g, i) => {
    inv[g] = { units: base[i], expiry: exp, updatedAt: Date.now() };
  });
  return inv;
}

function createSeed() {
  const rnd = lcg(20261122);
  const now = Date.now();
  const day = 864e5;
  const ts = (d) => now - d * day;

  const hospitals = [
    { id: 'H1', name: 'AIIMS New Delhi', city: 'Delhi', address: 'Sri Aurobindo Marg, New Delhi', phone: '011-26588500', lat: 28.5672, lng: 77.21, verified: true, code: 'HOSP1', createdAt: ts(400) },
    { id: 'H2', name: 'KEM Hospital', city: 'Mumbai', address: 'Acharya Donde Marg, Parel, Mumbai', phone: '022-24107000', lat: 19.0027, lng: 72.8417, verified: true, code: 'HOSP2', createdAt: ts(360) },
    { id: 'H3', name: 'Apollo Fortis Hospital', city: 'Chennai', address: 'Anna Nagar, Chennai', phone: '044-26212222', lat: 13.0827, lng: 80.2707, verified: false, code: 'HOSP3', createdAt: ts(3) }
  ];

  const bloodBanks = [
    { id: 'BB1', name: 'Indian Red Cross – Delhi', city: 'Delhi', address: 'Red Cross Road, New Delhi', phone: '011-23359000', lat: 28.6236, lng: 77.215, verified: true, code: 'BB1', available: true, inventory: inventory([46, 9, 38, 7, 31, 6, 13, 4]), createdAt: ts(390) },
    { id: 'BB2', name: 'LifeLine Blood Bank', city: 'Mumbai', address: 'Dadar West, Mumbai', phone: '022-24451234', lat: 19.0176, lng: 72.844, verified: true, code: 'BB2', available: true, inventory: inventory([52, 6, 29, 9, 35, 8, 11, 3]), createdAt: ts(350) },
    { id: 'BB3', name: 'Chennai Blood Centre', city: 'Chennai', address: 'T. Nagar, Chennai', phone: '044-28340000', lat: 13.0418, lng: 80.2341, verified: false, code: 'BB3', available: true, inventory: inventory([21, 3, 18, 4, 15, 3, 6, 2]), createdAt: ts(2) }
  ];

  const mk = (o) => Object.assign({
    phone: '', bloodGroup: '', availability: 'available', verified: true,
    location: null, privacy: { showPhone: false, showProfile: true, showHistory: true, discoverable: true },
    stats: { responded: 0, accepted: 0, completed: 0, onTime: 0, missed: 0 },
    active: true, createdAt: now - 200 * day
  }, o);

  const medOk = (o) => Object.assign({
    height: 170, weight: 65, hb: 14.0, lastDonation: null,
    test: { name: 'Full screening (HIV, HBsAg, HCV, VDRL)', date: new Date(now - 20 * day).toISOString().slice(0, 10), result: 'Negative' },
    answers: { well: 'yes', recentIllness: 'no', bodyMod: 'no', chronic: 'no', medication: 'no', risk: 'no', infectious: 'Negative' },
    flags: [], verdict: 'eligible', status: 'approved',
    submittedAt: now - 20 * day, reviewNote: 'Verified at LifeLink blood camp', reviewedBy: 'LifeLink Super Admin', reviewedAt: now - 19 * day
  }, o);

  const users = [
    mk({ id: 'U1', name: 'LifeLink Super Admin', email: 'superadmin@lifelink.in', password: pw('admin123'), role: 'super_admin', phone: '9000000001', city: 'Delhi' }),
    mk({ id: 'U2', name: 'Rahul Verma', email: 'donor@demo.in', password: pw('donor123'), role: 'donor', bloodGroup: 'O+', phone: '9811011011', city: 'Delhi', location: { ...CITIES.Delhi, radius: 25 }, stats: { responded: 14, accepted: 11, completed: 9, onTime: 9, missed: 1 }, verified: true,
      medical: medOk({ height: 176, weight: 72, hb: 15.2, lastDonation: new Date(now - 110 * day).toISOString().slice(0, 10), submittedAt: now - 20 * day, reviewedAt: now - 19 * day }) }),
    mk({ id: 'U3', name: 'Priya Sharma', email: 'priya@demo.in', password: pw('donor123'), role: 'donor', bloodGroup: 'A+', phone: '9822022022', city: 'Mumbai', location: { ...CITIES.Mumbai, radius: 20 }, stats: { responded: 8, accepted: 6, completed: 5, onTime: 5, missed: 0 }, verified: false,
      medical: {
        height: 152, weight: 47, hb: 11.4, lastDonation: null,
        test: { name: 'Full screening (HIV, HBsAg, HCV, VDRL)', date: new Date(now - 10 * day).toISOString().slice(0, 10), result: 'Pending' },
        answers: { well: 'yes', recentIllness: 'no', bodyMod: 'yes', chronic: 'no', medication: 'no', risk: 'no', infectious: 'Pending' },
        flags: ['Weight 47 kg — minimum 50 kg required', 'Haemoglobin 11.4 g/dL — minimum 12.5 g/dL required', 'Tattoo / piercing / surgery / transfusion in last 6 months', 'Infectious screening not cleared (Pending)'],
        verdict: 'deferred', status: 'rejected', submittedAt: now - 9 * day,
        reviewNote: 'Weight & Hb below cut-off — reapply after 3 months with a fresh screening report', reviewedBy: 'LifeLink Super Admin', reviewedAt: now - 8 * day
      } }),
    mk({ id: 'U4', name: 'Amit Kumar', email: 'amit@demo.in', password: pw('donor123'), role: 'donor', bloodGroup: 'B+', phone: '9833033033', city: 'Delhi', location: { ...CITIES.Delhi, radius: 30 }, stats: { responded: 5, accepted: 3, completed: 2, onTime: 1, missed: 1 }, verified: false,
      medical: {
        height: 168, weight: 64, hb: 13.2, lastDonation: new Date(now - 40 * day).toISOString().slice(0, 10),
        test: { name: 'Full screening (HIV, HBsAg, HCV, VDRL)', date: new Date(now - 6 * day).toISOString().slice(0, 10), result: 'Negative' },
        answers: { well: 'yes', recentIllness: 'no', bodyMod: 'no', chronic: 'yes', medication: 'no', risk: 'no', infectious: 'Negative' },
        flags: ['Last donation 40 day(s) ago — 84-day gap required', 'Chronic condition declared — physician review needed'],
        verdict: 'deferred', status: 'pending', submittedAt: now - 5 * 36e5,
        reviewNote: '', reviewedBy: null, reviewedAt: null
      } }),
    mk({ id: 'U5', name: 'Sana Fathima', email: 'sana@demo.in', password: pw('donor123'), role: 'donor', bloodGroup: 'O-', phone: '9844044044', city: 'Delhi', location: { ...CITIES.Delhi, radius: 40 }, stats: { responded: 6, accepted: 5, completed: 5, onTime: 5, missed: 0 },
      medical: medOk({ height: 161, weight: 57, hb: 13.4, lastDonation: new Date(now - 140 * day).toISOString().slice(0, 10), submittedAt: now - 30 * day, reviewedAt: now - 29 * day }) }),
    mk({ id: 'U6', name: 'Vikram Singh', email: 'vikram@demo.in', password: pw('donor123'), role: 'donor', bloodGroup: 'AB+', phone: '9855055055', city: 'Mumbai', location: { ...CITIES.Mumbai, radius: 15 }, stats: { responded: 3, accepted: 1, completed: 1, onTime: 1, missed: 0 }, verified: false,
      medical: medOk({ height: 181, weight: 77, hb: 15.6, status: 'pending', reviewNote: '', reviewedBy: null, reviewedAt: null, submittedAt: now - 2 * 36e5, test: { name: 'Full screening (HIV, HBsAg, HCV, VDRL)', date: new Date(now - 4 * day).toISOString().slice(0, 10), result: 'Negative' } }) }),
    mk({ id: 'U7', name: 'Deepa Nair', email: 'deepa@demo.in', password: pw('donor123'), role: 'donor', bloodGroup: 'A-', phone: '9866066066', city: 'Chennai', location: { ...CITIES.Chennai, radius: 25 }, stats: { responded: 4, accepted: 4, completed: 3, onTime: 3, missed: 0 },
      medical: medOk({ height: 158, weight: 55, hb: 12.9, lastDonation: new Date(now - 95 * day).toISOString().slice(0, 10), submittedAt: now - 40 * day, reviewedAt: now - 39 * day }) }),
    mk({ id: 'U10', name: 'Rohan Mehta', email: 'patient@demo.in', password: pw('patient123'), role: 'patient', phone: '9711071107', city: 'Delhi' }),
    mk({ id: 'U11', name: 'Sunita Devi', email: 'family@demo.in', password: pw('family123'), role: 'family', phone: '9722072207', city: 'Delhi', patients: [{ id: 'P1', name: 'Rohan Mehta (Son)', age: 28, gender: 'Male', bloodGroup: 'B+', phone: '9711071107', condition: 'Surgery – pre-op transfusion' }] }),
    mk({ id: 'U20', name: 'Neha Gupta', email: 'staff@demo.in', password: pw('staff123'), role: 'hospital_staff', hospitalId: 'H1', phone: '9733073307', city: 'Delhi', designation: 'Ward Coordinator' }),
    mk({ id: 'U21', name: 'Dr. Arjun Rao', email: 'hadmin@demo.in', password: pw('admin123'), role: 'hospital_admin', hospitalId: 'H1', phone: '9744074407', city: 'Delhi', designation: 'Blood Bank Officer' }),
    mk({ id: 'U30', name: 'Kiran Joshi', email: 'bstaff@demo.in', password: pw('staff123'), role: 'blood_bank_staff', bloodBankId: 'BB1', phone: '9755075507', city: 'Delhi', designation: 'Technician' }),
    mk({ id: 'U31', name: 'Dr. Meera Iyer', email: 'badmin@demo.in', password: pw('admin123'), role: 'blood_bank_admin', bloodBankId: 'BB1', phone: '9766076606', city: 'Delhi', designation: 'Chief Blood Bank Officer' })
  ];

  // ---- historical blood requests (60 days) for AI forecasting ----
  const statusPool = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'cancelled', 'verified', 'coordinating', 'pending', 'new', 'new'];
  const names = ['Aarav Patel', 'Ishita Rao', 'Kabir Malhotra', 'Ananya Bose', 'Ravi Yadav', 'Sneha Kulkarni', 'Farhan Qureshi', 'Divya Menon', 'Manish Tiwari', 'Pooja Sinha', 'Aditya Ghosh', 'Ritu Chauhan'];
  const conditions = ['Road accident trauma', 'Surgery – pre-op', 'Anaemia / Thalassemia', 'Cancer chemotherapy', 'Post-delivery haemorrhage', 'Kidney failure dialysis', 'Burns treatment', 'Liver transplant workup'];
  const requests = [];
  const donations = [];
  const donorPool = ['U2', 'U3', 'U4', 'U5', 'U6', 'U7'];
  const patientNames = users.filter(u => ['patient', 'family'].includes(u.role));

  for (let i = 0; i < 46; i++) {
    // bias: recency & weekend demand higher
    const age = Math.floor(Math.pow(rnd(), 1.6) * 58);
    const dow = new Date(ts(age)).getDay();
    const weekendBoost = (dow === 0 || dow === 6) ? 0.25 : 0;
    if (rnd() > 0.78 - weekendBoost) continue;

    const g = GROUPS[Math.floor(rnd() * GROUPS.length)];
    const recent = age < 7;
    let status = recent ? ['new', 'pending', 'verified', 'coordinating', 'completed'][Math.floor(rnd() * 5)]
      : statusPool[Math.floor(rnd() * statusPool.length)];
    const h = hospitals[Math.floor(rnd() * 2)]; // only verified hospitals get history
    const reqBy = rnd() < 0.45 ? patientNames[Math.floor(rnd() * patientNames.length)] : null;
    const requesterId = reqBy ? reqBy.id : 'U20';
    const requesterRole = reqBy ? reqBy.role : 'hospital_staff';
    const units = 1 + Math.floor(rnd() * 3);
    const created = ts(age + rnd());

    const r = {
      id: 'R' + (1000 + i),
      requesterId, requesterRole,
      patientName: reqBy ? (reqBy.patients ? reqBy.patients[0].name : reqBy.name) : names[i % names.length],
      patientAge: 18 + Math.floor(rnd() * 50),
      gender: rnd() < 0.5 ? 'Male' : 'Female',
      bloodGroup: g, units,
      hospitalId: h.id, hospitalName: h.name, city: h.city, address: h.address,
      contactPhone: reqBy ? reqBy.phone : '9800000000',
      condition: conditions[i % conditions.length],
      urgency: rnd() < 0.22 ? 'critical' : 'normal',
      status,
      assignedTo: rnd() < 0.5 ? 'U20' : null,
      responses: [],
      timeline: [{ status: 'new', at: created, by: requesterId, note: 'Request created' }],
      createdAt: created,
      updatedAt: created
    };

    const responders = donorPool.filter(() => rnd() < 0.35).slice(0, 3);
    responders.forEach(did => {
      const accepted = rnd() < 0.75;
      r.responses.push({ donorId: did, status: accepted ? 'accepted' : 'declined', at: created + 36e5 });
      if (accepted && ['verified', 'coordinating', 'completed'].includes(status)) {
        r.timeline.push({ status: 'donor_accepted', at: created + 36e5, by: did, note: 'Donor accepted' });
      }
    });

    if (status === 'completed') {
      r.issued = { units, bloodBankId: rnd() < 0.6 ? 'BB1' : 'BB2', at: created + 6 * 36e5 };
      r.timeline.push({ status: 'completed', at: created + 6 * 36e5, by: 'U20', note: 'Blood issued & transfusion completed' });
      const acc = r.responses.filter(x => x.status === 'accepted').map(x => x.donorId);
      acc.slice(0, 1).forEach(did => {
        donations.push({
          id: 'D' + (5000 + donations.length), donorId: did, requestId: r.id,
          bloodGroup: g, units: 1, hospitalName: h.name, city: h.city,
          date: created + 7 * 36e5, verified: true,
          certificateId: 'LL-CERT-' + (5000 + donations.length)
        });
      });
    }
    if (status === 'cancelled') {
      r.timeline.push({ status: 'cancelled', at: created + 2 * 36e5, by: requesterId, note: 'Cancelled by requester' });
    }
    requests.push(r);
  }

  // one live, fresh request so dashboards are not empty
  requests.push({
    id: 'R2001', requesterId: 'U10', requesterRole: 'patient',
    patientName: 'Rohan Mehta', patientAge: 28, gender: 'Male',
    bloodGroup: 'B+', units: 2,
    hospitalId: 'H1', hospitalName: 'AIIMS New Delhi', city: 'Delhi',
    address: 'Sri Aurobindo Marg, New Delhi', contactPhone: '9711071107',
    condition: 'Surgery – pre-op transfusion', urgency: 'critical',
    status: 'verified', assignedTo: 'U20',
    responses: [{ donorId: 'U4', status: 'accepted', at: now - 40 * 6e4 }],
    timeline: [
      { status: 'new', at: now - 3 * 36e5, by: 'U10', note: 'Request created' },
      { status: 'pending', at: now - 2.5 * 36e5, by: 'U20', note: 'Hospital staff reviewed' },
      { status: 'verified', at: now - 2 * 36e5, by: 'U20', note: 'Verified with hospital records' },
      { status: 'donor_accepted', at: now - 40 * 6e4, by: 'U4', note: 'Donor accepted' }
    ],
    createdAt: now - 3 * 36e5, updatedAt: now - 40 * 6e4
  });

  const notifications = [
    { id: 'N1', userId: 'U2', title: 'New B+ request nearby', body: 'AIIMS New Delhi needs 2 units of B+ — 4.2 km away.', type: 'request', read: false, at: now - 35 * 6e4 },
    { id: 'N2', userId: 'U2', title: 'Trust score improved', body: 'Your reliability score crossed 85. Great going!', type: 'trust', read: false, at: now - 2 * day },
    { id: 'N3', userId: 'U10', title: 'Donor accepted your request', body: 'Amit Kumar (B+) accepted your blood request.', type: 'response', read: false, at: now - 40 * 6e4 },
    { id: 'N4', userId: 'U1', title: 'Hospital pending verification', body: 'Apollo Fortis Hospital (Chennai) is awaiting approval.', type: 'verify', read: false, at: now - 3 * day },
    { id: 'N5', userId: 'U31', title: 'Low stock alert: AB-', body: 'AB- stock at Red Cross Delhi is below safety level (4 units).', type: 'stock', read: false, at: now - 5 * 36e5 },
    { id: 'N6', userId: 'U20', title: 'New verified request', body: 'R2001 (B+, 2 units) verified and ready for donor coordination.', type: 'request', read: false, at: now - 2 * 36e5 }
  ];

  const complaints = [
    { id: 'C1', userId: 'U10', against: 'Donor U6', message: 'Donor did not pick up the call twice.', status: 'open', at: now - 2 * day },
    { id: 'C2', userId: 'U2', against: 'Requester U11', message: 'Request details were incomplete.', status: 'resolved', at: now - 9 * day }
  ];

  const logs = [
    { id: 'L1', actorId: 'U1', actorName: 'LifeLink Super Admin', role: 'super_admin', action: 'Approved blood bank', target: 'LifeLine Blood Bank (BB2)', at: now - 12 * day },
    { id: 'L2', actorId: 'U21', actorName: 'Dr. Arjun Rao', role: 'hospital_admin', action: 'Added staff', target: 'Neha Gupta (hospital_staff)', at: now - 20 * day },
    { id: 'L3', actorId: 'U31', actorName: 'Dr. Meera Iyer', role: 'blood_bank_admin', action: 'Updated inventory', target: 'O+ → +10 units', at: now - 6 * 36e5 },
    { id: 'L4', actorId: 'U1', actorName: 'LifeLink Super Admin', role: 'super_admin', action: 'Rejected hospital', target: 'City Care Clinic (fake docs)', at: now - 30 * day },
    { id: 'L5', actorId: 'U30', actorName: 'Kiran Joshi', role: 'blood_bank_staff', action: 'Issued blood', target: 'R1004 → 2 units O+', at: now - 4 * day }
  ];

  const issues = [
    { id: 'I1', bloodBankId: 'BB1', requestId: 'R1004', bloodGroup: 'O+', units: 2, hospitalName: 'AIIMS New Delhi', by: 'U30', at: now - 4 * day },
    { id: 'I2', bloodBankId: 'BB1', requestId: 'R1007', bloodGroup: 'A+', units: 1, hospitalName: 'KEM Hospital', by: 'U30', at: now - 8 * day },
    { id: 'I3', bloodBankId: 'BB2', requestId: 'R1011', bloodGroup: 'B-', units: 2, hospitalName: 'KEM Hospital', by: 'U30', at: now - 11 * day }
  ];

  return {
    meta: { version: 1, createdAt: now, apiCalls: 1284, syncAt: now - 4 * 6e4, syncSource: 'eRaktKosh (simulated)' },
    users, hospitals, bloodBanks, requests, donations, notifications, complaints, logs, issues,
    sessions: {}
  };
}

module.exports = { createSeed, GROUPS, CITIES };
