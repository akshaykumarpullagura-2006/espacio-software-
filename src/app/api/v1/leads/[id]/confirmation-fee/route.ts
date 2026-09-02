import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ActivityService } from "@/modules/activity/activity.service";
import { AuditService } from "@/modules/audit/audit.service";
import { NotificationService } from "@/modules/notifications/notification.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "leads:write", "RECORD_CONFIRMATION_FEE");

    const { id } = await params;
    const body = await req.json();

    const amount = Number(body.amount);
    const paymentType = body.paymentType || "UPI";
    const transactionRef = typeof body.transactionRef === "string" ? body.transactionRef.trim() : null;
    const paymentDateStr = body.paymentDate || new Date().toISOString();
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const isPaid = body.isPaid !== false;

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new ValidationError("Valid confirmation fee amount is required.");
    }

    const lead = await db.lead.findUnique({
      where: { id },
      include: { client: true, project: true },
    });

    if (!lead) throw new NotFoundError("Lead not found");

    const actor = await db.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, email: true },
    });
    const actorName = actor?.fullName || actor?.email || "Admin";

    const feeMetadata = {
      amount,
      paymentType,
      transactionRef,
      paymentDate: paymentDateStr,
      notes,
      isPaid,
      recordedBy: actorName,
      recordedAt: new Date().toISOString(),
    };

    // Store in Lead activity logs
    await ActivityService.record({
      userId: session.userId,
      entityType: "Lead",
      entityId: lead.id,
      type: "PAYMENT",
      title: isPaid ? `Confirmation Fee Paid (₹${amount.toLocaleString("en-IN")})` : `Confirmation Fee Recorded (₹${amount.toLocaleString("en-IN")})`,
      description: `Payment Type: ${paymentType}${transactionRef ? ` | Ref: ${transactionRef}` : ""}${notes ? ` | Notes: ${notes}` : ""}`,
      metadata: feeMetadata,
    });

    // Record audit event
    await AuditService.logEvent({
      userId: session.userId,
      action: "LEAD_CONFIRMATION_FEE_RECORDED",
      entityType: "Lead",
      entityId: lead.id,
      newValues: feeMetadata,
    });

    // If client exists, create or link payment if needed
    // Send Notification
    await NotificationService.create({
      userId: session.userId,
      type: "PAYMENT_RECORDED",
      title: `Confirmation Fee Recorded: ${lead.referenceNo}`,
      message: `Received ₹${amount.toLocaleString("en-IN")} via ${paymentType} for ${lead.clientName}.`,
      entityType: "Lead",
      entityId: lead.id,
      actionUrl: `/leads`,
    });

    return successResponse({
      confirmationFee: feeMetadata,
      message: "Confirmation fee successfully recorded.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
