# ESPACIO ERP — Developer Guide

## 1. Quick Start

### 1.1 Install Dependencies
```powershell
npm install
```

### 1.2 Setup Environment
```powershell
Copy-Item .env.example .env
```

### 1.3 Database Setup
```powershell
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed development data
npm run db:seed
```

### 1.4 Launch Development Server
```powershell
npm run dev
```
Open `http://localhost:3000` in your browser. Log in using seed credentials:
- **Email**: `hassan@espacio.com` (or `admin@espacio.com`)
- **Password**: `Password123!`

---

## 2. Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev` | Start Next.js development server with hot reload |
| `npm run build` | `prisma generate && next build` | Compile production build |
| `npm run start` | `next start` | Start production server |
| `npm run lint` | `next lint` | Run ESLint check |
| `npm test` | `vitest run` | Run automated foundation test suite |
| `npm run db:seed` | `prisma db seed` | Seed database with initial roles, permissions, settings, and users |

---

## 3. Code Standards & File Structure

- All business logic MUST be placed inside `src/modules/` services.
- Never place database queries directly inside React components.
- All API requests MUST be validated with Zod schemas in `src/validators/`.
- All financial numbers MUST use `tabular-nums` in UI tables and text components.
