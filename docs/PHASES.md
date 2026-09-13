# Phases.md
## Phased Build Plan — AI Civic Guardian

Maps to the synopsis's 60-day (6-phase) work plan, expanded into concrete, checkable engineering tasks. Each phase has an explicit **acceptance criteria / exit checklist** — do not start the next phase until the current one's checklist is complete (see `RULES.md` §1).

---

## Phase 0 — Project Setup (pre-Day 1)

- [ ] Initialize monorepo (or 3 repos: `backend/`, `mobile/`, `dashboard/`) with README per `ARCHITECTURE.md` folder structure.
- [ ] Set up Docker Compose for local dev: Postgres(+PostGIS), MinIO, backend.
- [ ] Set up FastAPI skeleton with health-check endpoint, `.env`-based config, Alembic wired.
- [ ] Set up React Native (Expo) app skeleton with navigation shell.
- [ ] Set up React dashboard skeleton with routing shell.
- [ ] CI: lint + basic test run on PR (GitHub Actions).

**Exit criteria:** `docker compose up` boots backend + DB; empty mobile app runs on simulator/device; empty dashboard runs in browser.

---

## Phase 1 — Requirements, Dataset, Foundations (Day 1–10)

*(Synopsis: "Requirement analysis, literature review, and dataset collection")*

- [ ] Finalize `PRD.md` sign-off with supervisor.
- [ ] Collect/curate image dataset for 4 categories (pothole, garbage, water leakage, broken streetlight) — target minimum viable size per class (document count & sources in `datasets/README.md`).
- [ ] Data cleaning + train/val/test split; basic augmentation plan (rotation, brightness, crop) for lighting/angle variety.
- [ ] Define DB schema (Complaint, User, Department, StatusHistory) as SQLAlchemy models + first Alembic migration.
- [ ] Define department routing table seed data (Roads / Sanitation-Water / Electrical ↔ issue types).

**Exit criteria:** Dataset stored and versioned; DB migrations apply cleanly; schema reviewed against `ARCHITECTURE.md` §4.

---

## Phase 2 — UI/UX & System Design (Day 11–20)

*(Synopsis: "UI/UX design of mobile application; design of system architecture, database schema, and API contracts")*

- [ ] Finalize `DESIGN.md` screen inventory + wireframes/mockups for all core screens.
- [ ] Finalize API contract (OpenAPI) for auth, draft, submit, status, dashboard endpoints per `ARCHITECTURE.md` §5.
- [ ] Implement auth (registration/login, OTP or email/password) end-to-end (backend + mobile + dashboard login).
- [ ] Implement empty-state navigation for all planned screens in mobile app and dashboard (no real data yet, just shells).

**Exit criteria:** A user can register/log in on mobile and on the dashboard; all planned screens exist as navigable placeholders; API contract reviewed and frozen for Phase 3.

---

## Phase 3 — Core AI Pipeline: Vision + Location (Day 21–30)

*(Synopsis: "Development and training of the AI image-classification model; integration of GPS capture and reverse geocoding")*

- [ ] Train baseline classifier (transfer learning, MobileNetV2/ResNet50) on curated dataset.
- [ ] Evaluate on held-out test set; record accuracy/confusion matrix; iterate until meeting PRD target (≥80% top-1).
- [ ] Wrap trained model in `ml/classification/` inference module with `model_version` tagging.
- [ ] Implement `classification_service.py` and `/complaints/draft` (image portion only) — returns `issue_type + confidence`.
- [ ] Implement camera capture screen in mobile app, wired to the draft endpoint.
- [ ] Implement `geocoding_service.py` (reverse geocoding provider interface + concrete provider).
- [ ] Wire GPS capture in mobile app + display resolved address, with manual pin-correction fallback.

**Exit criteria:** From the mobile app, a photo can be captured, sent to backend, and the app displays a detected issue type + confidence + resolved address, end to end.

---

## Phase 4 — Voice Pipeline + Complaint Drafting (Day 31–40)

*(Synopsis: "Integration of voice-to-text conversion module and NLP-based automated complaint-generation module")*

- [ ] Implement `stt_service.py` (provider interface + Whisper or Google STT integration).
- [ ] Implement voice recording screen in mobile app; wire to `/complaints/draft` voice portion.
- [ ] Implement `draft_generator.py`: merge issue_type + transcript/typed text + address + photo into structured draft + human-readable summary sentence.
- [ ] Handle graceful degradation: missing voice note → text-only path; low classification confidence → manual category picker.

**Exit criteria:** A citizen can capture photo + voice note (or type instead) and receive a complete structured draft object from the backend, matching the `Complaint` fields in `ARCHITECTURE.md` §4.

---

## Phase 5 — Review/Approval, Routing, Dashboard (Day 41–50)

*(Synopsis: "Integration of user review/approval workflow, department-routing logic, and admin/status-tracking dashboard")*

- [ ] Build Review & Approval screen (mobile): all draft fields editable, explicit "Approve & Submit" action per `RULES.md` §3.3.
- [ ] Implement `POST /complaints/{draft_id}/submit` → persists `Complaint`, sets initial status `submitted`.
- [ ] Implement `routing_engine.py`: issue_type → department assignment on submit.
- [ ] Implement officer dashboard: department-scoped complaint queue, filters (status/date/locality), status update + note.
- [ ] Implement admin dashboard: cross-department view, basic charts (by category/status/time), routing-rule management UI.
- [ ] Implement citizen-facing "My Complaints" + status tracking screen in mobile app.
- [ ] (Stretch) Implement `duplicate_detector.py` (geo + text similarity) and surface duplicate flags to officers.

**Exit criteria:** Full happy-path works end to end: citizen submits → complaint appears in correct department queue → officer updates status → citizen sees updated status.

---

## Phase 6 — Testing, Evaluation, Documentation (Day 51–60)

*(Synopsis: "System testing (unit, integration, user acceptance), performance evaluation, documentation, and final report preparation")*

- [ ] Unit tests: routing engine, draft generator, duplicate detector (mocked ML calls) — target good coverage on business logic per `RULES.md` §2.10.
- [ ] Integration tests: `/complaints/draft` and `/complaints/{id}/submit` happy paths + key failure paths (low confidence, STT failure, geocoding failure).
- [ ] Performance evaluation: measure classification latency, end-to-end draft-generation latency against PRD NFR targets (§7 in `PRD.md`).
- [ ] Usability/user-acceptance pass: internal test users complete the report flow; record time-to-submit vs. manual baseline (PRD success metric).
- [ ] Security pass: verify role-based access control, rate limiting on `/complaints/draft`, no secrets in repo.
- [ ] Finalize documentation: update `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md` to reflect what was actually built (close any "Open Questions").
- [ ] Prepare final project report/demo using metrics gathered above.

**Exit criteria:** All PRD success metrics measured and recorded; test suite passing in CI; documentation reflects the shipped system; project ready for final submission/demo.

---

## Stretch / Post-v1 Backlog (explicitly out of the 60-day plan)

- Real government grievance portal integration adapter.
- Push notifications on status change.
- Additional issue categories.
- Multilingual expansion beyond Hindi/English.
- Severity estimation (e.g., pothole area via segmentation).
