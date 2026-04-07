# Team Mood Tracker - Implementation Roadmap

## Overview

| Milestone               | Stories                        | Goal                                 |
| ----------------------- | ------------------------------ | ------------------------------------ |
| M1 Technical Foundation | US-01 to US-09                 | Repo, DB, infra, CI/CD all working   |
| M2 Authentication       | US-10 to US-12                 | Admin can log in                     |
| M3 MVP                  | US-13 to US-23, US-14a, US-14b | Full working app end to end          |
| M4 Metabase Integration | US-24                          | Results pushed to external reporting |
| M5 Quality Assurance    | US-25 to US-28                 | Full test coverage, CI enforced      |

---

## M1 Technical Foundation

Goal: A deployable skeleton with repo scaffolded, database schema in place, CI pipeline green, and Render services live.

Stories:

- US-01 Repository and Monorepo Scaffold
- US-02 Database Schema and Prisma Setup
- US-03 Database Seed Script
- US-04 Environment Variable Configuration
- US-05 Docker Compose for Test Database
- US-06 Health Check Endpoint
- US-07 CORS Configuration
- US-08 CI Pipeline GitHub Actions
- US-09 Render Deployment Configuration

Done when:

- main branch deploys automatically to Render on push
- GET /api/health returns 200 OK on the live API
- CI pipeline runs lint, type-check, and test suites all green
- Database migrations run on deploy without errors
- Seed script populates the two questions and default admin account

---

## M2 Authentication

Goal: Admin login working end to end with UI, API, and JWT middleware all in place.

Stories:

- US-10 Admin Login API
- US-11 Admin Auth Middleware
- US-12 Admin Login UI

Done when:

- Admin can log in at /admin with email and password
- JWT stored in localStorage and sent with every admin API request
- Protected routes return 401 without a valid token
- Invalid credentials show an error message in the UI

---

## M3 MVP

Goal: The app is fully usable end to end.

### M3.1 Team Management

Stories: US-13 Team API CRUD, US-14 Team Management UI

### M3.2 Admin Dashboard

Stories: US-14a Admin Dashboard

### M3.3 Survey Management

Stories: US-15 Survey Token Generation, US-16 Survey API Admin, US-17 Survey Management UI

### M3.4 Participant Survey Flow

Stories: US-18 Load Survey API, US-19 Submit Responses API, US-20 Survey Form UI, US-21 Post-Submission Screens

### M3.5 Results

Stories: US-22 Results API, US-23 Results UI

### M3.6 Team Dashboard with Trends

Stories: US-14b Team Dashboard with Trends

---

## M4 Metabase Integration

Goal: Aggregated results automatically pushed to Metabase on survey close.

Stories:

- US-24 Metabase Push Service

Done when:

- Closing a survey triggers HTTP POST to Metabase
- Payload matches the defined schema
- Failed push retried once and logged; app does not crash

---

## M5 Quality Assurance

Goal: Full test coverage enforced in CI; no PR can merge without green tests.

Stories:

- US-25 Backend Unit Tests
- US-26 Backend Integration Tests
- US-27 Frontend Unit and Component Tests
- US-28 End-to-End Tests Playwright

Done when:

- Backend: 80% or more statement/function/line coverage, 75% or more branch coverage
- Frontend: 75% or more statement/function/line coverage, 70% or more branch coverage
- Playwright E2E passes on Chromium, Firefox, and Pixel 5
- All CI jobs are required checks on main

---

## Notes for the AI Agent

- M1 must be fully complete before any other milestone starts
- M2 must be complete before M3.1 because admin UI requires working auth
- M3.1 (teams) must come before M3.2 (admin dashboard) and M3.6 (team dashboard)
- M3.3 (surveys) depends on M3.1 (teams)
- M3.4 (participant flow) depends on M3.3 (surveys)
- M3.5 (results) depends on M3.4 (participant flow)
- M3.6 (team dashboard) can be built after M3.1 and M3.5
- M4 can be implemented in parallel with M5
- M5 tests should be written alongside features where possible, but the milestone is only done when all coverage thresholds are met
