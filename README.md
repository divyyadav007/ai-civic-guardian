# 🏛️ AI Civic Guardian

> **Smart, AI-Powered Civic Grievance Detection, Localization, and Redressal System**  
> *Empowering citizens with automated image classification and geocoding, backed by a strict Human-in-the-Loop review gate and real-time municipal routing.*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/Web%20Portal-React%2018%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native%20(Expo%2052)-000020.svg?style=flat&logo=expo)](https://expo.dev)
[![ONNX Runtime](https://img.shields.io/badge/AI%20Inference-MobileNetV2%20ONNX-005CED.svg?style=flat&logo=onnx)](https://onnxruntime.ai)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Key Highlights & Differentiators

1. **🛡️ Strict Human-in-the-Loop Review Gate (`RULES.md` §3.3)**:
   - AI drafts the grievance, estimates confidence, and suggests categories, but **never auto-submits**.
   - Citizens must explicitly verify and approve before the complaint is routed to municipal authorities, eliminating false alarms.
2. **🧠 Real, Edge-Optimized Computer Vision AI**:
   - Calibrated **MobileNetV2 ONNX model** (`mobilenet-v2-civic-v1.0`) running locally on CPU in **<2ms latency**.
   - Detects 4 municipal categories: **Pothole**, **Garbage Dump**, **Water Leakage**, and **Broken Streetlight**.
3. **🌐 Zero-Friction Dual-Platform Access**:
   - **Public Web Portal (`/`)**: Anyone can scan a QR code or visit from mobile/desktop browser and submit an issue in 15 seconds without forced registration.
   - **Mobile App (React Native / Expo)**: Dedicated native citizen app with live status push updates and camera support.
4. **🎯 Intelligent Department Routing & Deduplication**:
   - Automatically maps detected issue keys to departmental schemas (`Roads & Infrastructure`, `Sanitation & Solid Waste`, etc.).
   - Geospatial Haversine distance + text similarity engine flags duplicate reports in the same vicinity.
5. **📈 Transparent 4-Stage Redressal Stepper**:
   - Live tracking for citizens: `Submitted` ➔ `Acknowledged` ➔ `In Progress` ➔ `Resolved`.
   - Full audit history log with timestamped officer action notes.

---

## 🏗️ System Architecture

```text
                               ┌────────────────────────┐
                               │   AI CIVIC GUARDIAN    │
                               └───────────┬────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
📱 Mobile Citizen App                                              🌐 Public Citizen Web Portal
(React Native / Expo 52)                                               (React + Vite + Tailwind)
• Issue capture & presets                                          • Drag-and-drop & Camera upload
• GPS coordinate pinpoint                                          • One-click GPS geocoding
• Review & Edit Gate                                               • Review & Edit Gate
• Multi-environment switcher                                       • Public Tracking by Reference ID
         │                                                                   │
         └─────────────────────────────────┬─────────────────────────────────┘
                                           │ REST API (JSON)
                                           ▼
                            ┌─────────────────────────────┐
                            │    FastAPI Backend Server   │
                            │    (http://0.0.0.0:8000)    │
                            └──────────────┬──────────────┘
                                           │
         ┌────────────────────────┬────────┴────────┬────────────────────────┐
         ▼                        ▼                 ▼                        ▼
  🧠 Vision AI             🎙️ Audio STT       📍 Geocoding             🎯 Routing Engine
 MobileNetV2 ONNX         SpeechRecognition     Nominatim / OSM         Auto-assigns to Roads,
 (CPU inference <2ms)     + ffmpeg runner       Reverse Geocoder        Sanitation, Electrical
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │  SQLite / PostgreSQL DB     │
                            │   + Audit History Logs      │
                            └──────────────┬──────────────┘
                                           │
                                           ▼
                            👔 Municipal Officer Dashboard
                            • Departmental triage queues
                            • Work crew dispatching
                            • Resolution notes & audit log
```

---

## 📂 Repository Structure

```
├── backend/            # FastAPI Python REST API service
│   ├── app/
│   │   ├── api/        # REST endpoints (complaints, auth, departments, admin)
│   │   ├── services/   # Business logic (routing, draft synthesis, geocoding)
│   │   ├── ml/         # Real MobileNetV2 ONNX vision model & STT runners
│   │   ├── models/     # SQLAlchemy ORM models
│   │   ├── schemas/    # Pydantic v2 schemas
│   │   └── core/       # App configuration, security, JWT authentication
│   └── tests/          # 29 PyTest unit & integration tests (100% passing)
├── dashboard/          # React + Vite Web Application
│   └── src/
│       ├── pages/      # CitizenReportPage, PublicTrackPage, OfficerQueue, Admin
│       └── components/ # PublicNavbar, DashboardLayout, StatusBadge
├── mobile/             # React Native (Expo 52) Mobile Application
│   ├── App.tsx         # Full citizen mobile grievance lifecycle
│   └── src/            # Multi-target API client and network config
├── docs/               # Architecture specs, PRD, Rules, and Design guidelines
└── docker-compose.yml  # Containerized development setup
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Git**

---

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* Interactive API Documentation: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

### 3. Public Web Portal & Officer Dashboard
```bash
cd dashboard
npm install
npm run dev
```
* Public Citizen Portal: **[http://localhost:5173/](http://localhost:5173/)**
* Public Tracking: **[http://localhost:5173/track](http://localhost:5173/track)**
* Officer Login: **[http://localhost:5173/login](http://localhost:5173/login)**

---

### 4. Mobile Citizen Application (Expo)
```bash
cd mobile
npm install
npm run web   # Or: npx expo start
```
* Mobile App Web Preview: **[http://localhost:8081](http://localhost:8081)**
* Run on Phone: Scan QR code using the **Expo Go** app on iOS / Android.

---

## 🔑 Demo Credentials

| Role | Email | Password | Department |
| :--- | :--- | :--- | :--- |
| **Roads Officer** | `officer.roads@civic.gov.in` | `Officer@123` | Roads & Infrastructure |
| **Sanitation Officer** | `officer.sanitation@civic.gov.in` | `Officer@123` | Sanitation & Solid Waste |
| **System Admin** | `admin@civic.gov.in` | `Admin@123` | Municipal Administration |
| **Public Citizen** | *No password needed* | *Guest Mode* | Public Portal / Mobile App |

---

## 🧪 Testing & Verification

Run the backend automated test suite:
```bash
cd backend
pytest -v
```
* **Result**: 29/29 tests passing cleanly in ~3 seconds.

Run frontend & mobile type-checks:
```bash
cd dashboard && npm run build
cd ../mobile && npx tsc --noEmit
```

---

## 📄 License
This project is licensed under the MIT License.
