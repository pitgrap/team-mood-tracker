# Team Mood Tracker

A web application for tracking team mood at the end of each Scrum sprint. Admins create anonymous surveys, share a single link with the team, and view aggregated results with trend charts over time. Data can optionally be pushed to an external Metabase endpoint for reporting.

## Features

- **Anonymous sprint surveys** — two fixed questions scored 1–10 (sprint satisfaction & personal mood)
- **Single shared link** — one JWT-secured URL per survey, no user accounts needed for participants
- **Auto-close** — surveys close automatically once the expected number of responses is reached
- **Admin dashboard** — manage teams and surveys via a React Admin interface
- **Team trend charts** — sparkline visualizations showing mood trends across sprints
- **Metabase integration** — optional HTTP push of results when a survey closes

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | React, TypeScript, React Admin, MUI, Vite       |
| Backend  | Node.js, Express 5, TypeScript                  |
| ORM      | Prisma                                          |
| Database | PostgreSQL                                      |
| Testing  | Jest (backend), Vitest (frontend), MSW, Supertest |

## Prerequisites

- **Node.js** ≥ 24.0.0
- **npm** (ships with Node)
- **PostgreSQL** 16+ (local install or via Docker)
- **Docker & Docker Compose** (optional, for the test database)

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd team-mood-tracker
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for both the `frontend` and `backend` workspaces.

### 3. Set up the database

Start a local PostgreSQL instance, or use the provided Docker Compose file:

```bash
docker compose -f docker-compose.test.yml up -d
```

### 4. Configure environment variables

Create a `.env` file inside the `backend/` directory:

```bash
cp backend/.env.example backend/.env  # if an example exists, otherwise create manually
```

Required variables:

| Variable              | Description                                | Example                                                    |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string               | `postgresql://test:test@localhost:5433/moodtracker_test`   |
| `JWT_SECRET`          | Secret for admin auth tokens               | `change-me-jwt-secret`                                     |
| `SURVEY_TOKEN_SECRET` | Secret for participant survey tokens       | `change-me-survey-secret`                                  |
| `FRONTEND_URL`        | URL of the frontend (for CORS)             | `http://localhost:5173`                                     |

Optional variables:

| Variable              | Description                                | Default        |
| --------------------- | ------------------------------------------ | -------------- |
| `PORT`                | Backend server port                        | `3001`         |
| `SURVEY_TOKEN_EXPIRY` | Survey link expiry duration                | `7d`           |
| `ADMIN_SEED_EMAIL`    | Email for the seeded admin account         | —              |
| `ADMIN_SEED_PASSWORD` | Password for the seeded admin account      | —              |
| `METABASE_ENDPOINT`   | External Metabase API URL                  | —              |
| `METABASE_API_KEY`    | API key for Metabase push                  | —              |

### 5. Run database migrations and seed

```bash
cd backend
npx prisma migrate dev
npm run prisma:seed      # seeds questions and admin account (requires ADMIN_SEED_EMAIL/PASSWORD)
cd ..
```

### 6. Start development servers

In two separate terminals:

```bash
# Terminal 1 — Backend (http://localhost:3001)
npm run dev --workspace=backend

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev --workspace=frontend
```

The frontend is available at [http://localhost:5173](http://localhost:5173) and the admin panel at [http://localhost:5173/admin](http://localhost:5173/admin).

## Running Tests

```bash
# Backend tests
npm test --workspace=backend

# Frontend tests
npm test --workspace=frontend
```

## Linting & Formatting

```bash
npm run lint          # ESLint across all workspaces
npm run format        # check formatting with Prettier
npm run format:fix    # auto-fix formatting
```

## Project Structure

```
team-mood-tracker/
├── backend/          # Express API + Prisma ORM
│   ├── prisma/       # Schema, migrations, seed scripts
│   └── src/          # Application source (routes, services, middleware)
├── frontend/         # React + Vite SPA
│   └── src/          # Components, admin panel, survey pages
├── docs/             # Project documentation (requirements, architecture, etc.)
└── package.json      # Root workspace config
```

## Documentation

Additional documentation lives in the [`docs/`](docs/) folder:

- [Requirements](docs/requirements.md)
- [Tech Stack & Architecture](docs/tech-stack-and-architecture.md)
- [User Stories](docs/user-stories.md)
- [Implementation Notes](docs/implementation-notes.md)
- [Testing Strategy](docs/testing-strategy.md)
- [Roadmap](docs/roadmap.md)

