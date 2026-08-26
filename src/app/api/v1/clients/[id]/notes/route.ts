import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ClientService } from "@/modules/clients/client.service";
import { addClientNoteSchema } from "@/validators/client.schema";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "clients:manage_notes", "ADD_CLIENT_NOTE");

    const { id } = await params;
    const body = await req.json();
    const parsed = addClientNoteSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid note payload", parsed.error.format());
    }

    const note = await ClientService.addNote(id, parsed.data, session.userId);
    return successResponse(note, { message: "Internal note added" }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
