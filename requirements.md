# Team Mood Tracker – Requirements

## Overview

Build a web application that tracks team mood at the end of each Scrum sprint.
The app collects structured feedback from team members, displays aggregated
results, and pushes data for reporting to an external Metabase endpoint.

---

## 1. Survey

### 1.1 Questions

Each survey contains exactly two fixed questions (seeded at startup):

1. **Sprint Satisfaction** – *"How satisfied are you with the sprint result?"*
2. **Personal Mood** – *"How do you feel?"*

### 1.2 Answer Format

- Single selection of an integer from **1 to 10**
- Scale definition:
  - `1` = Can't be worse
  - `10` = Can't be better

### 1.3 Submission Rules

- Each participant may submit **exactly once** per survey instance,
  enforced via their unique survey token
- Submissions are **anonymous** — no user identity is stored with a response
- The survey **auto-closes** once the expected participant count has been reached
- An admin may **manually close** a survey at any time before that point

### 1.4 Participant Count

- The admin sets an **expected participant count** when creating a survey
- This number is used to determine when all responses have been collected
  and the survey should auto-close
- It does **not** require a registered user list — participants are anonymous

### 1.5 Sprint / Iteration Identification

- Sprints are identified by a **free-text label** entered by the admin
  (e.g. "Sprint 42", "2026-Q2-S1")
- No date range or auto-incrementing number is enforced by the system
- Sprint labels must be **unique per team**

---

## 2. Participant Token Flow

- When an admin creates a survey, the system generates a **single shared
  survey link** (one URL per survey, not per participant)
- The link contains a **short-lived JWT token** encoding the `surveyId`
  and an expiry (configurable, default **7 days**)
- Any team member opening the link can submit once
- Duplicate submission is prevented by storing a **hashed fingerprint**
  of the token in the Submission table (no user identity stored)
- Expired tokens show a "This survey link has expired" message
- Used tokens (post-submission) show a "You have already submitted" message

---

## 3. Results View

Displayed **immediately after a participant submits**, if the survey is
already closed, or on a separate results page for closed surveys:

- If the survey is **still open** after the participant's submission:
  show a **"Thank you — waiting for all responses"** screen
- If the survey **auto-closes** on their submission (they were the last):
  redirect automatically to the results page
- If the survey is **already closed**: the link resolves directly to results

### Results Page Content

| Metric  | Description                            |
|---------|----------------------------------------|
| Raw     | All individual scores per question     |
| Average | Arithmetic mean per question           |
| Median  | Median value per question              |

---

## 4. Admin Interface

### 4.1 Team Management

- Create, edit, and delete **development teams**
- Each team has a **name** (unique)

### 4.2 Survey / Iteration Management

- Create a new **survey** for a team, specifying:
  - Sprint label (free text, unique per team)
  - Expected participant count
- View all surveys with status: `open`, `closed`
- Copy the **participant survey link** for a given survey
- Manually close an open survey
- View historical results per team and per sprint

### 4.3 Access Control

- Admin role is separate from participant role
- Admin interface requires **username + password** authentication
- Admin session is managed via a **JWT** stored in localStorage

---

## 5. Metabase Integration

- Metabase is **fully external** — the app does not connect to its database
- After a survey closes (auto or manual), the backend sends an **HTTP POST**
  to a configured Metabase endpoint
- The exact payload schema is defined in the Architecture document

---

## 6. Non-Functional Requirements

| Concern        | Requirement                                                          |
|----------------|----------------------------------------------------------------------|
| Frequency      | One survey per team per Scrum sprint                                 |
| Anonymity      | Individual answers must not be traceable to specific users           |
| Scalability    | Must support multiple teams running surveys concurrently             |
| Accessibility  | UI must be usable on both desktop and mobile browsers                |
| Auth           | Admin requires login; participants use a shared token link           |
| Resilience     | A failed Metabase push must be logged but must not crash the app     |

---

## 7. Out of Scope

- Email / Slack notifications (may be added later)
- Per-person survey links
- Multi-language support (English only for v1)
- CSV or other export formats
