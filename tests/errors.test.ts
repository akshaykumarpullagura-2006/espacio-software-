import { describe, it, expect } from "vitest";
import { AppError, AuthError, ForbiddenError, ValidationError } from "../src/lib/errors";

describe("Application Error Hierarchy", () => {
  it("instantiates errors with proper status codes and error codes", () => {
    const valErr = new ValidationError("Invalid field");
    expect(valErr.statusCode).toBe(400);
    expect(valErr.code).toBe("VALIDATION_ERROR");

    const authErr = new AuthError();
    expect(authErr.statusCode).toBe(401);
    expect(authErr.code).toBe("UNAUTHENTICATED");

    const forbiddenErr = new ForbiddenError();
    expect(forbiddenErr.statusCode).toBe(403);
    expect(forbiddenErr.code).toBe("FORBIDDEN");
  });
});
