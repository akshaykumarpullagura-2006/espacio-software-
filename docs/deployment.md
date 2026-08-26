# ESPACIO ERP — Local Network Office Deployment Guide

## 1. Deployment Architecture

ESPACIO ERP is designed to run on ESPACIO's office server (or dedicated office Windows PC) and be served securely across the local office network (LAN) to multiple client web browsers (desktops, laptops, tablets).

```
┌─────────────────────────────────────────────────────────────┐
│                    ESPACIO OFFICE PC / SERVER               │
│                                                             │
│   ┌───────────────────────┐     ┌───────────────────────┐   │
│   │ Node.js Server Process│     │   SQLite Database     │   │
│   │ (Next.js Production)  │◄───►│   dev.db (ACID file)  │   │
│   │ Port 3000 / 80        │     └───────────────────────┘   │
│   └───────────▲───────────┘                                 │
└───────────────┼─────────────────────────────────────────────┘
                │
                │ Local Office LAN (Wi-Fi / Ethernet)
                │
     ┌──────────┴──────────┬──────────────────┐
     ▼                     ▼                  ▼
┌───────────┐        ┌───────────┐      ┌───────────┐
│ Browser 1 │        │ Browser 2 │      │ Browser 3 │
│ (Hassan)  │        │ (Aahil)   │      │ (Raju)    │
└───────────┘        └───────────┘      └───────────┘
```

---

## 2. Server Setup Instructions (Windows Office PC)

### 2.1 Prerequisites
1. Node.js (v20.x or v22.x LTS installed).
2. Git installed.
3. Static Local IP assigned to the Office PC (e.g., `192.168.1.100`).

### 2.2 First-Time Installation
```powershell
# 1. Clone repository into installation directory
cd C:\ESPACIO-ERP

# 2. Install dependencies
npm install

# 3. Create production .env file
Copy-Item .env.example .env

# 4. Generate Prisma Client & Run Database Migrations
npx prisma generate
npx prisma migrate deploy

# 5. Seed default roles, permissions, and leadership accounts
npm run db:seed

# 6. Build production application bundle
npm run build
```

### 2.3 Starting Production Server
```powershell
# Start production server listening on all network interfaces (0.0.0.0:3000)
npm run start
```

---

## 3. Local Network (LAN) Configuration

1. **Static IP Configuration**: Ensure the host PC has a static IPv4 address on the office router (e.g., `192.168.1.100`).
2. **Windows Firewall Rule**:
   Allow incoming connections on Port 3000:
   ```powershell
   New-NetFirewallRule -DisplayName "ESPACIO ERP Server (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
3. **Office Browser Access**:
   Users on the office network can open their browser and navigate to:
   `http://192.168.1.100:3000`

---

## 4. Startup & Persistence (PM2 / Windows Service)

To ensure ESPACIO ERP automatically starts when the office PC powers on:
```powershell
npm install -g pm2
pm2 start npm --name "espacio-erp" -- run start
pm2 save
```
