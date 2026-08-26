# ESPACIO ERP — Authentication Architecture Specification

## 1. Overview

ESPACIO ERP implements a stateless JWT-based session architecture stored securely in HTTP-only cookies. Client-side JavaScript has zero access to session tokens, mitigating XSS risks.

---

## 2. Authentication Flow

```
┌──────┐                                ┌────────────┐                         ┌──────────┐
│ User │  1. POST /api/v1/auth/login    │  Next.js   │  2. Verify Password     │ Database │
│      ├───────────────────────────────►│  Auth API  ├────────────────────────►│ (Prisma) │
│      │                                │            │◄────────────────────────┤          │
│      │                                │            │  3. Return User Record  └──────────┘
│      │                                │            │
│      │                                │            │  4. Sign JWT Session Token
│      │                                │            │  5. Set HTTP-Only Cookie
│      │  6. 200 OK (User Profile JSON) │            │
│      │◄───────────────────────────────┤            │
└──────┘                                └────────────┘
```

---

## 3. Security Requirements & Configuration

1. **Passwords**: Hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are NEVER logged or stored.
2. **Session Cookie**:
   - `HttpOnly`: True (Inaccessible via `document.cookie`).
   - `Secure`: True in Production.
   - `SameSite`: `Lax` or `Strict` (CSRF Protection).
   - `Path`: `/`.
   - `MaxAge`: Configurable via `SESSION_MAX_AGE_SECONDS` (Default: 28,800s / 8 Hours).
3. **Session Expiration**: Automatic token expiration after 8 hours. Users must re-authenticate upon expiry.
4. **Environment Variables**:
   - `JWT_SECRET`: Minimum 32-character secret key.
   - Secrets are loaded strictly via `src/config/env.ts`.

---

## 4. Protected Route & API Middleware

All incoming requests to `/api/v1/*` (except `/api/v1/auth/login`) and protected dashboard routes pass through `AuthMiddleware`:

1. Extracts session token from HTTP-only cookie.
2. Verifies JWT signature and expiry.
3. Checks user status in DB (`ACTIVE`).
4. Attaches authenticated `user` context to request payload.
5. Rejects unauthenticated requests with `401 Unauthorized`.
