# 🩸 LifeLink — Blood Donation Network

A role-based blood donation management platform connecting **donors, patients, families, hospitals and blood banks** — with 8 purpose-built dashboards, an AI demand engine and an emergency broadcast network.

## ✨ Key Features

| Feature | What it does |
|---|---|
| 🤖 **App ↔ Software Integration** | One REST API powers the donor app, hospital software and blood-bank software |
| 🧠 **AI Demand Prediction** | 7-day forecast per blood group with risk level, gap analysis & hotspot detection |
| ⭐ **Donor Trust Score** | 0–100 reliability score from response rate, show-up, punctuality, consistency, experience & verification |
| 🚨 **Emergency Mode** | One tap broadcasts a live alert to every compatible, available donor in the city |
| 🩺 **Medical Verification** | Vitals + health questionnaire → instant auto-eligibility check → Super Admin approval queue |

## 👥 8 Role-based Dashboards

Donor · Patient · Family/Attendant · Hospital Staff · Hospital Admin · Blood Bank Staff · Blood Bank Admin · Super Admin

Each role gets its own scoped menu, data and permissions — written server-side, not just hidden in the UI.

## 🚀 Run it (zero dependencies)

```bash
node server.js
# → http://localhost:3000
```

No npm install needed — built only on Node.js built-ins (`http`, `crypto`, `fs`).

## 🔑 Demo logins

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@lifelink.in` | `admin123` |
| Donor | `donor@demo.in` | `donor123` |
| Patient | `patient@demo.in` | `patient123` |
| Family | `family@demo.in` | `family123` |
| Hospital Staff | `staff@demo.in` | `staff123` |
| Hospital Admin | `hadmin@demo.in` | `admin123` |
| Blood Bank Staff | `bstaff@demo.in` | `staff123` |
| Blood Bank Admin | `badmin@demo.in` | `admin123` |

> Staff/admin registration invite code: `LIFELINK2026`

## 📁 Project structure

```
lifelink/
├── server.js          # API server (auth, requests, trust, AI, emergency, verification)
├── data.js            # Deterministic demo seed
├── db.json            # Live data store (auto-created, git-ignored)
└── public/
    ├── index.html     # Landing page + auth
    ├── app.html       # Dashboard shell
    ├── css/           # style.css (landing) + app.css (dashboard)
    └── js/
        ├── app.js                 # menus, router, notifications, emergency
        ├── pages-donor-patient.js # donor + patient pages
        ├── pages-family-hospital.js
        └── pages-bank-super.js    # blood bank + super admin + integration hub
```

## 🔒 How donor verification works

1. Donor submits **vitals** (height/weight/haemoglobin), last-donation date, infectious-disease screening & a 7-question health questionnaire
2. Engine runs an **instant auto-check**: `140 cm · 50 kg · 12.5 g/dL · 84-day gap · no red flags`
3. Super Admin reviews the full summary in the **verification queue** → Approve (donor gets verified + trust bonus) or Defer with a note
4. Every decision is notified and written to the audit log
