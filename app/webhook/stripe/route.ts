import { db } from '@/utils/db/db';
import { usersTable } from '@/utils/db/schema';
import { eq } from "drizzle-orm";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") as string;
  const body = await req.text(); // raw body required for verification

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET! // from your Stripe dashboard
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        const customerId = subscription.customer as string;

        await db
          .update(usersTable)
          .set({ plan: priceId })
          .where(eq(usersTable.stripe_id, customerId));

        break;
      }

      case 'customer.subscription.updated':
        console.log("Subscription updated", event);
        break;

      case 'customer.subscription.deleted':
        console.log("Subscription deleted", event);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response('✅ Success', { status: 200 });
  } catch (err) {
    console.error("❌ DB update error:", err);
    return new Response("Webhook error", { status: 500 });
  }
}
