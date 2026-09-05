<div align="center">

# 🎓 TutorFlow API

**The NestJS backend powering TutorFlow — an AI-driven one-to-one tutoring platform.**

[![Production API](https://img.shields.io/badge/API-tutorflow--api.railway.app-0B7285?style=flat-square&logo=railway)](https://tutorflow-api-production.up.railway.app/api)
[![Swagger Docs](https://img.shields.io/badge/Docs-Swagger%20UI-85EA2D?style=flat-square&logo=swagger&logoColor=000)](https://tutorflow-api-production.up.railway.app/docs)
[![Backend Repo](https://img.shields.io/badge/Repo-Backend%20API-24292e?style=flat-square&logo=github)](https://github.com/Muhammed-Anees-P/tutorflow-api)
[![Frontend Repo](https://img.shields.io/badge/Repo-Frontend-24292e?style=flat-square&logo=github)](https://github.com/Muhammed-Anees-P/tutorflow-web)

</div>

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + Role-based access control |
| AI | Google Gemini (multi-key failover) |
| Email | Nodemailer (SMTP) |
| Docs | Swagger / OpenAPI |
| Deployment | Railway |

---

## ✨ Features

- JWT authentication and role-based authorization
- Tutor/student data isolation
- Student CRUD operations
- Session scheduling with pagination and double-booking prevention
- Session lifecycle validation with enforced state transitions
- Session notes
- AI-generated lesson plans, session debriefs, and progress summaries
- Gemini multi-key failover
- Session scheduling email notifications
- Soft deletion
- Swagger API documentation

---

## 🔄 Session Lifecycle

Sessions move through a strict, one-way state machine:

```
SCHEDULED → IN_PROGRESS → COMPLETED → AI_REVIEWED
```

- Only **valid transitions** are permitted — no skipping states
- Only **`SCHEDULED`** sessions can be deleted

---

## 🤖 AI Reliability

TutorFlow supports **4 Gemini API keys with automatic failover**. If one key hits its limit or fails, the system transparently retries with the next available key.

```env
GEMINI_API_KEYS=key1,key2,key3,key4
GEMINI_MODEL=your-gemini-model
```

---

## 📧 Email Notifications

When a session is scheduled, the student automatically receives an email with the tutor name, topic, and date/time.

> Email failures are logged but do **not** block session creation — the operation succeeds regardless.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM=TutorFlow <your-email@example.com>
MAIL_TIMEZONE=Asia/Kolkata
MAIL_LOCALE=en-IN
```

---

## 🔐 Test Accounts

| Role | Username | Password |
|---|---|---|
| Tutor | `tutor_one` | `123456` |
| Student | `student_one` | `123456` |
| Tutor | `tutor_two` | `123456` |
| Student | `student_two` | `123456` |

> The second tutor/student pair can be used to verify data isolation between accounts.

---

## 🚀 Getting Started

### 1. Configure environment

Create a `.env` file in the project root (see [full variable reference](#️-environment-variables) below):

```env
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY_1=your-gemini-key
...
```

> ⚠️ **Never commit `.env` files or secrets to version control.**

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run development server

```bash
pnpm run start:dev
```

### 4. Build & production

```bash
# Build
pnpm build

# Start production server
pnpm start:prod
```

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `GEMINI_API_KEY_1` – `_4` | Gemini API keys (failover order) |
| `GEMINI_MODEL` | Gemini model identifier |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (e.g. `587`) |
| `SMTP_SECURE` | Use TLS — `true` or `false` |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `MAIL_FROM` | Sender name and address |

---

## 📚 API Documentation

Interactive Swagger docs are live at:
**[https://tutorflow-api-production.up.railway.app/docs](https://tutorflow-api-production.up.railway.app/docs)**

Use Swagger UI to explore all endpoints, inspect request/response schemas, and test the API directly in your browser.

---

## 🗺️ Roadmap

Given more time, the next priorities would be:

- [ ] **End-to-end tests** — automated coverage across critical API flows
- [ ] **Real-time video conferencing** — in-app sessions without leaving TutorFlow
- [ ] **Notification center** — consolidated alerts for sessions, homework, and updates
- [ ] **Enhanced AI progress tracking** — detailed learning trend analytics with visual dashboards

---

