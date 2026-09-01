import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding Complete Enterprise Demo Data for ESPACIO ERP...");

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const now = new Date();
  const year = now.getFullYear();

  // 1. Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN", description: "Universal Super Administrator", isSystem: true },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Administrator", isSystem: true },
  });

  const pmRole = await prisma.role.upsert({
    where: { name: "PROJECT" },
    update: {},
    create: { name: "PROJECT", description: "Project Management", isSystem: true },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: "SALES" },
    update: {},
    create: { name: "SALES", description: "Sales and CRM Specialist", isSystem: true },
  });

  const financeRole = await prisma.role.upsert({
    where: { name: "FINANCE" },
    update: {},
    create: { name: "FINANCE", description: "Finance and Accounts Lead", isSystem: true },
  });

  // 2. Users
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@espacio.com" },
    update: { accessLevel: "SUPER_ADMIN", passwordHash, status: "ACTIVE" },
    create: {
      email: "superadmin@espacio.com",
      fullName: "ESPACIO Super Administrator",
      accessLevel: "SUPER_ADMIN",
      passwordHash,
      status: "ACTIVE",
      phone: "+91 98888 11111",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdmin.id, roleId: superAdminRole.id },
  });

  const hassanUser = await prisma.user.upsert({
    where: { email: "hassan@espacio.com" },
    update: { accessLevel: "ADMIN", passwordHash, status: "ACTIVE" },
    create: {
      email: "hassan@espacio.com",
      fullName: "Hassan (Finance Lead)",
      accessLevel: "ADMIN",
      passwordHash,
      status: "ACTIVE",
      phone: "+91 98480 22334",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hassanUser.id, roleId: financeRole.id } },
    update: {},
    create: { userId: hassanUser.id, roleId: financeRole.id },
  });

  const priyaUser = await prisma.user.upsert({
    where: { email: "priya.sales@espacio.com" },
    update: { accessLevel: "USER", passwordHash, status: "ACTIVE" },
    create: {
      email: "priya.sales@espacio.com",
      fullName: "Priya Sharma (Senior Consultant)",
      accessLevel: "USER",
      passwordHash,
      status: "ACTIVE",
      phone: "+91 98765 33445",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: priyaUser.id, roleId: salesRole.id } },
    update: {},
    create: { userId: priyaUser.id, roleId: salesRole.id },
  });

  const rahulUser = await prisma.user.upsert({
    where: { email: "rahul.pm@espacio.com" },
    update: { accessLevel: "USER", passwordHash, status: "ACTIVE" },
    create: {
      email: "rahul.pm@espacio.com",
      fullName: "Rahul Varma (Project Lead)",
      accessLevel: "USER",
      passwordHash,
      status: "ACTIVE",
      phone: "+91 98765 55667",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: rahulUser.id, roleId: pmRole.id } },
    update: {},
    create: { userId: rahulUser.id, roleId: pmRole.id },
  });

  // 3. Taxonomies & Dynamic Config
  const leadSources = [
    { key: "WEBSITE", name: "Official Website", displayOrder: 1 },
    { key: "INSTAGRAM", name: "Instagram Ads", displayOrder: 2 },
    { key: "REFERRAL", name: "Client Referral", displayOrder: 3 },
    { key: "ARCHITECT", name: "Architect Recommendation", displayOrder: 4 },
  ];
  for (const s of leadSources) {
    await prisma.leadSourceConfig.upsert({
      where: { key: s.key },
      update: { name: s.name },
      create: s,
    });
  }

  const propTypes = [
    { key: "APARTMENT_INTERIOR", name: "Luxury Apartment (3BHK/4BHK)", displayOrder: 1 },
    { key: "VILLA_INTERIOR", name: "Independent Villa / Duplex", displayOrder: 2 },
    { key: "COMMERCIAL_OFFICE", name: "Corporate Office & Commercial", displayOrder: 3 },
  ];
  for (const p of propTypes) {
    await prisma.propertyTypeConfig.upsert({
      where: { key: p.key },
      update: { name: p.name },
      create: p,
    });
  }

  const expenseCats = [
    { key: "MATERIAL_PROCUREMENT", name: "Raw Materials & Panels", type: "PROJECT", displayOrder: 1 },
    { key: "LABOR_CARPENTRY", name: "Carpentry & Fabrication Labor", type: "PROJECT", displayOrder: 2 },
    { key: "HARDWARE_FITTINGS", name: "Hettich / Hafele Hardware", type: "PROJECT", displayOrder: 3 },
    { key: "OFFICE_RENT", name: "Headquarters Lease & Utilities", type: "BUSINESS", displayOrder: 4 },
    { key: "SALARIES", name: "Staff Payroll & Retainers", type: "BUSINESS", displayOrder: 5 },
  ];
  for (const c of expenseCats) {
    await prisma.expenseCategoryConfig.upsert({
      where: { key: c.key },
      update: { name: c.name, type: c.type },
      create: c,
    });
  }

  // 4. Financial Accounts
  const hdfc = await prisma.financialAccount.upsert({
    where: { accountCode: "ACC-HDFC-001" },
    update: { currentBalance: 2450000 },
    create: {
      accountCode: "ACC-HDFC-001",
      name: "HDFC Current Account (Operations)",
      type: "BANK",
      bankName: "HDFC Bank Ltd",
      accountNo: "50200088991122",
      ifscCode: "HDFC0001234",
      currency: "INR",
      openingBalance: 1500000,
      currentBalance: 2450000,
      status: "ACTIVE",
    },
  });

  const cashLocker = await prisma.financialAccount.upsert({
    where: { accountCode: "ACC-CASH-001" },
    update: { currentBalance: 180000 },
    create: {
      accountCode: "ACC-CASH-001",
      name: "Central Cash Vault & Petty Reserve",
      type: "CASH",
      currency: "INR",
      openingBalance: 100000,
      currentBalance: 180000,
      status: "ACTIVE",
    },
  });

  const upiAcc = await prisma.financialAccount.upsert({
    where: { accountCode: "ACC-UPI-001" },
    update: { currentBalance: 95000 },
    create: {
      accountCode: "ACC-UPI-001",
      name: "Corporate PhonePe / Razorpay UPI",
      type: "UPI",
      currency: "INR",
      openingBalance: 50000,
      currentBalance: 95000,
      status: "ACTIVE",
    },
  });

  // 5. CRM Leads & Clients
  const lead1 = await prisma.lead.upsert({
    where: { referenceNo: `LEAD-${year}-0001` },
    update: {},
    create: {
      referenceNo: `LEAD-${year}-0001`,
      clientName: "Vikram Malhotra",
      phone: "+91 98480 11223",
      email: "vikram.malhotra@gmail.com",
      sourceKey: "INSTAGRAM",
      propertyTypeKey: "APARTMENT_INTERIOR",
      location: "Rainbow Vistas, Tower 4, Flat 1201, Kukatpally, Hyderabad",
      estimatedBudget: 3500000,
      requirement: "Complete contemporary Italian veneer finish for 3BHK with false ceiling & smart ambient lighting.",
      priority: "HIGH",
      stage: "WON",
      assignedToId: priyaUser.id,
    },
  });

  const lead2 = await prisma.lead.upsert({
    where: { referenceNo: `LEAD-${year}-0002` },
    update: {},
    create: {
      referenceNo: `LEAD-${year}-0002`,
      clientName: "Dr. Ananya Roy",
      phone: "+91 98110 55443",
      email: "dr.ananya@royhealth.in",
      sourceKey: "WEBSITE",
      propertyTypeKey: "VILLA_INTERIOR",
      location: "Gachibowli Palm Springs Villa 44, Hyderabad",
      estimatedBudget: 6800000,
      requirement: "Classical European luxury interior styling with solid teakwood paneling, walk-in closets & quartz island modular kitchen.",
      priority: "URGENT",
      stage: "QUOTATION_SENT",
      assignedToId: priyaUser.id,
    },
  });

  const lead3 = await prisma.lead.upsert({
    where: { referenceNo: `LEAD-${year}-0003` },
    update: {},
    create: {
      referenceNo: `LEAD-${year}-0003`,
      clientName: "Naveen Chari",
      phone: "+91 97000 66778",
      email: "naveen.chari@techsoft.com",
      sourceKey: "REFERRAL",
      propertyTypeKey: "APARTMENT_INTERIOR",
      location: "My Home Bhooja, Block B, Flat 2204, Hitec City",
      estimatedBudget: 4200000,
      requirement: "Minimalist Scandinavian aesthetic with PU finish shutters, acoustic media room and automated motorized blinds.",
      priority: "MEDIUM",
      stage: "SITE_VISIT_SCHEDULED",
      assignedToId: priyaUser.id,
    },
  });

  // Client 1
  const client1 = await prisma.client.upsert({
    where: { referenceNo: `CLI-${year}-0001` },
    update: {},
    create: {
      referenceNo: `CLI-${year}-0001`,
      leadId: lead1.id,
      fullName: "Vikram Malhotra",
      phone: "+91 98480 11223",
      email: "vikram.malhotra@gmail.com",
      address: "Rainbow Vistas, Tower 4, Flat 1201, Kukatpally",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500072",
      gstin: "36ABCDE1234F1Z5",
      clientType: "INDIVIDUAL",
      status: "ACTIVE",
    },
  });

  // 6. Project 1
  const project1 = await prisma.project.upsert({
    where: { referenceNo: `PROJ-${year}-0001` },
    update: {},
    create: {
      referenceNo: `PROJ-${year}-0001`,
      leadId: lead1.id,
      clientId: client1.id,
      title: "Vikram Malhotra 3BHK Turnkey Interior Execution",
      description: "Complete premium turnkey interior execution including living room veneer paneling, master bedroom acoustic wardrobe, and modular kitchen.",
      propertyTypeKey: "APARTMENT_INTERIOR",
      status: "ACTIVE",
      priority: "HIGH",
      stage: "WOOD_WORK",
      siteAddress: "Rainbow Vistas, Tower 4, Flat 1201, Kukatpally, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500072",
      contractValue: 3500000,
      revisedBudget: 3500000,
      totalExpenses: 1420000,
      netProfit: 2080000,
      profitMarginPct: 59.4,
      startDate: new Date(Date.now() - 30 * 86400000),
      targetCompletionDate: new Date(Date.now() + 60 * 86400000),
      projectManagerId: rahulUser.id,
    },
  });

  // Project Members
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project1.id, userId: rahulUser.id } },
    update: {},
    create: { projectId: project1.id, userId: rahulUser.id, role: "PROJECT_MANAGER" },
  });

  // Payment Milestones
  const m1 = await prisma.paymentMilestone.upsert({
    where: { id: `MS-${project1.id}-1` },
    update: {},
    create: {
      id: `MS-${project1.id}-1`,
      projectId: project1.id,
      title: "Booking & 3D Design Sign-Off (20%)",
      milestonePct: 20,
      amount: 700000,
      paidAmount: 700000,
      status: "PAID",
      dueDate: new Date(Date.now() - 25 * 86400000),
    },
  });

  const m2 = await prisma.paymentMilestone.upsert({
    where: { id: `MS-${project1.id}-2` },
    update: {},
    create: {
      id: `MS-${project1.id}-2`,
      projectId: project1.id,
      title: "Woodwork & Carcass Delivery (40%)",
      milestonePct: 40,
      amount: 1400000,
      paidAmount: 1400000,
      status: "PAID",
      dueDate: new Date(Date.now() - 10 * 86400000),
    },
  });

  // Client Payments
  await prisma.clientPayment.upsert({
    where: { referenceNo: `PAY-${year}-0001` },
    update: {},
    create: {
      referenceNo: `PAY-${year}-0001`,
      projectId: project1.id,
      clientId: client1.id,
      milestoneId: m1.id,
      financialAccountId: hdfc.id,
      amount: 700000,
      paymentDate: new Date(Date.now() - 25 * 86400000),
      paymentMethod: "BANK_TRANSFER",
      referenceNoExt: "NEFT-HDFC-99881122",
      status: "VERIFIED",
      notes: "Advance 20% confirmation fee received via NEFT",
    },
  });

  // 7. Quotations
  await prisma.quotation.upsert({
    where: { referenceNo: `Q-${year}-0001` },
    update: {},
    create: {
      referenceNo: `Q-${year}-0001`,
      title: "Turnkey Interior BOQ - Vikram Malhotra 3BHK",
      projectId: project1.id,
      leadId: lead1.id,
      clientId: client1.id,
      createdById: priyaUser.id,
      status: "APPROVED",
      revision: 1,
      subtotal: 2966101.69,
      taxRate: 18,
      taxAmount: 533898.31,
      totalAmount: 3500000,
      approvedAt: new Date(Date.now() - 28 * 86400000),
      approvedById: superAdmin.id,
      clientApprovedName: "Vikram Malhotra",
      termsAndConditions: "1. 20% Advance on 3D Approval\n2. 40% on Carcass Delivery\n3. 30% on Polish/Laminate Pasting\n4. 10% on Final Handover\n5. 10-Year Warranty on Hardware",
    },
  });

  // 8. Vendors & Procurement
  const vendor1 = await prisma.vendor.upsert({
    where: { referenceNo: `VEN-${year}-0001` },
    update: {},
    create: {
      referenceNo: `VEN-${year}-0001`,
      name: "Sri Sai Plywood & Hardware Supplies",
      legalName: "Sri Sai Plywood Enterprises Pvt Ltd",
      contactPerson: "Venkat Rao",
      phone: "+91 98480 12345",
      email: "sai.plywood@gmail.com",
      address: "Plot 14, Timber Depot Road, Goshamahal, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      gstin: "36ABCDE1234F1Z5",
      paymentTermsKey: "DAYS_30",
      creditLimit: 500000,
      status: "ACTIVE",
    },
  });

  // Purchase Order 1
  await prisma.purchaseOrder.upsert({
    where: { referenceNo: `PO-${year}-0001` },
    update: {},
    create: {
      referenceNo: `PO-${year}-0001`,
      projectId: project1.id,
      vendorId: vendor1.id,
      grandTotal: 385000,
      subtotal: 385000,
      status: "APPROVED",
      notes: "Commercial Marine Grade BWP Plywood 18mm & 12mm for Malhotra Project",
    },
  });

  // 9. Inventory, Materials & Warehouses
  await prisma.warehouse.upsert({
    where: { warehouseCode: "WH-0001" },
    update: {},
    create: {
      warehouseCode: "WH-0001",
      name: "Central Factory & Logistics Depot",
      type: "MAIN_GODOWN",
      address: "Industrial Area Phase 2, Jeedimetla, Hyderabad",
      city: "Hyderabad",
      status: "ACTIVE",
    },
  });

  await prisma.material.upsert({
    where: { materialCode: "MAT-2026-0001" },
    update: {},
    create: {
      materialCode: "MAT-2026-0001",
      sku: "SKU-PLY-BWP-18MM",
      name: "Century Ply Club Prime 18mm 710 BWP Marine",
      categoryKey: "PLYWOOD",
      baseUnitKey: "SHEET",
      standardCost: 3850,
      minStock: 50,
      status: "ACTIVE",
    },
  });

  // 10. Employees
  await prisma.employee.upsert({
    where: { email: rahulUser.email },
    update: {},
    create: {
      employeeNo: "EMP-2026-0001",
      user: { connect: { id: rahulUser.id } },
      fullName: rahulUser.fullName,
      email: rahulUser.email,
      phone: rahulUser.phone,
      designation: "Senior Project Lead",
      department: "OPERATIONS",
      joiningDate: new Date("2024-01-15"),
      status: "ACTIVE",
    },
  });

  // 11. Tasks
  await prisma.task.upsert({
    where: { referenceNo: `TSK-${year}-0001` },
    update: {},
    create: {
      referenceNo: `TSK-${year}-0001`,
      title: "Complete Living Room Carcass Inspection & Electrical Conduit Verification",
      description: "Inspect living room plywood frame alignment, electrical wall cutouts for TV unit, and verify switchboard depths before veneer pasting.",
      projectId: project1.id,
      assigneeId: rahulUser.id,
      createdById: superAdmin.id,
      priority: "HIGH",
      status: "IN_PROGRESS",
      startDate: new Date(Date.now() - 2 * 86400000),
      dueAt: new Date(Date.now() + 3 * 86400000),
    },
  });

  // 12. Expenses
  await prisma.expense.upsert({
    where: { referenceNo: `EXP-${year}-0001` },
    update: {},
    create: {
      referenceNo: `EXP-${year}-0001`,
      project: { connect: { id: project1.id } },
      financialAccount: { connect: { id: hdfc.id } },
      categoryKey: "MATERIAL_PROCUREMENT",
      expenseType: "PROJECT",
      description: "Bulk plywood procurement for Malhotra project living & master bedroom framing",
      paymentMethod: "BANK_TRANSFER",
      amount: 385000,
      expenseDate: new Date(Date.now() - 18 * 86400000),
      status: "APPROVED",
      createdById: rahulUser.id,
      approvedById: superAdmin.id,
      approvedAt: new Date(Date.now() - 17 * 86400000),
      vendorName: "Sri Sai Plywood & Hardware Supplies",
    },
  });

  // 13. Company Profile Settings
  await prisma.companyProfile.upsert({
    where: { id: "ESPACIO-MAIN-PROFILE" },
    update: {},
    create: {
      id: "ESPACIO-MAIN-PROFILE",
      companyName: "ESPACIO INTERIOR DESIGNS & ARCHITECTURE",
      legalName: "Espacio Living Spaces Pvt. Ltd.",
      tagline: "Ultra-Luxury Turnkey Residential & Commercial Interiors",
      phone: "+91 98480 99999",
      whatsApp: "+91 98480 99999",
      email: "contact@espacio.com",
      website: "https://espacio.com",
      addressLine: "Plot 88, Road No 36, Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      postalCode: "500033",
      gstin: "36AAACE1234F1Z8",
    },
  });

  console.log("🎉 Complete Enterprise Demo Data seeded successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
