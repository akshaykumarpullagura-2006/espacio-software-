async function verifyAllSections() {
  console.log("🔍 Verifying all ESPACIO ERP Sections & API Endpoints...\n");

  // 1. Authenticate
  const loginRes = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "superadmin@espacio.com", password: "Password123!" }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie || loginRes.status !== 200) {
    console.error("❌ Login failed:", loginRes.status);
    process.exit(1);
  }
  console.log("✅ Authenticated as Super Administrator (Session Cookie acquired)");

  // 2. Sections to verify
  const routes = [
    { name: "Dashboard", url: "http://localhost:3000/dashboard" },
    { name: "Quotations Studio & Registry", url: "http://localhost:3000/quotations" },
    { name: "New Quotation Page", url: "http://localhost:3000/quotations/new" },
    { name: "CRM Leads", url: "http://localhost:3000/leads" },
    { name: "Clients Directory", url: "http://localhost:3000/clients" },
    { name: "Projects Workspace", url: "http://localhost:3000/projects" },
    { name: "Finance Hub", url: "http://localhost:3000/finance/overview" },
    { name: "Client Payments", url: "http://localhost:3000/payments" },
    { name: "Expenses Management", url: "http://localhost:3000/expenses" },
    { name: "Procurement & Purchase Orders", url: "http://localhost:3000/procurement" },
    { name: "Inventory & Materials", url: "http://localhost:3000/inventory" },
    { name: "Employees & HR", url: "http://localhost:3000/employees" },
    { name: "Tasks & Operations", url: "http://localhost:3000/tasks" },
    { name: "Documents Vault", url: "http://localhost:3000/documents" },
    { name: "Calendar & Schedule", url: "http://localhost:3000/calendar" },
    { name: "Reports & Analytics", url: "http://localhost:3000/reports" },
    { name: "Settings Hub", url: "http://localhost:3000/settings" },
    { name: "User Management Settings", url: "http://localhost:3000/settings/users" },
    { name: "Audit Logs", url: "http://localhost:3000/audit-logs" },
  ];

  const apiEndpoints = [
    { name: "Auth Me API", url: "http://localhost:3000/api/v1/auth/me" },
    { name: "Quotations API", url: "http://localhost:3000/api/v1/quotations" },
    { name: "Leads API", url: "http://localhost:3000/api/v1/leads" },
    { name: "Projects API", url: "http://localhost:3000/api/v1/projects" },
    { name: "Finance Overview API", url: "http://localhost:3000/api/v1/finance/overview" },
    { name: "System Health API", url: "http://localhost:3000/api/v1/health" },
  ];

  let failedCount = 0;

  console.log("\n--- UI SECTION ROUTES ---");
  for (const r of routes) {
    const start = Date.now();
    try {
      const res = await fetch(r.url, { headers: { Cookie: cookie } });
      const duration = Date.now() - start;
      if (res.status === 200) {
        console.log(`✅ [${res.status}] ${r.name.padEnd(30)} -> ${duration}ms`);
      } else {
        console.error(`❌ [${res.status}] ${r.name.padEnd(30)} -> ${duration}ms`);
        failedCount++;
      }
    } catch (err: any) {
      console.error(`❌ [ERROR] ${r.name}:`, err.message);
      failedCount++;
    }
  }

  console.log("\n--- CORE API ENDPOINTS ---");
  for (const a of apiEndpoints) {
    const start = Date.now();
    try {
      const res = await fetch(a.url, { headers: { Cookie: cookie } });
      const duration = Date.now() - start;
      if (res.status === 200) {
        console.log(`✅ [${res.status}] ${a.name.padEnd(30)} -> ${duration}ms`);
      } else {
        console.error(`❌ [${res.status}] ${a.name.padEnd(30)} -> ${duration}ms`);
        failedCount++;
      }
    } catch (err: any) {
      console.error(`❌ [ERROR] ${a.name}:`, err.message);
      failedCount++;
    }
  }

  console.log("\n==================================================");
  if (failedCount === 0) {
    console.log("🎉 ALL SECTIONS & APIS VERIFIED: 100% OPERATIONAL & FAST");
  } else {
    console.error(`⚠️ ${failedCount} routes failed verification.`);
    process.exit(1);
  }
  console.log("==================================================");
}

verifyAllSections().catch(console.error);
