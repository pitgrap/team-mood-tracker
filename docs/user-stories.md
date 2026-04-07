# Team Mood Tracker – User Stories

## How to Read This Document

- Stories are ordered by implementation sequence
- Dependencies are listed per story as [US-XX] references
- Acceptance criteria are written as testable conditions
- Stories are grouped into epics for clarity

---

## Epic 1 — Project & Infrastructure Setup

### US-01 · Repository & Monorepo Scaffold
**As a** developer, **I want** the repository initialised as a monorepo with frontend/ and backend/ workspaces, **so that** all code lives in one place.

**Acceptance criteria:**
- Root package.json defines workspaces: ["frontend", "backend"]
- frontend/ is a Vite + React + TypeScript project
- backend/ is a Node.js + Express + TypeScript project
- .nvmrc at the root specifies Node.js 24
- Both package.json files have "engines": { "node": ">=24.0.0" }
- eslint and prettier are configured and run cleanly

**Dependencies:** none

---

### US-02 · Database Schema & Prisma Setup
**As a** developer, **I want** the Prisma schema defined with all models and the initial migration applied.

**Acceptance criteria:**
- schema.prisma contains: Team, Survey, Question, Response, Submission, Admin, SurveyStatus
- Question has @@unique([order]), Submission has @@unique([surveyId, tokenHash]), Survey has @@unique([teamId, sprintLabel])
- prisma migrate dev and prisma generate run without errors

**Dependencies:** US-01

---

### US-03 · Database Seed Script
**As a** developer, **I want** an idempotent seed script that creates the two fixed questions and a default admin account.

**Acceptance criteria:**
- Uses upsert for all records
- Seeds both questions and one Admin from env vars
- Throws descriptive error if ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD are missing
- Running twice produces no errors

**Dependencies:** US-02

---

### US-04 · Environment Variable Configuration
**As a** developer, **I want** all required environment variables documented and validated at startup.

**Acceptance criteria:**
- .env.example lists all variables from the Architecture doc
- Backend throws descriptive error on startup if required vars are missing
- .env is in .gitignore

**Dependencies:** US-01

---

### US-05 · Docker Compose for Test Database
**As a** developer, **I want** a Docker Compose file that spins up an isolated Postgres instance for tests.

**Acceptance criteria:**
- docker-compose.test.yml defines postgres:16 on port 5433
- DB name moodtracker_test, user test, password test
- Data stored in tmpfs

**Dependencies:** US-01

---

### US-06 · Health Check Endpoint
**As a** developer, **I want** a /api/health endpoint so Render can verify the API is running.

**Acceptance criteria:**
- GET /api/health returns 200 { "status": "ok" } with no auth required
- Registered before any auth middleware

**Dependencies:** US-01

---

### US-07 · CORS Configuration
**As a** developer, **I want** CORS configured to allow requests from the frontend domain.

**Acceptance criteria:**
- Origin from FRONTEND_URL env var
- Methods: GET, POST, PATCH, DELETE
- Headers: Content-Type, Authorization
- Preflight OPTIONS returns 204

**Dependencies:** US-01, US-04

---

### US-08 · CI Pipeline (GitHub Actions)
**As a** developer, **I want** a GitHub Actions workflow that runs all tests on every push and PR.

**Acceptance criteria:**
- Jobs: backend-unit, backend-integration, frontend-unit, e2e
- backend-integration uses a Postgres service container
- e2e runs only after all other jobs pass
- Failing e2e blocks merge to main

**Dependencies:** US-05

---

### US-09 · Render Deployment Configuration
**As a** developer, **I want** a render.yaml that defines all Render services declaratively.

**Acceptance criteria:**
- Defines mood-tracker-api, mood-tracker-frontend, mood-tracker-db
- API build command runs prisma migrate deploy
- Health check path is /api/health
- deploy.yml triggers Render deploy hook on merge to main

**Dependencies:** US-06, US-07, US-08

---

## Epic 2 — Admin Authentication

### US-10 · Admin Login API
**As an** admin, **I want** to authenticate with email and password and receive a JWT.

**Acceptance criteria:**
- POST /api/admin/login returns { token } (8h JWT) on valid credentials
- Returns 401 UNAUTHORIZED on invalid credentials
- Returns 400 VALIDATION_ERROR on missing fields

**Dependencies:** US-03, US-04

---

### US-11 · Admin Auth Middleware
**As a** developer, **I want** an Express middleware that validates the admin JWT on protected routes.

**Acceptance criteria:**
- Reads token from Authorization: Bearer header
- Valid: attaches decoded payload to req.admin and calls next()
- Invalid/missing/expired: returns 401 UNAUTHORIZED
- Applied to all /api/admin/* except POST /api/admin/login

**Dependencies:** US-10

---

### US-12 · Admin Login UI
**As an** admin, **I want** a login page at /admin.

**Acceptance criteria:**
- Email + password form with validation
- On success: JWT stored in localStorage as mood_tracker_admin_token, redirect to /admin/teams
- On 401: shows "Invalid email or password"
- RequireAdmin guard redirects to /admin if no valid token

**Dependencies:** US-10

---

## Epic 3 — Team Management

### US-13 · Team API (CRUD)
**As an** admin, **I want** API endpoints to create, list, update, and delete teams.

**Acceptance criteria:**
- GET /api/admin/teams?page&perPage returns { data, total }
- POST, PATCH, DELETE work as per API contract
- DELETE returns 409 TEAM_HAS_SURVEYS if team has surveys
- Duplicate name returns 409 DUPLICATE_TEAM

**Dependencies:** US-02, US-11

---

### US-14 · Team Management UI
**As an** admin, **I want** a UI at /admin/teams to manage teams.

**Acceptance criteria:**
- List, create, edit, delete all work via React Admin
- Delete shows error toast if team has surveys
- Data provider injects Authorization header automatically
- Clicking a team row navigates to the team dashboard (show view)

**Dependencies:** US-12, US-13

---

### US-14a · Admin Dashboard
**As an** admin, **I want** a dashboard landing page after login that shows aggregate stats across all teams.

**Acceptance criteria:**
- GET /api/admin/dashboard returns aggregate stats: team count, survey count, open/closed counts, response count, per-question averages, per-team averages, recent surveys
- Dashboard is the default page after login at /admin
- Displays stat cards for teams, surveys (open/closed), and responses
- Shows overall per-question averages with progress bars
- Shows per-team average breakdown
- Lists the 5 most recent surveys with status and submission progress

**Dependencies:** US-12, US-13

---

### US-14b · Team Dashboard with Trends
**As an** admin, **I want** a team-level dashboard showing mood trends across sprints.

**Acceptance criteria:**
- GET /api/admin/teams/:id/dashboard returns team details, overall averages, trend data, and per-sprint breakdown
- Accessible by clicking a team in the team list
- Shows stat cards: total surveys, closed, open, total responses
- Displays overall per-question averages across closed surveys
- Shows sparkline trend charts per question across closed sprints
- Provides a sprint breakdown table with per-question averages and status for each survey

**Dependencies:** US-13, US-14

---

## Epic 4 — Survey Management

### US-15 · Survey Token Generation
**As a** developer, **I want** a service that generates and verifies short-lived JWT survey tokens.

**Acceptance criteria:**
- generateSurveyToken(surveyId) returns a JWT signed with SURVEY_TOKEN_SECRET
- verifySurveyToken(token) returns { surveyId } or throws TOKEN_EXPIRED / UNAUTHORIZED

**Dependencies:** US-04

---

### US-16 · Survey API (Admin)
**As an** admin, **I want** API endpoints to create, list, view, and close surveys.

**Acceptance criteria:**
- POST /api/admin/surveys returns 201 + Survey + participantUrl
- GET list and detail endpoints work as per API contract
- PATCH /:id/close closes survey and triggers Metabase push
- Duplicate sprint label returns 409 DUPLICATE_SPRINT

**Dependencies:** US-02, US-11, US-13, US-15

---

### US-17 · Survey Management UI
**As an** admin, **I want** a UI at /admin/surveys to create and manage surveys.

**Acceptance criteria:**
- Survey list shows team, sprint label, status, submission count vs expected
- Create form includes team selector, sprint label, participant count
- Detail page shows participant URL with one-click copy
- Close button hidden when survey is already CLOSED

**Dependencies:** US-14, US-16

---

## Epic 5 — Participant Survey Flow

### US-18 · Participant Survey API — Load Survey
**As a** participant, **I want** to open my survey link and see the questions.

**Acceptance criteria:**
- GET /api/surveys/:token returns survey metadata + questions for valid token
- Expired token: 401 TOKEN_EXPIRED; invalid: 404 SURVEY_NOT_FOUND
- Closed survey: returns metadata with status: "CLOSED"

**Dependencies:** US-02, US-15

---

### US-19 · Participant Survey API — Submit Responses
**As a** participant, **I want** to submit my answers anonymously.

**Acceptance criteria:**
- POST /api/surveys/:token/responses with two { questionId, score } returns 201
- Score outside 1–10: 400 VALIDATION_ERROR
- Closed survey: 409 SURVEY_CLOSED
- Duplicate token hash: 409 ALREADY_SUBMITTED
- Submission row (SHA-256 hash) created alongside Response rows
- Auto-closes + pushes to Metabase when count reaches expectedParticipants

**Dependencies:** US-18

---

### US-20 · Participant Survey UI — Form
**As a** participant, **I want** to answer both questions with a 1–10 selector and submit.

**Acceptance criteria:**
- Route /survey/:token loads the form with both questions
- Scale labels "1 = Can't be worse" and "10 = Can't be better" visible
- Submit disabled until both questions answered
- Handles expired, already-submitted, and closed survey states with correct redirects
- Responsive on desktop and mobile

**Dependencies:** US-18, US-19

---

### US-21 · Participant Survey UI — Post-Submission Screens
**As a** participant, **I want** clear feedback after submitting.

**Acceptance criteria:**
- /survey/:token/waiting: "Thank you! Waiting for all responses."
- /survey/:token/submitted: "You have already submitted your answers."
- /survey/:token/expired: "This survey link has expired."
- Auto-close redirects directly to /survey/:token/results

**Dependencies:** US-20

---

## Epic 6 — Results

### US-22 · Results API
**As a** participant or admin, **I want** to retrieve aggregated results of a closed survey.

**Acceptance criteria:**
- GET /api/surveys/:token/results returns results only when CLOSED
- Returns 403 RESULTS_NOT_READY if survey is open
- Per question: questionId, questionLabel, average (2dp), median, scores[]

**Dependencies:** US-19

---

### US-23 · Results UI
**As a** participant, **I want** to see survey results on the results page.

**Acceptance criteria:**
- Route /survey/:token/results accessible only for CLOSED surveys
- Shows average, median, and horizontal bar chart per question (MUI LinearProgress)
- Responsive on desktop and mobile

**Dependencies:** US-22

---

## Epic 7 — Metabase Push

### US-24 · Metabase Push Service
**As a** developer, **I want** results pushed to Metabase via HTTP POST when a survey closes.

**Acceptance criteria:**
- Called on both auto-close and manual close
- Payload matches the schema in the Architecture document
- Retries once on failure; logs and does not throw after second failure
- Failed push does not prevent survey being marked CLOSED

**Dependencies:** US-22

---

## Epic 8 — Testing

### US-25 · Backend Unit Tests
**Dependencies:** US-10, US-15, US-16, US-19, US-22, US-24

### US-26 · Backend Integration Tests
**Dependencies:** US-05, US-25

### US-27 · Frontend Unit & Component Tests
**Dependencies:** US-20, US-21, US-23

### US-28 · End-to-End Tests (Playwright)
**Dependencies:** US-09, US-25, US-26, US-27

---

## Implementation Order Summary

```
US-01 Monorepo scaffold
  ├── US-02 Prisma schema → US-03 Seed script
  ├── US-04 Env vars → US-10 Admin login API → US-11 Auth middleware → US-12 Login UI
  ├── US-05 Docker Compose → US-08 CI pipeline → US-09 Render config
  ├── US-06 Health check
  └── US-07 CORS

US-02 + US-11 → US-13 Team API → US-14 Team UI
US-12 + US-13 → US-14a Admin Dashboard
US-13 + US-14 → US-14b Team Dashboard with Trends
US-04 → US-15 Token generation
US-02 + US-11 + US-13 + US-15 → US-16 Survey API → US-17 Survey UI
US-02 + US-15 → US-18 Load survey API → US-19 Submit API
  ├── US-22 Results API → US-23 Results UI
  │         └── US-24 Metabase push
  └── US-20 Survey form UI → US-21 Post-submission screens

US-25 Backend unit tests → US-26 Integration tests
US-27 Frontend tests
US-09 + US-25 + US-26 + US-27 → US-28 E2E tests
```
