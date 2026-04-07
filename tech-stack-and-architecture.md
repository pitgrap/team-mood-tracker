# Team Mood Tracker – Tech Stack & Architecture

## 1. Hosting Platform

**[Render](https://render.com)** — single provider for all app components, free tier,
native GitHub integration (auto-deploy on push to `main`).

| Component     | Render Service Type | Notes                              |
|---------------|---------------------|------------------------------------|
| Frontend      | Static Site         | Free, CDN-backed, custom domain    |
| Backend API   | Web Service         | Free tier, sleeps after 15min idle |
| Database      | PostgreSQL          | Free tier, 1 GB storage            |

---

## 2. Tech Stack

### Frontend
| Concern       | Library / Tool                                                                  |
|---------------|---------------------------------------------------------------------------------|
| Framework     | [React](https://react.dev/) + TypeScript                                        |
| Admin UI      | [React Admin](https://marmelab.com/react-admin/)                                |
| Component lib | [MUI (Material UI)](https://mui.com/)                                           |
| Forms         | [React Hook Form](https://react-hook-form.com/)                                 |
| API mocking   | [MSW (Mock Service Worker)](https://mswjs.io/) — for tests only                 |

### Backend
| Concern       | Library / Tool                                                                  |
|---------------|---------------------------------------------------------------------------------|
| Runtime       | Node.js                                                                         |
| Framework     | [Express](https://expressjs.com/) + TypeScript                                  |
| ORM           | [Prisma](https://www.prisma.io/)                                                 |
| Auth          | JWT (`jsonwebtoken` + `express-jwt`)                                            |

### Database
| Concern       | Choice                                                                          |
|---------------|---------------------------------------------------------------------------------|
| Engine        | PostgreSQL (managed by Render)                                                  |
| Migrations    | Prisma Migrate                                                                  |

### CI/CD
| Concern       | Choice                                                                          |
|---------------|---------------------------------------------------------------------------------|
| Pipeline      | GitHub Actions                                                                  |
| Deployment    | Render deploy hook triggered on merge to `main`                                 |

---

## 3. Metabase Integration

- Metabase is **external** — the app does not connect to it directly
- After a survey closes, the backend sends a **HTTP POST** to a configured
  Metabase API endpoint
- Failed pushes are **logged and retried once**; they do not crash the app

### Metabase Payload Schema

```json
{
  "teamId": "uuid",
  "teamName": "string",
  "sprintLabel": "string",
  "surveyId": "uuid",
  "closedAt": "ISO8601 datetime",
  "results": [
    {
      "questionId": "uuid",
      "questionLabel": "string",
      "average": "number (2 decimal places)",
      "median": "number",
      "scores": [1, 7, 8, 9, 10]
    }
  ]
}
```

---

## 4. Data Model (Prisma Schema)

```prisma
model Team {
  id        String   @id @default(uuid())
  name      String   @unique
  surveys   Survey[]
  createdAt DateTime @default(now())
}

model Survey {
  id                   String       @id @default(uuid())
  sprintLabel          String
  expectedParticipants Int
  status               SurveyStatus @default(OPEN)
  token                String       @unique
  team                 Team         @relation(fields: [teamId], references: [id])
  teamId               String
  responses            Response[]
  submissions          Submission[]
  createdAt            DateTime     @default(now())
  closedAt             DateTime?

  @@unique([teamId, sprintLabel])
}

model Question {
  id        String     @id @default(uuid())
  label     String
  order     Int        @unique
  responses Response[]
}

model Response {
  id          String   @id @default(uuid())
  survey      Survey   @relation(fields: [surveyId], references: [id])
  surveyId    String
  question    Question @relation(fields: [questionId], references: [id])
  questionId  String
  score       Int
  submittedAt DateTime @default(now())
}

model Submission {
  id          String   @id @default(uuid())
  survey      Survey   @relation(fields: [surveyId], references: [id])
  surveyId    String
  tokenHash   String
  submittedAt DateTime @default(now())

  @@unique([surveyId, tokenHash])
}

model Admin {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

enum SurveyStatus {
  OPEN
  CLOSED
}
```

**Seed data (always applied on deploy):**
- Two `Question` rows: "How satisfied are you with the sprint result?" (order 1)
  and "How do you feel?" (order 2)
- One default `Admin` account (credentials supplied via env vars)

---

## 5. API Contract

All endpoints are prefixed with `/api`. JSON request and response bodies
throughout. Errors always return `{ "error": string, "code": string }`.

### Auth

| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| `POST` | `/api/admin/login` | None | `{ email, password }` | `{ token }` (JWT, 8h expiry) |

### Teams

| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| `GET` | `/api/admin/teams` | Admin JWT | — | `{ data: Team[], total: n }` |
| `POST` | `/api/admin/teams` | Admin JWT | `{ name }` | `Team` |
| `PATCH` | `/api/admin/teams/:id` | Admin JWT | `{ name }` | `Team` |
| `DELETE` | `/api/admin/teams/:id` | Admin JWT | — | `204 No Content` |

### Surveys

| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| `GET` | `/api/admin/surveys` | Admin JWT | — | `{ data: Survey[], total: n }` |
| `GET` | `/api/admin/surveys/:id` | Admin JWT | — | `Survey` |
| `POST` | `/api/admin/surveys` | Admin JWT | `{ teamId, sprintLabel, expectedParticipants }` | `Survey` + `participantUrl` |
| `PATCH` | `/api/admin/surveys/:id/close` | Admin JWT | — | `Survey` |

### Participant Survey

| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| `GET` | `/api/surveys/:token` | Survey token (URL param) | — | Survey metadata + questions |
| `POST` | `/api/surveys/:token/responses` | Survey token (URL param) | `{ responses: [{ questionId, score }] }` | `201` or results if auto-closed |
| `GET` | `/api/surveys/:token/results` | Survey token (URL param) | — | Results (only if `CLOSED`) |

### Error Codes

| Code | Meaning |
|------|---------|
| `SURVEY_CLOSED` | Submission attempted on a closed survey |
| `ALREADY_SUBMITTED` | Token has already been used to submit |
| `TOKEN_EXPIRED` | Survey token has passed its expiry |
| `SURVEY_NOT_FOUND` | No survey found for given token or ID |
| `RESULTS_NOT_READY` | Results requested while survey is still open |
| `VALIDATION_ERROR` | Request body failed validation |
| `UNAUTHORIZED` | Missing or invalid admin JWT |
| `DUPLICATE_TEAM` | Team name already exists |
| `DUPLICATE_SPRINT` | Sprint label already used for this team |
| `TEAM_HAS_SURVEYS` | Team cannot be deleted because it has surveys |

---

## 6. Environment Variables

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | Backend | Prisma PostgreSQL connection string |
| `JWT_SECRET` | Backend | Secret for signing admin JWTs |
| `SURVEY_TOKEN_SECRET` | Backend | Secret for signing participant survey tokens |
| `SURVEY_TOKEN_EXPIRY` | Backend | Token lifetime (default: "7d") |
| `METABASE_ENDPOINT` | Backend | Full URL to POST results to |
| `METABASE_API_KEY` | Backend | Bearer token for Metabase push auth |
| `ADMIN_SEED_EMAIL` | Backend | Email for the default seeded admin account |
| `ADMIN_SEED_PASSWORD` | Backend | Password for the default seeded admin account |
| `FRONTEND_URL` | Backend | Frontend base URL (for CORS + participant link generation) |
| `VITE_API_URL` | Frontend | Backend base URL |
| `RENDER_DEPLOY_HOOK` | GitHub Actions | Render webhook URL to trigger deploys |

---

## 7. Repository Structure

```
/
├── frontend/
│   ├── src/
│   │   ├── survey/
│   │   ├── admin/
│   │   ├── components/
│   │   └── mocks/
│   └── vite.config.ts
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       └── app.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker-compose.test.yml
└── render.yaml
```

---

## 8. render.yaml Structure

```yaml
services:
  - type: web
    name: mood-tracker-api
    runtime: node
    region: frankfurt
    plan: free
    buildCommand: cd backend && npm ci && npx prisma migrate deploy && npm run build
    startCommand: cd backend && npm start
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: mood-tracker-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: SURVEY_TOKEN_SECRET
        generateValue: true
      - key: SURVEY_TOKEN_EXPIRY
        value: 7d
      - key: FRONTEND_URL
        value: https://mood-tracker-frontend.onrender.com
      - key: METABASE_ENDPOINT
        sync: false
      - key: METABASE_API_KEY
        sync: false
      - key: ADMIN_SEED_EMAIL
        sync: false
      - key: ADMIN_SEED_PASSWORD
        sync: false

  - type: web
    name: mood-tracker-frontend
    runtime: static
    region: frankfurt
    plan: free
    buildCommand: cd frontend && npm ci && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://mood-tracker-api.onrender.com

databases:
  - name: mood-tracker-db
    region: frankfurt
    plan: free
    databaseName: moodtracker
```

---

## 9. Architecture Diagram

```
GitHub Repository
       │
       │  push to main
       ▼
GitHub Actions (CI)
  lint + type-check + test
       │
       │  on success → trigger Render deploy hook
       ▼
┌──────────────────────────────────────────────┐
│                   Render                     │
│                                              │
│  ┌──────────────┐    ┌──────────────────┐    │
│  │ Static Site  │    │   Web Service    │    │
│  │ React + TS   │◄──►│ Node.js/Express  │    │
│  │ (Frontend +  │    │ + Prisma (API)   │    │
│  │  React Admin)│    └────────┬─────────┘    │
│  └──────────────┘             │              │
│                      ┌────────▼──────────┐   │
│                      │    PostgreSQL     │   │
│                      │   (Prisma ORM)    │   │
│                      └───────────────────┘   │
└──────────────────────────────────────────────┘
                               │
                               │ HTTP POST (on survey close)
                               ▼
                      ┌─────────────────┐
                      │    Metabase     │
                      │   (external)    │
                      └─────────────────┘
```

---

## 10. Key Conventions for the Agent

- **Monorepo**: frontend and backend live in the same GitHub repository
- **Single `render.yaml`** at the root defines all Render services declaratively
- **Environment variables** are injected by Render at runtime — never hardcoded
- **Prisma schema** is the single source of truth for the data model
- **Questions are seeded** — never created via the UI; always exactly two
- **React Admin** handles all admin CRUD — no separate admin backend needed
- **Survey access** uses a shared short-lived JWT link; admin uses username + password with a JWT returned in the response body
- **Anonymity**: response rows store no user identity — only surveyId, questionId, score, and submittedAt
- **Duplicate submission** is prevented server-side via the Submission table (SHA-256 hash of the token, unique per survey)
