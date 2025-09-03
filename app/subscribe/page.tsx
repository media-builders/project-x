// app/subscribe/page.tsx
import Image from "next/image";
import StripePricingTable from "@/components/StripePricingTable";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { createStripeCheckoutSession } from "@/utils/stripe/api";

export default async function Subscribe() {
  const supabase = createClient();

  // 1) Get user safely
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    // If something’s wrong with the session, go to login
    redirect("/auth/login");
  }
  if (!user) {
    redirect("/auth/login");
  }

  // 2) Try to create the Stripe customer session for the pricing table
  // If your function expects email, keep it; if it expects stripe_id, adapt accordingly.
  let checkoutSessionSecret: string | null = null;
  try {
    // Your existing util — leaving functionality intact
    checkoutSessionSecret = await createStripeCheckoutSession(user.email!);
  } catch (e) {
    // Don’t crash the page — the pricing table can still render without a secret
    checkoutSessionSecret = null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b border-b-slate-200 fixed w-full">
        <Image src="/logo.png" alt="logo" width={50} height={50} />
        <span className="sr-only">Acme Inc</span>
      </header>

      <div className="w-full pt-24 pb-20 lg:pt-28 lg:pb-32 xl:pt-36 xl:pb-40">
        <div className="text-center py-6 md:py-10 lg:py-12">
          <h1 className="font-bold text-xl md:text-3xl lg:text-4xl">Pricing</h1>
          <p className="pt-4 text-muted-foreground text-sm md:text-md lg:text-lg">
            Choose the right plan for your team! Cancel anytime!
          </p>
        </div>

        {/* 3) Render pricing table always for logged-in not-subscribed users.
               Your StripePricingTable should accept a nullable secret. */}
        <StripePricingTable checkoutSessionSecret={checkoutSessionSecret} />
      </div>
    </div>
  );
}
