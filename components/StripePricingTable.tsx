'use client';

type Props = {
  checkoutSessionSecret?: string; // optional
};

export default function StripePricingTable({ checkoutSessionSecret }: Props) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID!;

  return (
    <div className="container mx-auto px-4">
      <stripe-pricing-table
        pricing-table-id={pricingTableId}
        publishable-key={publishableKey}
        {...(
          checkoutSessionSecret
            ? { 'customer-session-client-secret': checkoutSessionSecret }
            : {}
        )}
      />
    </div>
  );
}
