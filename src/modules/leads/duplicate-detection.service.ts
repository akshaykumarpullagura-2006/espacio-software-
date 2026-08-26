import { db } from "@/lib/db";

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  score: number; // 0-100 match confidence
  matchSignals: string[];
  matches: Array<{
    id: string;
    referenceNo: string;
    clientName: string;
    phone: string;
    email: string | null;
    stage: string;
    priority?: string;
    assignedToName?: string;
  }>;
}

export class DuplicateDetectionService {
  public static normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, "").slice(-10);
  }

  public static async checkDuplicates(params: {
    phone: string;
    email?: string | null;
    clientName?: string;
    location?: string | null;
    propertyLocation?: string | null;
    excludeLeadId?: string;
  }): Promise<DuplicateMatchResult> {
    const rawPhone = params.phone.trim();
    const normalizedPhone = this.normalizePhone(rawPhone);
    const cleanEmail = params.email ? params.email.trim().toLowerCase() : null;
    const locationVal = params.location || params.propertyLocation;

    const OR: Array<Record<string, unknown>> = [
      { phone: { contains: normalizedPhone.length >= 7 ? normalizedPhone : rawPhone } },
    ];

    if (cleanEmail && cleanEmail.length > 0) {
      OR.push({ email: { equals: cleanEmail, mode: "insensitive" } });
    }

    if (params.clientName && params.clientName.trim().length >= 3) {
      OR.push({ clientName: { contains: params.clientName.trim(), mode: "insensitive" } });
    }

    const matchedLeads = await db.lead.findMany({
      where: {
        AND: [
          { OR },
          ...(params.excludeLeadId ? [{ id: { not: params.excludeLeadId } }] : []),
        ],
      },
      include: {
        assignedTo: { select: { fullName: true } },
      },
      take: 10,
    });

    if (matchedLeads.length === 0) {
      return { isDuplicate: false, score: 0, matchSignals: [], matches: [] };
    }

    const matchSignals: string[] = [];
    let highestScore = 0;
    const confirmedMatches: typeof matchedLeads = [];

    matchedLeads.forEach((lead) => {
      const leadNormPhone = this.normalizePhone(lead.phone);
      let isMatch = false;

      if (normalizedPhone.length >= 7 && leadNormPhone === normalizedPhone) {
        matchSignals.push(`Direct phone number match (${rawPhone})`);
        highestScore = Math.max(highestScore, 98);
        isMatch = true;
      } else if (lead.phone.includes(rawPhone) || rawPhone.includes(lead.phone)) {
        matchSignals.push(`Partial phone number match (${lead.phone})`);
        highestScore = Math.max(highestScore, 85);
        isMatch = true;
      }

      if (cleanEmail && lead.email && lead.email.toLowerCase() === cleanEmail) {
        matchSignals.push(`Exact email match (${cleanEmail})`);
        highestScore = Math.max(highestScore, 95);
        isMatch = true;
      }

      if (
        params.clientName &&
        params.clientName.trim().length >= 3 &&
        lead.clientName.toLowerCase() === params.clientName.trim().toLowerCase()
      ) {
        if (locationVal && lead.location && lead.location.toLowerCase().includes(locationVal.trim().toLowerCase())) {
          matchSignals.push(`Matching client name "${lead.clientName}" and property location "${lead.location}"`);
          highestScore = Math.max(highestScore, 80);
          isMatch = true;
        } else {
          matchSignals.push(`Matching client name "${lead.clientName}"`);
          highestScore = Math.max(highestScore, 65);
          isMatch = true;
        }
      }

      if (isMatch) {
        confirmedMatches.push(lead);
      }
    });

    if (confirmedMatches.length === 0) {
      return { isDuplicate: false, score: 0, matchSignals: [], matches: [] };
    }

    return {
      isDuplicate: true,
      score: highestScore,
      matchSignals: Array.from(new Set(matchSignals)),
      matches: confirmedMatches.map((m) => ({
        id: m.id,
        referenceNo: m.referenceNo,
        clientName: m.clientName,
        phone: m.phone,
        email: m.email,
        stage: m.stage,
        priority: m.priority,
        assignedToName: m.assignedTo?.fullName,
      })),
    };
  }
}
