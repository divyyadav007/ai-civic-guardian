# Product Requirements Document (PRD)
## AI Civic Guardian — An AI-Based System for Automated Detection, Localization and Reporting of Civic Issues

**Version:** 1.0
**Owner:** Divyanshu Yadav, Devansh Gupta, Armaan Gupta
**Supervisor:** Dr. Rajan Prasad, Dept. of CSE, BBD University
**Status:** Draft for build (target platform: Antigravity / AI-agent-assisted development)

---

## 1. Summary

AI Civic Guardian is a mobile-first, AI-powered civic issue reporting platform. A citizen captures a photo and/or short voice note of a civic problem (pothole, garbage, water leakage, broken streetlight). The system automatically:

1. Classifies the issue type from the photo (CNN/YOLO-based image classification).
2. Captures GPS location and reverse-geocodes it to a readable address.
3. Converts the voice note to text (speech-to-text).
4. Merges all of this into a structured, department-ready complaint draft (NLP template/summarization).
5. Shows the draft to the citizen for review/edit/approval.
6. Routes the approved complaint to the correct municipal department queue.
7. Lets both citizen and department track status (Submitted → In Progress → Resolved).

The goal is to cut complaint-filing effort from several minutes of manual typing to a single photo/voice capture plus one tap of approval — supporting e-governance and Smart City goals of faster grievance redressal and higher civic participation.

---

## 2. Problem Statement

- Manual civic complaint filing (forms, helplines, generic apps) is slow and inconvenient, so citizens under-report or delay reporting.
- Existing grievance portals rely on manual text entry and manual categorization; they don't auto-verify the issue from a photo, don't auto-capture precise GPS, and mostly lack voice input.
- No mainstream system combines image detection + GPS + voice-to-text + auto-drafted, user-approved complaints into one workflow.

---

## 3. Goals & Objectives

1. Mobile app for citizens to report civic issues via image and/or voice.
2. Image-classification model for 4 issue categories: pothole, garbage/waste, water leakage/stagnation, broken/non-functional streetlight.
3. Automatic GPS capture + reverse geocoding to human-readable address.
4. Voice-to-text for spoken complaint descriptions (Hindi/English as feasible).
5. Auto-generated structured complaint (issue type, description, location, photo).
6. Citizen review/edit/approve step before submission (trust & data-quality gate).
7. Routing of approved complaints to the correct department + status tracking.
8. Evaluate detection accuracy, usability, and time saved vs. manual reporting.

### Non-Goals (Out of Scope for v1)
- No physical dispatch of repair crews — reporting & routing only.
- No categories beyond the four listed (extensible later).
- No offline-first support required for v1 (assumes camera, GPS, mic, and internet at submission time).
- No integration with real government portals (e.g., state PWD/municipal systems) in v1 — a self-hosted department dashboard stands in for the real system.

---

## 4. Target Users / Personas

| Persona | Description | Key Need |
|---|---|---|
| **Citizen Reporter** | Any smartphone user who spots a civic issue | Report an issue in under 30 seconds, minimal typing |
| **Department Officer** | Municipal staff (Roads / Sanitation-Water / Electrical) | Triaged, de-duplicated, location-accurate complaint queue |
| **Admin / Supervisor** | Oversees all departments | Cross-department visibility, status reporting, basic analytics |

---

## 5. User Stories

**Citizen**
- As a citizen, I can take a photo of a pothole so the app tells me what it is without me typing anything.
- As a citizen, I can record a 10–15 second voice note describing the issue instead of typing.
- As a citizen, my location is captured automatically so I don't have to pin a map manually.
- As a citizen, I see a draft complaint (photo + type + description + address) and can edit any field before submitting.
- As a citizen, I can track my complaint's status (Submitted / In Progress / Resolved) and see history of my past reports.
- As a citizen, I get a confirmation (ID/reference) after submission.

**Department Officer**
- As an officer, I only see complaints routed to my department.
- As an officer, I can filter/sort by status, date, locality, and severity/confidence score.
- As an officer, I can update a complaint's status and add a resolution note/photo.
- As an officer, I can flag a complaint as duplicate/spam.

**Admin**
- As an admin, I can see aggregate stats: complaints by category, by ward/area, average resolution time.
- As an admin, I can manage department-routing rules and user accounts.

---

## 6. Functional Requirements

### FR-1 Image Capture & Classification
- Accept photo capture or gallery upload.
- Preprocess (resize/normalize) and run through classification model.
- Return: `issue_type`, `confidence_score`. If confidence < threshold, mark `needs_manual_category` and let user pick manually.

### FR-2 Location Capture
- Read device GPS coordinates at time of capture.
- Reverse-geocode to a human-readable address (locality, ward if available).
- Allow manual correction of the pinned location on a map.

### FR-3 Voice-to-Text
- Record voice note (max ~30–60 sec for v1).
- Transcribe to text (English + Hindi as feasible).
- Show transcript to user for edit.

### FR-4 Complaint Draft Generation
- Combine `issue_type + confidence`, `transcript/typed description`, `address + coordinates`, `photo` into one structured draft object.
- Auto-generate a short human-readable summary sentence for the complaint.

### FR-5 Review & Approval
- Present editable draft (all fields editable) prior to submission.
- Require explicit "Approve & Submit" action — nothing is sent without this.

### FR-6 Routing
- Rule-based mapping: `issue_type → department` (Roads, Sanitation/Water, Electrical).
- On submission, create record in the correct department queue.

### FR-7 Status Tracking
- Status enum: `Submitted → Acknowledged → In Progress → Resolved` (+ `Rejected/Duplicate`).
- Citizen-facing status view (list + detail) with push/local notification on status change (v1.1 stretch).
- Department dashboard to update status + add notes/photos.

### FR-8 Admin Dashboard
- View/filter/search all complaints across departments.
- Basic charts: complaints by category, by status, over time.
- Manage routing rules and department accounts.

### FR-9 Duplicate Detection (stretch, from literature review)
- Flag likely duplicate complaints using location proximity + text similarity (e.g., cosine similarity on descriptions) within a time/distance window.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Image classification response < 3s p95 on server; end-to-end draft generation < 8s p95 |
| **Availability** | Backend API uptime target 99% for demo/production pilot |
| **Scalability** | Stateless API services behind a gateway; horizontally scalable; DB indexed on location + status + department |
| **Security** | Auth for citizens (OTP/phone or email) and department/admin (role-based); signed URLs for media storage; input validation on all endpoints |
| **Privacy** | Store only minimum PII; location data tied to complaint, not continuously tracked; media access restricted to authorized roles |
| **Accessibility** | Voice-input path for users uncomfortable typing; support for Hindi + English |
| **Reliability** | Draft generation must degrade gracefully — if classification model fails, allow manual category selection; if STT fails, allow manual text entry |
| **Auditability** | Every status change and edit to a complaint is logged (who/when) |

---

## 8. Success Metrics

- ≥ 80% top-1 classification accuracy on held-out test set across the 4 categories.
- Median time-to-submit a complaint ≤ 45 seconds (vs. baseline manual form ~3–5 min).
- ≥ 90% of generated drafts require no more than 1 field edit before approval.
- Department dashboard: median time-to-first-acknowledgement tracked as a baseline KPI.

---

## 9. Assumptions & Constraints

- User's device has working camera, GPS, microphone, and internet connectivity at submission time.
- Classification limited to 4 categories and to the quality/diversity of the training dataset; performance may degrade in poor lighting, night-time, or heavy occlusion.
- Prototype targets a self-hosted department dashboard, not a live government system integration.
- Six-month academic project timeline (see `PHASES.md`).

---

## 10. Open Questions

- Which STT provider is acceptable for the deployment environment (cloud API vs. on-device Whisper) given cost/privacy constraints?
- What is the real ward/department boundary data source for accurate routing (shapefile / municipal API)?
- Do we need multi-photo support per complaint in v1, or single photo only?
- Authentication: phone OTP vs. email/password vs. anonymous-with-device-id for v1 demo?

---

## 11. Related Documents
- `ARCHITECTURE.md` — system architecture, data model, tech stack, API surface.
- `RULES.md` — coding standards, conventions, and guardrails for AI-assisted development.
- `PHASES.md` — phased build plan mapped to the 60-day work plan.
- `DESIGN.md` — UX flows, screen inventory, and visual design direction.
