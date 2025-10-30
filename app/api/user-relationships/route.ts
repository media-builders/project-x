import { NextRequest, NextResponse } from "next/server";
import { eq, or, and, inArray, ne } from "drizzle-orm";
import { db } from "@/utils/db/db";
import { userRelationshipInvites, usersTable } from "@/utils/db/schema";
import { v4 as uuidv4 } from "uuid";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

// ===================================================
// Helper: Supabase client (fixed typing for cookies)
// ===================================================
function createSupabaseClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value, options } of cookiesToSet) {
            // ✅ use safe mutation method for NextRequest
            req.cookies.set(name, value);
          }
        },
      },
    }
  );
}

// ===================================================
// GET — Fetch Invites or Team Members
// ===================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);

    if (!dbUser.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const currentUserId = dbUser[0].id;
    const currentUserEmail = dbUser[0].email;

    // ------------------------------------------------
    // MODE 1: TEAM (accepted relationships)
    // ------------------------------------------------
    if (mode === "team") {
      const acceptedRelations = await db
        .select()
        .from(userRelationshipInvites)
        .where(
          and(
            or(
              eq(userRelationshipInvites.masterUserId, currentUserId),
              eq(userRelationshipInvites.invitedUserId, currentUserId)
            ),
            eq(userRelationshipInvites.status, "accepted")
          )
        );

      if (!acceptedRelations.length)
        return NextResponse.json({ team: [] }, { status: 200 });

      const relatedUserIds = acceptedRelations
        .map((rel) =>
          rel.masterUserId === currentUserId
            ? rel.invitedUserId
            : rel.masterUserId
        )
        .filter(Boolean);

      const users = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          plan: usersTable.plan,
        })
        .from(usersTable)
        .where(inArray(usersTable.id, relatedUserIds));

      return NextResponse.json({ team: users }, { status: 200 });
    }

    // ------------------------------------------------
    // MODE 2: DEFAULT (sent + received invites)
    // ------------------------------------------------
    const sentInvites = await db
      .select()
      .from(userRelationshipInvites)
      .where(
        and(
          eq(userRelationshipInvites.masterUserId, currentUserId),
          ne(userRelationshipInvites.status, "accepted")
        )
      );

    const receivedInvites = await db
      .select()
      .from(userRelationshipInvites)
      .where(
        and(
          eq(userRelationshipInvites.invitedEmail, currentUserEmail),
          ne(userRelationshipInvites.status, "accepted")
        )
      );

    return NextResponse.json({ sentInvites, receivedInvites }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /user-relationships] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ===================================================
// POST — Secure Invite
// ===================================================
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sender = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);

    if (!sender.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const masterUserId = sender[0].id;
    const senderEmail = sender[0].email;

    const { invitedEmail, permissions } = await req.json();

    if (!invitedEmail)
      return NextResponse.json(
        { error: "Missing invitedEmail" },
        { status: 400 }
      );

    const duplicateInvite = await db
      .select()
      .from(userRelationshipInvites)
      .where(
        and(
          eq(userRelationshipInvites.masterUserId, masterUserId),
          eq(userRelationshipInvites.invitedEmail, invitedEmail)
        )
      )
      .limit(1);

    if (duplicateInvite.length) {
      return NextResponse.json(
        { message: "If the invite was valid, it will be delivered." },
        { status: 200 }
      );
    }

    const invitedUser = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, invitedEmail))
      .limit(1);

    const invitedUserId = invitedUser.length ? invitedUser[0].id : null;
    const inviteToken = uuidv4();

    await db.insert(userRelationshipInvites).values({
      masterUserId,
      inviteeEmail: senderEmail,
      invitedEmail,
      inviteToken,
      permissions: permissions ?? {},
      status: "pending",
      createdAt: new Date(),
      invitedUserId,
    });

    return NextResponse.json(
      { message: "If the invite was valid, it will be delivered." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[POST /user-relationships] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ===================================================
// PATCH — Accept Invite
// ===================================================
export async function PATCH(req: NextRequest) {
  try {
    const { inviteId } = await req.json();
    if (!inviteId)
      return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);

    if (!dbUser.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const currentUserId = dbUser[0].id;
    const currentEmail = dbUser[0].email;

    const existingInvite = await db
      .select()
      .from(userRelationshipInvites)
      .where(eq(userRelationshipInvites.id, inviteId))
      .limit(1);

    if (!existingInvite.length)
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    const invite = existingInvite[0];

    if (invite.invitedEmail !== currentEmail)
      return NextResponse.json(
        { error: "You are not authorized to accept this invite." },
        { status: 403 }
      );

    const [updatedInvite] = await db
      .update(userRelationshipInvites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        invitedUserId: currentUserId,
      })
      .where(eq(userRelationshipInvites.id, inviteId))
      .returning();

    return NextResponse.json(
      { message: "Invite accepted successfully", invite: updatedInvite },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[PATCH /user-relationships] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ===================================================
// DELETE — Remove sent or received invite
// ===================================================
export async function DELETE(req: NextRequest) {
  try {
    const { inviteId } = await req.json();
    if (!inviteId)
      return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);

    if (!dbUser.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const currentUserId = dbUser[0].id;
    const currentEmail = dbUser[0].email;

    const invite = await db
      .select()
      .from(userRelationshipInvites)
      .where(eq(userRelationshipInvites.id, inviteId))
      .limit(1);

    if (!invite.length)
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    const target = invite[0];

    // Only sender or recipient can delete, and not if accepted
    if (
      target.status === "accepted" ||
      (target.masterUserId !== currentUserId &&
        target.invitedEmail !== currentEmail)
    ) {
      return NextResponse.json(
        { error: "You are not authorized to delete this invite." },
        { status: 403 }
      );
    }

    await db
      .delete(userRelationshipInvites)
      .where(eq(userRelationshipInvites.id, inviteId));

    return NextResponse.json(
      { message: "Invite deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[DELETE /user-relationships] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
