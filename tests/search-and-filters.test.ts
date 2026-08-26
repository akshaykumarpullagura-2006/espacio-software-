import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { SearchService } from "../src/modules/search/search.service";
import { FilterEngine, FilterGroup } from "../src/modules/search/filter-engine";
import { CommandRegistry } from "../src/modules/search/command-registry";

describe("Global Search, Advanced Filters & Command Center Module Tests", () => {
  let adminUserId: string;
  let sampleVendorId: string;
  let sampleProjectId: string;

  beforeAll(async () => {
    // Seed or get an Admin User
    let admin = await db.user.findFirst({
      where: { userRoles: { some: { role: { name: "ADMIN" } } } },
    });
    if (!admin) {
      admin = await db.user.create({
        data: {
          email: `admin-search-${Date.now()}@espacio.com`,
          fullName: "Search Admin",
          passwordHash: "hash123",
        },
      });
    }
    adminUserId = admin.id;

    // Create a Vendor record for exact reference testing
    const vendor = await db.vendor.create({
      data: {
        referenceNo: `VEN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "Venasai Plywoods Test",
        categoryKey: "PLYWOOD",
        phone: "9876543210",
        email: "venasai@test.com",
      },
    });
    sampleVendorId = vendor.id;

    // Create a Project record for exact reference testing
    const project = await db.project.create({
      data: {
        referenceNo: `PROJ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Venasai Luxury Villa Project",
        propertyTypeKey: "VILLA_INTERIOR",
        contractValue: 1500000,
        stage: "PRODUCTION_IN_PROGRESS",
      },
    });
    sampleProjectId = project.id;
  });

  it("finds exact vendor reference code and prioritizes exact match", async () => {
    const vendor = await db.vendor.findUnique({ where: { id: sampleVendorId } });
    expect(vendor).toBeDefined();

    const searchRes = await SearchService.globalSearch(adminUserId, vendor!.referenceNo);

    expect(searchRes.totalResults).toBeGreaterThan(0);
    const topResult = searchRes.results[0];
    expect(topResult.referenceNo).toBe(vendor!.referenceNo);
    expect(topResult.type).toBe("VENDOR");
    expect(topResult.relevanceScore).toBe(100);
  });

  it("finds exact project reference code and surfaces project record", async () => {
    const project = await db.project.findUnique({ where: { id: sampleProjectId } });
    expect(project).toBeDefined();

    const searchRes = await SearchService.globalSearch(adminUserId, project!.referenceNo);

    expect(searchRes.totalResults).toBeGreaterThan(0);
    const topResult = searchRes.results[0];
    expect(topResult.referenceNo).toBe(project!.referenceNo);
    expect(topResult.type).toBe("PROJECT");
    expect(topResult.relevanceScore).toBe(100);
  });

  it("performs cross-module search by name (Venasai) across Vendors and Projects", async () => {
    const searchRes = await SearchService.globalSearch(adminUserId, "Venasai");

    expect(searchRes.totalResults).toBeGreaterThanOrEqual(2);
    const types = searchRes.results.map((r) => r.type);
    expect(types).toContain("VENDOR");
    expect(types).toContain("PROJECT");
  });

  it("supports structured query syntax (Projects: Venasai)", async () => {
    const searchRes = await SearchService.globalSearch(adminUserId, "Projects: Venasai");

    expect(searchRes.results.length).toBeGreaterThan(0);
    expect(searchRes.results.every((r) => r.type === "PROJECT")).toBe(true);
  });

  it("builds valid Prisma filter logic using FilterEngine", () => {
    const filterGroup: FilterGroup = {
      id: "group-1",
      logicalOperator: "AND",
      conditions: [
        { id: "c1", field: "contractValue", operator: "GREATER_THAN", value: 500000 },
        { id: "c2", field: "stage", operator: "IS", value: "PRODUCTION_IN_PROGRESS" },
      ],
    };

    const prismaWhere = FilterEngine.buildPrismaWhere(filterGroup);

    expect(prismaWhere).toBeDefined();
    expect(prismaWhere.AND).toBeDefined();
    expect(prismaWhere.AND.length).toBe(2);
    expect(prismaWhere.AND[0]).toEqual({ contractValue: { gt: 500000 } });
    expect(prismaWhere.AND[1]).toEqual({ stage: "PRODUCTION_IN_PROGRESS" });
  });

  it("builds OR logical filter logic correctly", () => {
    const filterGroup: FilterGroup = {
      id: "group-2",
      logicalOperator: "OR",
      conditions: [
        { id: "c1", field: "name", operator: "CONTAINS", value: "Venasai" },
        { id: "c2", field: "name", operator: "CONTAINS", value: "Plywood" },
      ],
    };

    const prismaWhere = FilterEngine.buildPrismaWhere(filterGroup);

    expect(prismaWhere.OR).toBeDefined();
    expect(prismaWhere.OR.length).toBe(2);
  });

  it("filters accessible Command Center options according to user RBAC", async () => {
    const commands = await CommandRegistry.getAccessibleCommands(adminUserId);

    expect(commands.length).toBeGreaterThan(5);
    const createCommands = commands.filter((c) => c.category === "CREATE");
    expect(createCommands.length).toBeGreaterThan(0);

    const projectCommands = await CommandRegistry.getAccessibleCommands(adminUserId, "Projects");
    expect(projectCommands.every((c) => c.title.toLowerCase().includes("project") || c.subtitle?.toLowerCase().includes("project") || c.keywords?.some((k) => k.toLowerCase().includes("project")))).toBe(true);
  });

  it("stores and retrieves saved filter views", async () => {
    const savedView = await db.savedView.create({
      data: {
        userId: adminUserId,
        entityType: "PROJECT",
        name: "Active High Value Projects",
        filterRules: JSON.stringify({
          logicalOperator: "AND",
          conditions: [{ field: "contractValue", operator: "GREATER_THAN", value: 1000000 }],
        }),
        visibility: "PRIVATE",
      },
    });

    expect(savedView.id).toBeDefined();
    expect(savedView.name).toBe("Active High Value Projects");

    const fetched = await db.savedView.findMany({
      where: { userId: adminUserId, entityType: "PROJECT" },
    });
    expect(fetched.some((v) => v.id === savedView.id)).toBe(true);
  });
});
