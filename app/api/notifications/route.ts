import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  createNotification,
  listNotificationsForUser,
  markNotificationsRead,
  clearNotifications,
  NotificationVariant,
} from "@/lib/notifications";

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const limitParam = params.get("limit");
  const includeRead = params.get("includeRead") !== "false";

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, limitParam ? Number.parseInt(limitParam, 10) || 0 : 50),
  );

  const notifications = await listNotificationsForUser(user.id, {
    limit,
    includeRead,
  });

  return NextResponse.json({ data: notifications });
}

type PostPayload = {
  userId?: string;
  title?: string | null;
  message?: string;
  variant?: NotificationVariant;
  metadata?: Record<string, unknown> | null;
};

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = (await request.json().catch(() => null)) as PostPayload | null;
  if (!body || !body.message || body.message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  const targetUserId = body.userId ?? user?.id;
  if (!targetUserId) {
    return NextResponse.json(
      { error: "Unable to determine notification owner" },
      { status: 400 },
    );
  }

  const variant: NotificationVariant = body.variant ?? "default";
  const availableVariants: NotificationVariant[] = [
    "default",
    "success",
    "error",
    "warning",
  ];
  const normalizedVariant = availableVariants.includes(variant)
    ? variant
    : "default";

  const notification = await createNotification({
    user_id: targetUserId,
    title: body.title ?? null,
    message: body.message.trim(),
    variant: normalizedVariant,
    metadata: body.metadata ?? null,
  });

  return NextResponse.json({ data: notification }, { status: 201 });
}

type PatchPayload = {
  ids?: string[];
};

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PatchPayload | null;
  const ids = Array.isArray(body?.ids)
    ? body?.ids.filter((id) => typeof id === "string" && id.length > 0)
    : undefined;

  const count = await markNotificationsRead(user.id, ids);
  return NextResponse.json({ updated: count });
}

type DeletePayload = {
  ids?: string[];
};

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as DeletePayload | null;
    ids = Array.isArray(body?.ids)
      ? body?.ids.filter((id) => typeof id === "string" && id.length > 0)
      : undefined;
  }

  const count = await clearNotifications(user.id, ids);
  return NextResponse.json({ deleted: count });
}
