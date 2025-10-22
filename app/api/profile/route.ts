import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import { usersTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));

  return NextResponse.json({
    name:
      dbUser?.name ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      '',
    email: user.email ?? '',
    crmApiKey: dbUser?.crm_api_key ?? '',
  });
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, crmApiKey } = body as { name?: string; crmApiKey?: string };

  try {
    if (name && name.trim().length > 0) {
      await supabase.auth.updateUser({
        data: { full_name: name },
      });

      await db
        .update(usersTable)
        .set({ name })
        .where(eq(usersTable.id, user.id));
    }

    if (typeof crmApiKey === 'string') {
      await db
        .update(usersTable)
        .set({ crm_api_key: crmApiKey })
        .where(eq(usersTable.id, user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update profile', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

