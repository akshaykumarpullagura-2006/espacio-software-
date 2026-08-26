import { describe, it, expect } from "vitest";
import { IdGeneratorService } from "../src/lib/id-generator";

describe("Business Reference ID Generator", () => {
  it("generates correct reference string formats for core entities", async () => {
    const year = new Date().getFullYear();

    const leadRef = await IdGeneratorService.generate("LEAD");
    expect(leadRef).toMatch(new RegExp(`^LEAD-${year}-\\d{4,}$`));

    const projRef = await IdGeneratorService.generate("PROJ");
    expect(projRef).toMatch(new RegExp(`^PROJ-${year}-\\d{4,}$`));

    const qRef = await IdGeneratorService.generate("Q");
    expect(qRef).toMatch(new RegExp(`^Q-${year}-\\d{3,}$`));

    const payRef = await IdGeneratorService.generate("PAY");
    expect(payRef).toMatch(new RegExp(`^PAY-${year}-\\d{4,}$`));

    const expRef = await IdGeneratorService.generate("EXP");
    expect(expRef).toMatch(new RegExp(`^EXP-${year}-\\d{4,}$`));
  });
});
