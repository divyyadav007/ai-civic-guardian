# Design.md
## UX Flows, Screen Inventory & Visual Direction — AI Civic Guardian

Companion to `PRD.md` (requirements) and `ARCHITECTURE.md` (data/API). This is the source of truth for what screens exist and how they connect — don't add screens elsewhere without updating this file (see `RULES.md` §5.5).

---

## 1. Design Principles

1. **Minimum typing.** Every field the AI can fill (issue type, description, location) should arrive pre-filled; the citizen edits rather than composes from scratch.
2. **Trust through transparency.** Always show the citizen exactly what will be submitted, with a visible confidence indicator on AI-detected fields, before the approval action.
3. **One primary action per screen.** Capture → Review → Track are each single-focus screens; avoid overloading any one screen with competing calls to action.
4. **Fail visibly, recover easily.** If detection/geocoding/transcription fails or is low-confidence, show a clear inline prompt to fill it manually rather than blocking progress.
5. **Civic, calm, official-but-approachable tone** — not a generic consumer app. Should feel trustworthy enough to represent a government-adjacent service.

---

## 2. Information Architecture (App Map)

### Citizen Mobile App
```
Onboarding
 └─ Login / Register (phone OTP or email)

Home (Tab bar: Report | My Complaints | Profile)
 ├─ Report (primary CTA: big "+ Report an Issue" button)
 │   ├─ Capture Screen (camera / gallery, optional voice record)
 │   ├─ Processing Screen (classify + geocode + transcribe — loading state)
 │   ├─ Review & Approval Screen (editable draft)
 │   └─ Confirmation Screen (reference ID, "Track this complaint")
 ├─ My Complaints (list)
 │   └─ Complaint Detail / Status Timeline
 └─ Profile (account info, logout, language toggle)
```

### Department / Admin Web Dashboard
```
Login (role-based: officer / admin)

Officer view
 ├─ Queue (table: complaints for their department, filters: status/date/locality)
 └─ Complaint Detail (photo, transcript, location map, status update + note)

Admin view
 ├─ Overview (charts: by category, by status, over time)
 ├─ All Complaints (cross-department search/filter)
 ├─ Routing Rules (edit issue_type → department mapping)
 └─ User/Department Management
```

---

## 3. Screen-by-Screen Detail

### 3.1 Capture Screen
- Large camera viewfinder, shutter button center-bottom.
- Secondary control: "Attach from gallery" and a mic button ("Hold to record voice note", max ~30–60s) rendered below the shutter.
- Text field always available as a fallback: "Or type a description" (never force voice/photo-only).
- Proceeds to Processing Screen once at least a photo OR a description (typed or voice) is present.

### 3.2 Processing Screen
- Sequential/parallel status indicators for: "Identifying issue…", "Finding your location…", "Transcribing voice note…" (only shown if applicable).
- Each indicator resolves to a check ✓ or a "Couldn't detect — you can fill this manually" inline note; no dead-end spinners (per `RULES.md` §5.3).
- Auto-advances to Review screen once all applicable steps resolve (success or graceful fallback).

### 3.3 Review & Approval Screen
- Photo thumbnail at top (tap to enlarge/retake).
- **Issue Type** — chip/dropdown, pre-selected by AI, shows confidence badge (e.g., "Pothole · 92% match"); editable.
- **Description** — text area, pre-filled from transcript or draft summary; editable.
- **Location** — address text (editable) + small map preview with draggable pin for correction.
- **Voice note** — inline playback control if one was recorded.
- Primary button: **"Approve & Submit"** (only enabled once required fields are non-empty).
- Secondary: "Save as draft" / "Discard".

### 3.4 Confirmation Screen
- Reference/complaint ID, department it was routed to, and current status ("Submitted").
- CTA: "Track this complaint" → Complaint Detail; "Report another issue" → back to Capture.

### 3.5 My Complaints (List)
- Card per complaint: thumbnail, issue type, short address, status pill (color-coded), submitted date.
- Filter/sort by status.

### 3.6 Complaint Detail / Status Timeline (Citizen)
- Vertical timeline: Submitted → Acknowledged → In Progress → Resolved, with timestamps and any officer notes visible to the citizen.
- Photo + final description shown read-only.

### 3.7 Officer Queue (Dashboard)
- Table columns: Thumbnail, Issue Type, Address/Locality, Submitted date, Status, Confidence, Duplicate flag (if any).
- Row click → Complaint Detail.
- Bulk-select for status update where appropriate.

### 3.8 Officer Complaint Detail (Dashboard)
- Left: photo, map pin, transcript/description.
- Right: status dropdown + note field + "Save update" (writes to `StatusHistory`).
- "Mark as duplicate" action linking to a suspected duplicate complaint ID.

### 3.9 Admin Overview
- Summary cards: total complaints, resolved this week, avg. resolution time.
- Charts: complaints by category (bar), by status (pie/stacked bar), trend over time (line).

### 3.10 Admin Routing Rules
- Simple table: Issue Type ↔ Department, editable dropdown per row, "Save" — this is what `routing_engine.py` reads from (see `ARCHITECTURE.md` §6).

---

## 4. Status Color Convention (use consistently across mobile + dashboard)

| Status | Color |
|---|---|
| Submitted | Blue / Info |
| Acknowledged | Amber / Warning-light |
| In Progress | Orange |
| Resolved | Green / Success |
| Rejected / Duplicate | Grey / Muted |

---

## 5. Visual Direction

- **Tone:** civic-official but modern — think "government digital service" rather than flashy consumer app. Clean, high-contrast, legible at a glance (many users will be outdoors, on the move).
- **Color palette:** a primary civic blue (trust, official) + one accent color for the primary CTA (e.g., a warm action color reserved only for "Approve & Submit" / "+ Report" so it stands out); status colors as above.
- **Typography:** a single clean sans-serif family, generous size for outdoor/glare readability; avoid dense small text on the mobile app.
- **Iconography:** simple line icons for the 4 issue categories (pothole, garbage, water leak, streetlight) — used consistently across mobile list items, dashboard tables, and charts so categories are instantly recognizable.
- **Accessibility:** minimum tap target sizes for outdoor/one-handed use; sufficient color contrast; status conveyed by both color and text label (not color alone), per accessibility best practice and PRD §7.
- **Localization-ready:** all UI copy externalized to a strings file from the start, to support the Hindi/English voice-input scope without a later rewrite.

---

## 6. Empty / Error States (must exist for every list/detail screen)

- Empty "My Complaints" → friendly illustration + "You haven't reported anything yet" + CTA to report.
- Empty officer queue → "No complaints in your queue right now."
- Network/API error → inline retry affordance, never a silent blank screen.
- Low-confidence detection → visible inline banner on Review screen: "We're not fully sure — please confirm the issue type," rather than hiding the uncertainty.

---

## 7. Open Design Questions (mirror PRD §10)

- Final choice of illustration/icon style (custom vs. icon library) — flag as a design task in Phase 2.
- Whether department dashboard needs a mobile-responsive layout for v1, or desktop-only is acceptable for the pilot.
