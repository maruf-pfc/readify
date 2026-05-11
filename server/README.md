# Readify — Bookstore API

> A production-grade RESTful API for a full-stack bookstore application. Built with **TypeScript**, **Express.js**, and **PostgreSQL** — featuring JWT authentication with refresh token rotation, role-based access control, stock management, and full Swagger documentation.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Books](#books)
  - [Orders](#orders)
  - [Users](#users)
- [Authentication Flow](#authentication-flow)
- [Role-Based Access Control](#role-based-access-control)
- [Testing](#testing)
- [Docker](#docker)
- [License](#license)

---

## Features

- **JWT Auth** with access tokens (15 min) and rotating refresh tokens (7 days)
- **Logout** endpoint that invalidates refresh tokens in the database
- **Account lockout** after 3 consecutive failed login attempts (15-minute lock)
- **Role-based access control** — `ADMIN`, `STAFF`, `CUSTOMER`
- **Books** — full CRUD with soft-delete (`is_active`), search, price filtering, and pagination
- **Orders** — transactional order creation with pre-flight stock validation, ownership check for customers
- **Users** — admin-only user management (view, update role, delete)
- **Input validation** with Zod at every endpoint
- **Global error handler** — consistent JSON error responses across all routes
- **Rate limiting** with `express-rate-limit`
- **Structured logging** with `pino`
- **API documentation** with Swagger UI (`/docs`)
- **Docker** support for easy local development

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Bun |
| Framework | Express.js v5 |
| Language | TypeScript |
| Database | PostgreSQL |
| Validation | Zod |
| Auth | JWT (`jsonwebtoken`) |
| Password | bcryptjs |
| Logging | pino |
| API Docs | Swagger UI (swagger-jsdoc) |
| Testing | Jest + Supertest |
| Containerization | Docker + docker-compose |

---

## Project Structure

```
server/
├── src/
│   ├── app.ts                  # Express app setup (middleware, routes)
│   ├── server.ts               # HTTP server entry point
│   ├── config/
│   │   ├── db.ts               # PostgreSQL pool
│   │   ├── env.ts              # Zod-validated environment config
│   │   └── swagger.ts          # Swagger/OpenAPI setup
│   ├── db/
│   │   ├── index.ts            # Central DB exports
│   │   ├── schema.ts           # CREATE TABLE statements
│   │   └── seed.ts             # Seed admin user and sample books
│   ├── lib/
│   │   └── logger.ts           # Pino logger instance
│   ├── middlewares/
│   │   ├── auth.ts             # JWT authentication middleware
│   │   ├── error.ts            # Global error handler
│   │   ├── rateLimit.ts        # Rate limiter
│   │   ├── rbac.ts             # Role-based authorization middleware
│   │   ├── requestId.ts        # Request ID header middleware
│   │   └── validate.ts         # Generic Zod validation middleware
│   ├── modules/
│   │   ├── auth/               # register, login, refresh, logout, me
│   │   ├── books/              # CRUD + search + pagination
│   │   ├── orders/             # Create order (with stock check), list, update status
│   │   └── users/              # Admin: list, get, update role, delete
│   ├── routes/
│   │   └── index.ts            # Mounts all module routers
│   ├── types/                  # Shared TypeScript types
│   └── utils/
│       ├── errorResponse.ts    # AppError class
│       ├── jwt.ts              # Sign/verify JWT helpers
│       └── passwords.ts        # bcrypt hash/verify helpers
├── tests/
│   ├── setup.ts                # Test environment setup
│   ├── auth.test.ts            # Auth endpoint integration tests
│   └── books.test.ts           # Books endpoint integration tests
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 or **Bun** ≥ 1.0
- **PostgreSQL** ≥ 14 (or use Docker)

### Installation

```bash
git clone https://github.com/maruf-pfc/readify
cd readify/server
bun install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment (`development`, `test`, `production`) | `development` |
| `PORT` | Server port | `5000` |
| `CORS_ORIGIN` | Allowed origin for CORS | `*` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 20 chars) | — |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 20 chars) | — |
| `JWT_ACCESS_EXPIRES` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh token expiry | `7d` |
| `REFRESH_COOKIE_NAME` | Cookie name for refresh token | `refresh_token` |
| `LOG_LEVEL` | Pino log level | `info` |

Example `.env`:

```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

DATABASE_URL=postgres://postgres:postgres@localhost:5432/readify_db
LOG_LEVEL=info
```

### Database Setup

**Create tables:**

```bash
bun src/db/schema.ts
```

**Seed the database** (creates admin user + 2 sample books):

```bash
bun src/db/seed.ts
```

Seed admin credentials:
- Email: `admin@bookstore.com`
- Password: `maruf`

> **⚠️ Change the seed password before deploying to production.**

### Running the Server

```bash
# Development (hot reload)
bun dev

# Production
bun build
bun start
```

API will be available at: `http://localhost:5000`  
Swagger UI: `http://localhost:5000/docs`  
Health check: `http://localhost:5000/health`

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register a new user |
| `POST` | `/auth/login` | No | Login and receive tokens |
| `POST` | `/auth/refresh` | No | Rotate access + refresh tokens |
| `POST` | `/auth/logout` | No | Invalidate refresh token |
| `GET` | `/auth/me` | ✅ Bearer | Get current user profile |

**Register** — `POST /api/v1/auth/register`
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPass1!",
  "retypePassword": "StrongPass1!"
}
```

Password must be ≥ 8 characters and contain: uppercase, lowercase, digit, special character (`!@#$%^&*()_`).

**Login** — `POST /api/v1/auth/login`
```json
{
  "email": "jane@example.com",
  "password": "StrongPass1!"
}
```
Response includes `accessToken`, `refreshToken`, and user info.

**Refresh** — `POST /api/v1/auth/refresh`
```json
{ "refreshToken": "..." }
```

**Logout** — `POST /api/v1/auth/logout`
```json
{ "refreshToken": "..." }
```

---

### Books

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/books` | No | List books (search, filter, paginate) |
| `GET` | `/books/:id` | No | Get book by ID |
| `POST` | `/books` | ADMIN / STAFF | Create a book |
| `PUT` | `/books/:id` | ADMIN / STAFF | Update a book |
| `DELETE` | `/books/:id` | ADMIN | Soft-delete a book |

**Query Parameters for `GET /books`:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Search by title or author (case-insensitive) |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 10, max: 100) |

Example: `GET /api/v1/books?search=orwell&minPrice=5&maxPrice=20&page=1&limit=10`

Response:
```json
{
  "ok": true,
  "data": {
    "books": [...],
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

---

### Orders

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/orders` | ADMIN / STAFF | List all orders |
| `GET` | `/orders/mine` | CUSTOMER | List current user's orders |
| `GET` | `/orders/:id` | ADMIN / STAFF / CUSTOMER | Get order by ID (customers see own only) |
| `POST` | `/orders` | CUSTOMER | Create an order |
| `PUT` | `/orders/:id/status` | ADMIN / STAFF | Update order status |

**Create Order** — `POST /api/v1/orders`
```json
{
  "items": [
    { "book_id": 1, "quantity": 2, "price": 10.99 },
    { "book_id": 3, "quantity": 1, "price": 9.99 }
  ]
}
```

> Order creation validates: book exists, book is active, and sufficient stock is available — all inside a database transaction. Stock is decremented atomically.

**Update Status** — `PUT /api/v1/orders/:id/status`
```json
{ "status": "PAID" }
```
Valid statuses: `PENDING`, `PAID`, `CANCELLED`

---

### Users

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/users` | ADMIN | List all users |
| `GET` | `/users/:id` | ADMIN | Get user by ID |
| `PUT` | `/users/:id` | ADMIN | Update user (name, role) |
| `DELETE` | `/users/:id` | ADMIN | Delete user |

**Update User** — `PUT /api/v1/users/:id`
```json
{
  "name": "Updated Name",
  "role": "STAFF"
}
```
Valid roles: `CUSTOMER`, `STAFF`, `ADMIN`

---

## Authentication Flow

```
Client                          Server
  │                               │
  │─── POST /auth/login ─────────►│
  │◄── { accessToken,             │  (15 min TTL)
  │      refreshToken } ──────────│  (7 day TTL, stored in DB)
  │                               │
  │─── GET /protected             │
  │    Authorization: Bearer <AT>►│
  │◄── 200 OK ────────────────────│
  │                               │
  │  (access token expires)       │
  │─── POST /auth/refresh ───────►│  Send refreshToken
  │◄── { new accessToken,         │  Old refresh token invalidated
  │      new refreshToken } ──────│  New one stored in DB (rotation)
  │                               │
  │─── POST /auth/logout ────────►│  refreshToken in body
  │◄── 200 OK ────────────────────│  refresh_token = NULL in DB
```

---

## Role-Based Access Control

| Action | ADMIN | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|
| Register / Login | ✅ | ✅ | ✅ |
| View books | ✅ | ✅ | ✅ |
| Create / Update books | ✅ | ✅ | ❌ |
| Delete books | ✅ | ❌ | ❌ |
| Place orders | ❌ | ❌ | ✅ |
| View all orders | ✅ | ✅ | ❌ |
| View own orders | ✅ | ✅ | ✅ |
| Update order status | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

---

## Testing

```bash
# Run all tests
bun test

# Or with Jest
npx jest --runInBand
```

Test files are in the `tests/` directory:
- `auth.test.ts` — register, login, me, refresh, logout
- `books.test.ts` — list (paginated), create, get, update, delete

> Tests require a running PostgreSQL instance with the schema and seed applied. Set `DATABASE_URL` in a `.env.test` file or in your environment before running tests.

---

## Docker

Start the full stack (API + PostgreSQL) with Docker Compose:

```bash
cd server
docker-compose up --build
```

This will:
1. Start a PostgreSQL container
2. Build and start the API server

The API will be available at `http://localhost:5000`.

To stop:
```bash
docker-compose down
```

To reset the database volume:
```bash
docker-compose down -v
```

---

## License

Apache License 2.0 — see [LICENSE](../LICENSE) for details.
