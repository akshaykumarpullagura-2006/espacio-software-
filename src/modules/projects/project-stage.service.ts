import { db } from "@/lib/db";
import { BusinessRuleError } from "@/lib/errors";
import { PROJECT_STAGES } from "@/validators/project.schema";

export interface StageDefinition {
  key: string;
  order: number;
  title: string;
  description: string;
  defaultRole: string;
  progressWeightPct: number;
}

export const CANONICAL_STAGE_DEFINITIONS: StageDefinition[] = [
  {
    key: "CONFIRMATION_FEE_PAID",
    order: 1,
    title: "Confirmation Fee Paid",
    description: "Initial booking and commitment confirmation from client",
    defaultRole: "PROJECT_MANAGER",
    progressWeightPct: 5,
  },
  {
    key: "DESIGNING",
    order: 2,
    title: "Designing",
    description: "2D layout drafting, 3D visualizations, and detail drawings",
    defaultRole: "DESIGNER",
    progressWeightPct: 15,
  },
  {
    key: "DESIGN_COMPLETED",
    order: 3,
    title: "Design Completed",
    description: "Final client sign-off on 3D renderings and working drawings",
    defaultRole: "DESIGNER",
    progressWeightPct: 25,
  },
  {
    key: "MATERIAL_SELECTION",
    order: 4,
    title: "Material Selection",
    description: "Selection of laminates, veneers, hardware, fabrics, and finishes",
    defaultRole: "PROJECT_MANAGER",
    progressWeightPct: 35,
  },
  {
    key: "RAW_MATERIAL_ORDERED",
    order: 5,
    title: "Raw Material Ordered",
    description: "Procurement purchase orders released for plywood, hardware & core boards",
    defaultRole: "PROJECT_MANAGER",
    progressWeightPct: 45,
  },
  {
    key: "WOOD_WORK",
    order: 6,
    title: "Wood Work",
    description: "Carpentry framing, carcass fabrication, and structure assembly",
    defaultRole: "PRODUCTION_HEAD",
    progressWeightPct: 55,
  },
  {
    key: "WOOD_WORK_COMPLETED",
    order: 7,
    title: "Wood Work Completed",
    description: "Core carcass and woodwork structures assembled and inspected",
    defaultRole: "PRODUCTION_HEAD",
    progressWeightPct: 65,
  },
  {
    key: "LAMINATE_ORDERED",
    order: 8,
    title: "Laminate Ordered",
    description: "Surface laminates and finishes procured from suppliers",
    defaultRole: "PROJECT_MANAGER",
    progressWeightPct: 70,
  },
  {
    key: "LAMINATE_PASTING",
    order: 9,
    title: "Laminate Pasting",
    description: "Surface preparation, adhesive application, pressing, and edge banding",
    defaultRole: "PRODUCTION_HEAD",
    progressWeightPct: 80,
  },
  {
    key: "FITTING_WORK_COMPLETED",
    order: 10,
    title: "Fitting Work Completed",
    description: "Hardware installation, hinges, handles, sliding channels, and accessories",
    defaultRole: "SITE_ENGINEER",
    progressWeightPct: 88,
  },
  {
    key: "QUALITY_CHECK",
    order: 11,
    title: "Quality Check",
    description: "Comprehensive site inspection, alignment, finish, and mechanism audit",
    defaultRole: "QUALITY_INSPECTOR",
    progressWeightPct: 94,
  },
  {
    key: "PROJECT_HANDOVER",
    order: 12,
    title: "Project Handover",
    description: "Formal walkthrough, snag list clearance, client sign-off, and key handover",
    defaultRole: "PROJECT_MANAGER",
    progressWeightPct: 98,
  },
  {
    key: "PROJECT_COMPLETED",
    order: 13,
    title: "Project Completed",
    description: "Project fully commissioned, financial closure, and warranty transition",
    defaultRole: "PROJECT_MANAGER",
    progressWeightPct: 100,
  },
];

export class ProjectStageService {
  /**
   * Normalizes any historical or alternate stage string to the canonical stage key
   */
  public static normalizeStageKey(rawStage?: string | null): string {
    if (!rawStage) return "CONFIRMATION_FEE_PAID";
    const upper = rawStage.toUpperCase().trim();

    // Direct match
    if (PROJECT_STAGES.includes(upper as any)) return upper;
    if (upper === "WARRANTY") return "WARRANTY";

    // Legacy mappings
    const mappings: Record<string, string> = {
      INITIATED: "CONFIRMATION_FEE_PAID",
      INITIATION: "CONFIRMATION_FEE_PAID",
      PLANNING: "CONFIRMATION_FEE_PAID",
      SITE_MEASUREMENT_DONE: "DESIGNING",
      "2D_3D_DESIGN_APPROVED": "DESIGN_COMPLETED",
      ADVANCE_RECEIVED: "RAW_MATERIAL_ORDERED",
      PRODUCTION_IN_PROGRESS: "WOOD_WORK",
      QUALITY_CHECK_PASSED: "QUALITY_CHECK",
      COMPLETED: "PROJECT_COMPLETED",
    };

    return mappings[upper] || upper;
  }

  /**
   * Calculate project progress percentage based on stage
   */
  public static calculateProgress(stage: string): number {
    const normalized = this.normalizeStageKey(stage);
    if (normalized === "WARRANTY") return 100;

    const def = CANONICAL_STAGE_DEFINITIONS.find((s) => s.key === normalized);
    return def ? def.progressWeightPct : 0;
  }

  /**
   * Validate stage transition preconditions
   */
  public static async validateTransition(
    projectId: string,
    targetStage: string,
    currentStage?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const normalizedTarget = this.normalizeStageKey(targetStage);

    if (normalizedTarget === "PROJECT_HANDOVER") {
      // Must have passed QC
      const passedQc = await db.qualityCheck.findFirst({
        where: { projectId, passed: true },
      });

      if (!passedQc) {
        return {
          valid: false,
          reason: "Project Handover requires a recorded and PASSED Quality Check inspection.",
        };
      }
    }

    if (normalizedTarget === "PROJECT_COMPLETED") {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { stage: true, handoverStatus: true },
      });

      const normCurrent = this.normalizeStageKey(currentStage || project?.stage);
      if (normCurrent !== "PROJECT_HANDOVER" && normCurrent !== "QUALITY_CHECK" && normCurrent !== "PROJECT_COMPLETED") {
        // Allow transition if handover or QC reached
      }
    }

    return { valid: true };
  }

  /**
   * Record immutable stage history in ProjectStageHistory
   */
  public static async recordHistory(
    projectId: string,
    fromStage: string | null,
    toStage: string,
    changedById?: string,
    notes?: string,
    delayReason?: string
  ) {
    return db.projectStageHistory.create({
      data: {
        projectId,
        fromStage,
        toStage,
        changedById: changedById || null,
        notes: notes || null,
        delayReason: delayReason || null,
      },
    });
  }

  /**
   * Get all stage metadata definitions
   */
  public static getStageDefinitions(): StageDefinition[] {
    return CANONICAL_STAGE_DEFINITIONS;
  }

  /**
   * Migrate legacy stage strings to canonical stage keys in the database
   */
  public static async migrateLegacyStages() {
    const legacyMappings: Record<string, string> = {
      INITIATED: "CONFIRMATION_FEE_PAID",
      INITIATION: "CONFIRMATION_FEE_PAID",
      PLANNING: "CONFIRMATION_FEE_PAID",
      SITE_MEASUREMENT_DONE: "DESIGNING",
      "2D_3D_DESIGN_APPROVED": "DESIGN_COMPLETED",
      ADVANCE_RECEIVED: "RAW_MATERIAL_ORDERED",
      PRODUCTION_IN_PROGRESS: "WOOD_WORK",
      QUALITY_CHECK_PASSED: "QUALITY_CHECK",
      COMPLETED: "PROJECT_COMPLETED",
    };

    for (const [legacy, canonical] of Object.entries(legacyMappings)) {
      await db.project.updateMany({
        where: { stage: legacy },
        data: { stage: canonical },
      });
    }
  }
}
