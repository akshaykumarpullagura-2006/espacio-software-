import { db } from "@/lib/db";
import { CheckDuplicateClientInput } from "@/validators/client.schema";

export interface DuplicateClientMatch {
  id: string;
  referenceNo: string;
  fullName: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  gstin: string | null;
  clientType: string;
  matchReason: string;
  confidence: number;
}

export interface DuplicateClientCheckResult {
  isDuplicate: boolean;
  score: number;
  matches: DuplicateClientMatch[];
}

export class DuplicateClientDetectionService {
  /**
   * Normalize phone number to pure digits for cross-format comparison
   */
  public static normalizePhone(phone?: string | null): string {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  /**
   * Check for possible duplicate client records across phone, email, GSTIN, and company name
   */
  public static async checkDuplicates(input: CheckDuplicateClientInput): Promise<DuplicateClientCheckResult> {
    const normPhone = this.normalizePhone(input.phone);
    const normEmail = input.email?.trim().toLowerCase();
    const normGstin = input.gstin?.trim().toUpperCase();
    const normCompany = input.companyName?.trim().toLowerCase();
    const normName = input.fullName?.trim().toLowerCase();

    if (!normPhone && !normEmail && !normGstin && !normCompany && !normName) {
      return { isDuplicate: false, score: 0, matches: [] };
    }

    const whereOr: any[] = [];

    if (normPhone && normPhone.length >= 7) {
      whereOr.push({ phone: { contains: normPhone } });
      whereOr.push({ alternatePhone: { contains: normPhone } });
    }

    if (normEmail) {
      whereOr.push({ email: { equals: normEmail, mode: "insensitive" } });
    }

    if (normGstin) {
      whereOr.push({ gstin: { equals: normGstin, mode: "insensitive" } });
    }

    if (normCompany && normCompany.length >= 3) {
      whereOr.push({ companyName: { contains: normCompany, mode: "insensitive" } });
    }

    if (normName && normName.length >= 3) {
      whereOr.push({ fullName: { contains: normName, mode: "insensitive" } });
    }

    if (whereOr.length === 0) {
      return { isDuplicate: false, score: 0, matches: [] };
    }

    const candidates = await db.client.findMany({
      where: {
        AND: [
          input.excludeId ? { id: { not: input.excludeId } } : {},
          { OR: whereOr },
        ],
      },
      select: {
        id: true,
        referenceNo: true,
        fullName: true,
        companyName: true,
        phone: true,
        alternatePhone: true,
        email: true,
        gstin: true,
        clientType: true,
      },
      take: 10,
    });

    const matches: DuplicateClientMatch[] = [];
    let highestScore = 0;

    for (const c of candidates) {
      const cPhone = this.normalizePhone(c.phone);
      const cAltPhone = this.normalizePhone(c.alternatePhone);
      const cEmail = c.email?.trim().toLowerCase();
      const cGstin = c.gstin?.trim().toUpperCase();
      const cCompany = c.companyName?.trim().toLowerCase();
      const cName = c.fullName.trim().toLowerCase();

      let matchScore = 0;
      const reasons: string[] = [];

      // 1. Phone match (highest confidence)
      if (normPhone && (normPhone === cPhone || (cAltPhone && normPhone === cAltPhone))) {
        matchScore = Math.max(matchScore, 98);
        reasons.push("Exact phone number match");
      } else if (normPhone && (cPhone.includes(normPhone) || normPhone.includes(cPhone))) {
        matchScore = Math.max(matchScore, 85);
        reasons.push("Partial phone match");
      }

      // 2. GSTIN match (definitive for business clients)
      if (normGstin && cGstin && normGstin === cGstin) {
        matchScore = Math.max(matchScore, 100);
        reasons.push("Exact GSTIN match");
      }

      // 3. Email match
      if (normEmail && cEmail && normEmail === cEmail) {
        matchScore = Math.max(matchScore, 92);
        reasons.push("Exact email address match");
      }

      // 4. Company name match
      if (normCompany && cCompany && (normCompany === cCompany || cCompany.includes(normCompany) || normCompany.includes(cCompany))) {
        matchScore = Math.max(matchScore, 80);
        reasons.push("Company name match");
      }

      // 5. Name match (only if phone is also somewhat close or same company)
      if (normName && cName && normName === cName) {
        matchScore = Math.max(matchScore, 75);
        reasons.push("Identical client name");
      }

      if (matchScore >= 75) {
        matches.push({
          id: c.id,
          referenceNo: c.referenceNo,
          fullName: c.fullName,
          companyName: c.companyName,
          phone: c.phone,
          email: c.email,
          gstin: c.gstin,
          clientType: c.clientType,
          matchReason: reasons.join(", "),
          confidence: matchScore,
        });

        highestScore = Math.max(highestScore, matchScore);
      }
    }

    // Sort matches by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      isDuplicate: matches.length > 0,
      score: highestScore,
      matches,
    };
  }
}
