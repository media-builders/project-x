'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function isActive(status?: string | null) {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export default function SubscribePage() {
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [pubKey] = useState(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  const [tableId] = useState(process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID!);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Get session/user
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      // OPTIONAL: fetch your own user record to read subscription status (if you store it)
      // For MVP, skip or set null to "not active"
      setStripeStatus(null);

      // 2) Ensure Stripe customer exists
      await fetch('/api/me/ensure-stripe-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, name: user.user_metadata?.full_name }),
      });

      // 3) Create customer session client secret
      const r = await fetch('/api/stripe/customer-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const j = await r.json();
      if (j.client_secret) setClientSecret(j.client_secret);

      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>Loading pricing…</p>;

  // If you KNOW user is already subscribed, you could redirect or show billing portal instead:
  if (isActive(stripeStatus)) {
    return (
      <div style={{ padding: 24 }}>
        <h2>You already have an active subscription.</h2>
        <a href="/app">Go to Dashboard</a>
      </div>
    );
  }

  // Render the pricing table for logged-in users
  return (
    <div style={{ padding: 24 }}>
      <h1>Choose your plan</h1>
      <stripe-pricing-table
        pricing-table-id={tableId}
        publishable-key={pubKey}
        customer-session-client-secret={clientSecret || undefined}
      />
    </div>
  );
}
