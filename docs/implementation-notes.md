# Team Mood Tracker - Implementation Notes

## 1. Frontend Route Map

| Route                    | Page                                                   | Auth Required                        |
| ------------------------ | ------------------------------------------------------ | ------------------------------------ |
| /                        | Home / landing page                                    | None                                 |
| /survey/:token           | Participant survey form                                | Survey token in URL                  |
| /survey/:token/waiting   | Waiting for all responses screen                       | Survey token                         |
| /survey/:token/results   | Results page                                           | Survey token                         |
| /survey/:token/expired   | Survey link expired screen                             | None                                 |
| /survey/:token/submitted | Already submitted screen                               | None                                 |
| /admin                   | Admin login page / dashboard                           | None (login) / Admin JWT (dashboard) |
| /admin/teams             | Team list and management                               | Admin JWT                            |
| /admin/teams/:id/show    | Team dashboard with trends                             | Admin JWT                            |
| /admin/teams/create      | Create team form                                       | Admin JWT                            |
| /admin/teams/:id         | Edit team form                                         | Admin JWT                            |
| /admin/surveys           | Survey list with status badges                         | Admin JWT                            |
| /admin/surveys/create    | Create survey form                                     | Admin JWT                            |
| /admin/surveys/:id/show  | Survey detail, participant link, results, close button | Admin JWT                            |

Routing library: React Router v7. React Admin handles admin sub-routes internally. Auth guard: RequireAdmin (via React Admin's `requireAuth`) checks for valid admin JWT in localStorage and redirects to login if missing.

## 2. Duplicate Submission Prevention

Chosen mechanism: server-side Submission record using a browser-generated participant ID. The frontend generates a random participant ID on first visit and persists it in localStorage. On submission, the participant ID is sent in the request body. The backend computes a SHA-256 hash of the participant ID and stores it in the Submission table. Before saving responses, the API checks whether a hash already exists for that survey. No user identity is stored.

Prisma model: Submission with fields id (uuid), surveyId (string), tokenHash (string), submittedAt (DateTime). Unique constraint on [surveyId, tokenHash]. The `submissions` relation is defined on the Survey model.

Server-side logic: verify survey token (JWT in URL), extract participantId from request body, compute SHA-256(participantId), check Submission table, if found return 409 ALREADY_SUBMITTED, else save Response rows and Submission row in a transaction, check if submission count equals expectedParticipants and auto-close if so.

## 3. Admin Authentication Transport

Chosen: Authorization Bearer token header. On successful POST /api/admin/login the API returns { token } in the response body. Frontend stores token in localStorage under mood_tracker_admin_token. Token expiry 8 hours. On 401 frontend clears localStorage and redirects to /admin.

## 4. React Admin Custom Data Provider

A custom provider must be implemented at frontend/src/admin/dataProvider.ts. Method mapping: getList teams maps to GET /api/admin/teams, getOne to GET /api/admin/teams/:id, create to POST /api/admin/teams, update to PATCH /api/admin/teams/:id, delete to DELETE /api/admin/teams/:id, getList surveys to GET /api/admin/surveys, getOne surveys to GET /api/admin/surveys/:id, create surveys to POST /api/admin/surveys.

The data provider injects Authorization Bearer token on every request, maps the React Admin response shape { data, total }, and handles 401 by calling authProvider.logout(). A matching authProvider.ts implements login, logout, checkAuth, checkError, and getIdentity.

## 5. Participant URL Format

The participant survey link uses the token as a path parameter: https://frontend-domain/survey/JWT-token. The full URL is returned by POST /api/admin/surveys in the field participantUrl. Frontend base URL is available to the backend via FRONTEND_URL env variable.

## 6. CORS Configuration

Apply cors middleware globally in backend/src/app.ts with origin from FRONTEND_URL, methods GET POST PATCH DELETE, allowedHeaders Content-Type and Authorization, credentials false. Add cors and @types/cors to backend dependencies.

## 7. Prisma Seed Idempotency

All seed operations use upsert. Throw a descriptive error if ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD are not set. Upsert both questions by order field and upsert admin by email.

## 8. Results Page Score Display Format

Individual scores displayed as horizontal bar chart per question using MUI LinearProgress. Each question shows label, average (2 decimal places), median, and score distribution table for scores 1 to 10 with bar proportional to count.

## 9. Team Deletion Cascade Behaviour

Block deletion if team has any surveys. DELETE /api/admin/teams/:id returns 409 TEAM_HAS_SURVEYS if team has surveys. No onDelete set on Survey-Team relation (default RESTRICT in Postgres).

## 10. Pagination on Admin List Endpoints

Query parameters: page defaulting to 1, perPage defaulting to 25. Response shape: { "data": [...], "total": 42 }. Affects GET /api/admin/teams and GET /api/admin/surveys.

## 11. Health Check Endpoint

GET /api/health returns 200 { "status": "ok" }. Registered before any auth middleware. No authentication required.

## 12. Node.js Version Consistency

Use Node.js v24 throughout. .nvmrc at repo root contains 24. Both package.json files include engines node >=24.0.0. render.yaml inherits version from .nvmrc automatically.
