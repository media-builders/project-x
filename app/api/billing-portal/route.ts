import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateStripeBillingPortalLink } from '@/utils/stripe/api';

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = await generateStripeBillingPortalLink(user.email);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to create billing portal session', error);
    return NextResponse.json({ error: 'Unable to load billing portal' }, { status: 500 });
  }
}

