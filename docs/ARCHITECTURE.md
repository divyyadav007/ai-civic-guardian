# Architecture Document
## AI Civic Guardian

**Companion to:** `PRD.md`, `RULES.md`, `PHASES.md`, `DESIGN.md`

---

## 1. Architecture Style

Client-server, service-oriented backend, mobile client. Four layers, matching the synopsis's Fig. 6.1:

```
[Client Layer]  →  [API Gateway]  →  [AI/ML Processing Layer]  →  [Data Layer]  →  [Department/Admin Layer]
```

### 1.1 High-Level Diagram (textual)

```
Citizen Mobile App (React Native / Flutter)
   ├─ Camera (photo capture)
   ├─ Microphone (voice note)
   ├─ GPS sensor (live location)
   └─ Review & Approval UI (edit/confirm)
        │
        ▼
Backend API Gateway (FastAPI)
        │
        ▼
AI/ML Processing Layer (internal microservices, called synchronously or via job queue)
   ├─ Image Classification Service   — CNN (MobileNetV2/ResNet50 transfer learning, or YOLO-based) → issue_type + confidence
   ├─ Speech-to-Text Service          — Whisper (self-hosted) or Google STT API → transcript
   ├─ Reverse Geocoding Service       — Google Maps Geocoding API (or Nominatim/OSM as open alt) → address
   └─ Complaint Draft Generator       — merges detection + transcript + location → structured draft
        │
        ▼
Structured Complaint Draft (returned to client for review)
        │  (on approval)
        ▼
Data Layer
   ├─ Complaints DB (PostgreSQL)
   ├─ Media Storage (S3-compatible object storage)
   └─ User Accounts DB (PostgreSQL)
        │
        ▼
Department Routing Engine (rule-based: issue_type → department)
        │
        ▼
Department / Admin Web Dashboard (React)
   ├─ Roads Dept. view
   ├─ Sanitation/Water Dept. view
   ├─ Electrical Dept. view
   └─ Admin (cross-department) view
        │
        ▼
Status Update (Submitted / Acknowledged / In Progress / Resolved) — surfaced back to citizen app
```

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile app | **React Native (Expo)** | Cross-platform; Expo simplifies camera/GPS/mic permissions for a student project. Flutter is an acceptable alternative — pick one and stay consistent. |
| Backend API | **FastAPI (Python)** | Async support, auto-generated OpenAPI docs, easy integration with ML libs. |
| Admin/Dept dashboard | **React + Vite + Tailwind** | SPA consuming the same backend API. |
| Image classification | **PyTorch**, transfer learning on **MobileNetV2** (edge-friendly) or **ResNet50**; YOLOv8n as an alternative if bounding-box localization is desired later | Start with classification-only (no bounding box) for v1 per PRD scope. |
| Speech-to-Text | **Whisper (small/base, self-hosted)** primary; **Google Speech-to-Text API** as a swappable alternative | Abstract behind an `STTProvider` interface. |
| Reverse geocoding | **Google Maps Geocoding API** primary; **Nominatim (OpenStreetMap)** as free/open fallback | Abstract behind a `GeocodingProvider` interface. |
| Complaint draft generation | Rule-based template filling for v1; optional lightweight LLM summarization call for v1.1 | Keep deterministic path as default/fallback. |
| Database | **PostgreSQL** (with PostGIS extension for geo queries) | MongoDB is an acceptable alternative per synopsis, but PostGIS gives easy duplicate/proximity queries. |
| Media storage | **S3-compatible object storage** (AWS S3 / MinIO for local dev) | Store photos and voice notes; DB stores references only. |
| Auth | **JWT-based auth**; phone OTP (citizen) + email/password (department/admin) | Role-based access control (citizen / officer / admin). |
| Infra / Deployment | **Docker Compose** for local/dev; deployable to a single cloud VM or container service for pilot (AWS/GCP/Render) | Keep infra simple for an academic-scale pilot. |
| Version control / CI | **Git/GitHub**, GitHub Actions for lint + test on PR | |

---

## 3. Service Boundaries (Microservices vs. Modules)

For a 3-person, 6-month academic project, avoid over-splitting into true microservices. Recommended: **one FastAPI backend with clearly separated internal modules**, each behind an interface so they *could* be extracted into services later.

```
backend/
  app/
    api/                # HTTP route handlers (thin controllers)
      complaints.py
      auth.py
      departments.py
      dashboard.py
    services/           # business logic
      classification_service.py
      stt_service.py
      geocoding_service.py
      draft_generator.py
      routing_engine.py
      duplicate_detector.py
    models/             # ORM models (SQLAlchemy)
      complaint.py
      user.py
      department.py
    schemas/            # Pydantic request/response schemas
    ml/
      classification/   # model loading, inference wrapper
      stt/
    db/
      session.py
      migrations/       # Alembic
    core/
      config.py
      security.py
    main.py
  tests/
```

Only split into a true separate microservice if a component (e.g., the ML classification model) needs independent scaling/GPU hosting — in that case expose it as an internal HTTP service called by `classification_service.py`.

---

## 4. Data Model (Core Entities)

### `User`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| role | enum(`citizen`, `officer`, `admin`) | |
| phone / email | string | unique |
| name | string | |
| department_id | FK → Department, nullable | only for `officer` |
| created_at | timestamp | |

### `Department`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | Roads / Sanitation-Water / Electrical |
| routing_keys | string[] | issue types mapped to this dept |

### `Complaint`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK, also used as citizen-facing reference number |
| citizen_id | FK → User | |
| photo_url | string | media storage reference |
| voice_note_url | string, nullable | |
| detected_issue_type | enum(`pothole`,`garbage`,`water_leakage`,`broken_streetlight`,`other`) | |
| classification_confidence | float | |
| transcript | text, nullable | |
| description | text | final, possibly edited by citizen |
| latitude / longitude | float | |
| address | text | reverse-geocoded, editable |
| department_id | FK → Department | set by routing engine |
| status | enum(`draft`,`submitted`,`acknowledged`,`in_progress`,`resolved`,`rejected`,`duplicate`) | |
| duplicate_of | FK → Complaint, nullable | |
| created_at / updated_at | timestamp | |
| approved_at | timestamp, nullable | when citizen approved the draft |

### `StatusHistory`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| complaint_id | FK → Complaint | |
| status | enum | |
| note | text, nullable | officer note on change |
| changed_by | FK → User | |
| changed_at | timestamp | |

---

## 5. API Surface (v1)

```
POST   /auth/register
POST   /auth/login
POST   /auth/otp/verify

POST   /complaints/draft            # upload photo + optional voice → returns structured draft (not yet saved as submitted)
PATCH  /complaints/draft/{draft_id} # citizen edits fields
POST   /complaints/{draft_id}/submit  # citizen approves → creates Complaint, runs routing

GET    /complaints/mine             # citizen's own complaints
GET    /complaints/{id}             # complaint detail

GET    /departments/{id}/complaints # officer queue, filterable by status/date/locality
PATCH  /complaints/{id}/status      # officer/admin updates status + note

GET    /admin/stats                 # aggregate counts for dashboard charts
GET    /admin/complaints            # cross-department search/filter
```

All ML-heavy endpoints (`/complaints/draft`) should be designed to run classification + STT + geocoding **in parallel** (async tasks) rather than sequentially, to keep p95 latency down.

---

## 6. Algorithms & Techniques

- **Image classification:** transfer learning on MobileNetV2 or ResNet50; fine-tune final layers on the 4-class civic-issue dataset. YOLO-based detector considered if future scope needs bounding boxes/severity-by-area (e.g., pothole size).
- **Speech-to-text:** Whisper (small/base) self-hosted for cost control and offline-capable pilots; Google STT as a cloud alternative behind the same interface.
- **Complaint drafting:** deterministic template: `"{issue_type} reported at {address}. Citizen description: {transcript_or_text}."` — optionally refined by a lightweight LLM call for grammar/clarity in v1.1.
- **Routing:** static rule table `issue_type → department_id`, stored in DB and editable by admin (not hardcoded), so it can evolve without a redeploy.
- **Duplicate detection (stretch):** geo-proximity (PostGIS `ST_DWithin`) + text similarity (TF-IDF cosine similarity) within a configurable time window (e.g., 72 hours) and radius (e.g., 100m).

---

## 7. Security & Privacy Notes

- All media uploads go through the backend (never direct client-to-storage without a signed URL) so classification can run server-side and access can be authorized.
- Role-based access control enforced at the API layer, not just the UI.
- Location data is only attached to the specific complaint; no continuous background location tracking.
- Rate-limit `/complaints/draft` to prevent abuse of the ML inference endpoints.

---

## 8. Deployment View (Pilot)

```
Single cloud VM (or small container cluster)
 ├─ Docker: fastapi-backend
 ├─ Docker: postgres (+ PostGIS)
 ├─ Docker: minio (or use managed S3)
 ├─ Docker: whisper-inference (if self-hosted STT)
 └─ Nginx reverse proxy (TLS termination)

Mobile app: built via Expo, distributed as APK/TestFlight build for demo/evaluation.
Admin dashboard: static build served via Nginx or a simple Node static server.
```

---

## 9. Extensibility Notes (documented, not built in v1)

- New issue categories: add to `detected_issue_type` enum + retrain/fine-tune classifier + add routing rule — no architectural change needed.
- Real government portal integration: add an outbound adapter in `routing_engine.py` that also POSTs to the external grievance API, keyed by department.
- Multilingual expansion: STT and draft templates are already provider-abstracted; add language field to `Complaint` and localize templates.
