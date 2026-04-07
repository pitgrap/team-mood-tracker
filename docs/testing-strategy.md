# Team Mood Tracker – Testing Strategy

## 1. Overview

| Layer | Type | Tool |
|---|---|---|
| Backend logic | Unit | Jest + ts-jest |
| Backend API | Integration | Supertest + Jest + Docker Postgres |
| Frontend logic | Unit | Vitest + React Testing Library + MSW |
| Frontend UI | Component | Vitest + React Testing Library + MSW |
| End-to-End | E2E | Playwright |
| CI | All above | GitHub Actions on every push and pull request |

### Coverage Thresholds (enforced in CI)

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Backend | 80% | 75% | 80% | 80% |
| Frontend | 75% | 70% | 75% | 75% |

---

## 2. Backend Unit Tests

Test individual service functions in isolation. The database and external services (Metabase) are mocked via jest.mock().

### 2.1 Survey Service

| Test case | Description |
|---|---|
| createSurvey() happy path | Creates a survey record for a valid team + sprint |
| createSurvey() duplicate | Throws DUPLICATE_SPRINT if label already exists for the team |
| submitResponse() happy path | Stores an anonymous response with a valid score 1-10 |
| submitResponse() out of range | Throws VALIDATION_ERROR for score less than 1 or greater than 10 |
| submitResponse() survey closed | Throws SURVEY_CLOSED if survey status is CLOSED |
| submitResponse() already submitted | Throws ALREADY_SUBMITTED for a duplicate token fingerprint |
| closeSurvey() auto-close | Closes survey when response count reaches expectedParticipants |
| closeSurvey() manual close | Admin can close a survey before all responses are in |

### 2.2 Results Service

| Test case | Description |
|---|---|
| calculateAverage() | Returns correct arithmetic mean for a set of scores |
| calculateAverage() single response | Returns the score itself |
| calculateMedian() odd count | Returns the middle value |
| calculateMedian() even count | Returns the mean of the two middle values |
| getResults() survey open | Throws RESULTS_NOT_READY if survey is still OPEN |
| getResults() survey closed | Returns per-question average, median, and raw scores |

### 2.3 Metabase Push Service

| Test case | Description |
|---|---|
| pushToMetabase() happy path | Sends correct HTTP POST with the defined payload schema |
| pushToMetabase() HTTP error | Logs error and retries once; does not throw |
| pushToMetabase() payload shape | Payload matches the schema defined in the Architecture doc |

### 2.4 Auth Service

| Test case | Description |
|---|---|
| generateSurveyToken() | Returns a valid JWT encoding surveyId and expiry |
| verifySurveyToken() valid | Returns decoded surveyId |
| verifySurveyToken() expired | Throws TOKEN_EXPIRED |
| verifySurveyToken() tampered | Throws UNAUTHORIZED |
| generateAdminToken() | Returns a valid 8-hour admin JWT |
| verifyAdminCredentials() correct | Returns admin record for valid email + password |
| verifyAdminCredentials() wrong password | Throws UNAUTHORIZED |

---

## 3. Backend Integration Tests

### 3.1 Test Database Setup

- Spun up via docker-compose.test.yml
- Prisma migrations run automatically before the test suite starts
- Seed script runs before each suite
- Each test suite wraps DB writes in a transaction that is rolled back after

### 3.2 Survey Endpoints

| Method + Route | Test case |
|---|---|
| POST /api/admin/surveys | Admin creates survey returns 201 with survey ID + participantUrl |
| POST /api/admin/surveys | Missing fields returns 400 VALIDATION_ERROR |
| POST /api/admin/surveys | Duplicate sprint label for team returns 409 DUPLICATE_SPRINT |
| GET /api/admin/surveys/:id | Returns survey for valid ID |
| GET /api/admin/surveys/:id | Unknown ID returns 404 SURVEY_NOT_FOUND |
| PATCH /api/admin/surveys/:id/close | Admin closes survey returns 200, status CLOSED |
| PATCH /api/admin/surveys/:id/close | Non-admin token returns 403 UNAUTHORIZED |

### 3.3 Response Endpoints

| Method + Route | Test case |
|---|---|
| POST /api/surveys/:token/responses | Participant submits valid scores returns 201 |
| POST /api/surveys/:token/responses | Score out of range returns 400 VALIDATION_ERROR |
| POST /api/surveys/:token/responses | Expired token returns 401 TOKEN_EXPIRED |
| POST /api/surveys/:token/responses | Duplicate submission returns 409 ALREADY_SUBMITTED |
| POST /api/surveys/:token/responses | Auto-closes and returns results when last participant submits |

### 3.4 Results Endpoints

| Method + Route | Test case |
|---|---|
| GET /api/surveys/:token/results | Returns average + median + scores for closed survey |
| GET /api/surveys/:token/results | Returns 403 RESULTS_NOT_READY while survey is open |

### 3.5 Admin Endpoints

| Method + Route | Test case |
|---|---|
| POST /api/admin/login | Valid credentials returns 200 + JWT |
| POST /api/admin/login | Invalid credentials returns 401 UNAUTHORIZED |
| GET /api/admin/teams | Returns team list for authenticated admin |
| POST /api/admin/teams | Creates team returns 201 |
| POST /api/admin/teams | Duplicate name returns 409 DUPLICATE_TEAM |
| DELETE /api/admin/teams/:id | Deletes team returns 204 |
| GET /api/admin/surveys | Returns all surveys with status + result summary |

---

## 4. Frontend Unit and Component Tests

Use Vitest + React Testing Library. No real API calls — all backend responses are mocked via MSW.

### 4.1 MSW Handler Setup

MSW handlers are defined in frontend/src/mocks/handlers.ts and cover:
- GET /api/surveys/:token
- POST /api/surveys/:token/responses
- GET /api/surveys/:token/results
- POST /api/admin/login
- GET /api/admin/teams
- GET /api/admin/surveys

MSW is started in frontend/src/mocks/setup.ts, imported by Vitest's setupFiles config.

### 4.2 Survey Form Component

| Test case | Description |
|---|---|
| Renders both questions | Both question labels visible on mount |
| Score selector range | Only values 1-10 are rendered |
| Score selector default | No value pre-selected on load |
| Submit disabled | Button disabled until both questions answered |
| Submit enabled | Button enables once both questions have a value |
| Submit success survey open | Shows Thank you waiting for all responses screen |
| Submit success survey closed | Redirects to results page |
| Submit error | Shows error message on non-2xx response |
| Already submitted | Shows You have already submitted message |
| Expired token | Shows This survey link has expired message |

### 4.3 Results Display Component

| Test case | Description |
|---|---|
| Shows average and median | Both values rendered per question |
| Score distribution | All individual scores displayed |
| Survey still open | Shows waiting for all responses state |

### 4.4 Admin Pages React Admin

| Test case | Description |
|---|---|
| Login page valid | Redirects to dashboard on success |
| Login page invalid | Shows error on 401 |
| Team list | Renders team names from mocked API |
| Create team | Form submission calls POST /api/admin/teams |
| Survey list | Renders surveys with status badges |
| Copy participant link | Participant URL is shown and copyable |
| Close survey button | Calls PATCH /api/admin/surveys/:id/close and updates status |

---

## 5. End-to-End Tests (Playwright)

E2E tests run against the Render staging environment.

### 5.1 Playwright Configuration

Browsers: Chromium (Desktop Chrome), Firefox (Desktop Firefox), Mobile (Pixel 5).
baseURL is read from E2E_BASE_URL environment variable (set in GitHub Actions secrets).
Screenshots and videos captured on failure.
Staging DB seeded via POST /api/test/seed (enabled only when NODE_ENV=test), called in Playwright globalSetup.

### 5.2 Participant Journey

| Scenario | Steps |
|---|---|
| Complete survey | Open link, select Q1 score, select Q2 score, submit, see confirmation |
| Last participant submits | Submit, auto-close, redirect to results with average and median |
| View results directly | Open link for closed survey, results shown immediately |
| Expired token | Open expired link, see This survey link has expired |
| Already submitted | Re-open link after submission, see You have already submitted |

### 5.3 Admin Journey

| Scenario | Steps |
|---|---|
| Login | Navigate to /admin, enter credentials, land on dashboard |
| Create team | New Team, fill name, save, team appears in list |
| Create survey | Select team + sprint label + participant count, create, copy link |
| Monitor survey | View open survey, submission count increments as responses arrive |
| Manually close | Open survey, click Close, status changes to CLOSED |
| View results | Closed survey, average and median shown per question |
| Delete team | Team list, delete, team removed |

### 5.4 Cross-Team and Regression

| Scenario | Steps |
|---|---|
| Two teams run simultaneously | Both surveys isolated; results do not bleed across teams |
| Metabase push on close | Closing survey triggers POST to mock Metabase endpoint; 200 logged |

---

## 6. Test Data and Seeding

Seed script (backend/prisma/seed.ts) creates:
- 2 Question rows (the two fixed survey questions)
- 1 default Admin account (email + password from env vars)
- 2 test teams: Team Alpha, Team Beta
- 1 open survey per team with expectedParticipants: 3
- 1 closed survey per team with pre-filled responses (scores 5, 7, 9 for Q1 and 4, 6, 8 for Q2)

---

## 7. Docker Compose for Test Database

File: docker-compose.test.yml
Service: postgres:16
Environment: POSTGRES_USER=test, POSTGRES_PASSWORD=test, POSTGRES_DB=moodtracker_test
Port: 5433:5432
Data: stored in tmpfs for speed

---

## 8. CI Pipeline (GitHub Actions)

Jobs:
1. backend-unit: runs Jest unit tests with no DB required
2. backend-integration: spins up Postgres service container, runs prisma migrate deploy, runs integration tests
3. frontend-unit: runs Vitest unit and component tests
4. e2e: runs after all other jobs pass, runs Playwright against Render staging URL from secret RENDER_STAGING_URL

Deploy workflow (deploy.yml): triggers Render deploy hook via curl POST on merge to main.