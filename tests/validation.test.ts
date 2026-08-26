import { describe, it, expect } from "vitest";
import { loginSchema } from "../src/validators/auth.schema";

describe("Validation Schemas", () => {
  it("validates legitimate login payloads", () => {
    const valid = loginSchema.safeParse({ email: "hassan@espacio.com", password: "Password123!" });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid emails and short passwords", () => {
    const invalidEmail = loginSchema.safeParse({ email: "not-an-email", password: "Password123!" });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = loginSchema.safeParse({ email: "hassan@espacio.com", password: "123" });
    expect(shortPassword.success).toBe(false);
  });
});
