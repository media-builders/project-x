
- Full sign up/ sign in/ logout/ forget password/ password reset flow
- Oauth with Google and Github
- Utilize Stripe Pricing Table and Stripe Checkout to setup customer billing
- Integration with Stripe Customer Portal to allow users to manage billing settings
- Protected routes under /dashboard
- Drizzle ORM/Postgres integration
- Tailwind CSS/shadcn
- Stripe webhooks/ API hook to get customer current plan

## Getting Started

As we will be setting up both dev and prod environments, simply use `.env.local` to develop locally and `.env` for production environments

### Setup Supabase
1. Create a new project on [Supabase](https://app.supabase.io/)
2. ADD `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your .env file
3. 
![image](https://github.com/user-attachments/assets/c8eb5236-96f1-4824-9998-3c54a4bcce12)
4. Add `NEXT_PUBLIC_WEBSITE_URL` to let Supabase know where to redirect the user after the Oauth flow(if using oauth).

#### Setup Google OAUTH Social Auth
You can easily set up social auth with this template. First navigate to google cloud and create a new project. All code is written. You just need to add the `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to your `.env` file.

1. Follow these [instructions](https://supabase.com/docs/guides/auth/social-login/auth-google?queryGroups=environment&environment=server) to set up Google OAuth.

#### Setup Github OAUTH Social Auth
You can easily set up social auth with this template. First navigate to google cloud and create a new project. All code is written. You just need to add the `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` to your `.env` file.

1. Follow these [instructions](https://supabase.com/docs/guides/auth/social-login/auth-github?queryGroups=environment&environment=server) to set up Github OAuth.

### Setup Postgres DB
You can use any Postgres db with this boilerplate code. Feel free to use [Vercel's Marketplace](https://vercel.com/marketplace) to browse through a collection of first-party services to add to your Vercel project.

Add `DATABASE_URL` to `.env` file e.g `postgresql://${USER}:${PASSWORD}@xxxx.us-east-2.aws.neon.tech/saas-template?sslmode=require`
### Setup OAuth with Social Providers

#### Setup redirect url
1. Go to Supabase dashboard
2. Go to Authentication > Url Configuration
3. Place production url into "Site URL".
<img width="1093" alt="image" src="https://github.com/user-attachments/assets/c10a5233-ad47-4005-b9ae-ad80fc626022">



### Setup Stripe

In order to collect payments and setup subscriptions for your users, we will be making use of [Stripe Checkout](https://stripe.com/payments/checkout) and [Stripe Pricing Tables](https://docs.stripe.com/payments/checkout/pricing-table) and [Stripe Webhooks](https://docs.stripe.com/webhooks)

1. [Register for Stripe](https://dashboard.stripe.com/register)
2. get your `STRIPE_SECRET_KEY` key and add it to `.env`. Stripe has both a Test and Production API key. Once you verify your business on Stripe, you will be able to get access to production mode in Stripe which would come with a production API key. But until then, we can use [Stripe's Test Mode](https://docs.stripe.com/test-mode) to build our app

![image](https://github.com/user-attachments/assets/01da4beb-ae1d-45df-9de8-ca5e2b2c3470)

4. Open up `stripeSetup.ts` and change your product information
5. run `npm run stripe:setup` to setup your Stripe product
6. [Create a new Pricing Table](https://dashboard.stripe.com/test/pricing-tables) and add your newly created products
7. When creating your new Pricing Table, set the *Confirmation Page* to *Don't show confirmation page*. Add [YOUR_PUBLIC_URL/subscribe/success](YOUR_PUBLIC_URL/subscribe/success) as the value(use [http://localhost:3000/subscribe/success](http://localhost:3000/subscribe/success) for local development). This will redirect the user to your main dashboard when they have completed their checkout. For prod, this will be your public url

![image](https://github.com/user-attachments/assets/af8e9dda-3297-4e04-baa0-de7eac2a1579)


8. Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` to `.env` 
![image](https://github.com/user-attachments/assets/3b1a53d3-d2d4-4523-9e0e-87b63d9108a8)

Your pricing table should now be set up

### Setup Database
This boilerplate uses Drizzle ORM to interact with a PostgresDb. 

Before we start, please ensure that you have `DATABASE_URL` set.

To create the necessary tables to start, run `npm run db:migrate`

#### To alter or add a table
1. navigate to `/utils/db/schema.ts`
2. Edit/add a table
3. run `npm run db:generate` to generate migration files
4. run `npm run db:migrate` to apply migration

### Persisted Notification History
The dashboard now surfaces toast notifications from a persisted `notifications` table so users see important events even after they log out.

1. **Create/migrate the table** – if you ran the raw SQL already, generate a Drizzle migration so it’s tracked:  
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   The schema lives in `utils/db/schema.ts` (`notificationsTable`).
2. **Persist from the server** – import and call `createNotification` from `@/lib/notifications` in any server/API/worker code that should log a durable notification (e.g. call queue jobs, billing hooks, background tasks). Client toasts still call `show()` but set `persist: false` so they don’t double-write.
3. **Client sync** – the dashboard bootstrap (`ToastLayoutClient`) receives initial rows server-side and the provider exposes REST helpers:
   - `POST /api/notifications` – create (used by `ToastProvider` when `persist !== false`)
   - `PATCH /api/notifications` – mark one or more notifications as read (`{ ids?: string[] }`)
   - `DELETE /api/notifications` – clear notifications (`{ ids?: string[] }` optional)
4. **Optional realtime** – subscribe to Supabase Realtime on `public.notifications` filtered by `user_id` if you want newly inserted rows (e.g. from the queue worker) to appear instantly in open sessions.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Setup Stripe for Local Development
To receive webhook events from Stripe while developing locally, follow these steps:

1. **Install the Stripe CLI**  
Download and install the [Stripe CLI](https://docs.stripe.com/stripe-cli) if you haven’t already. This tool allows your local server to receive webhook events from Stripe.

2. **Start the webhook listener**  
Run the following command to forward Stripe events to your local server:

```bash
npm run stripe:listen
```

This command starts the Stripe CLI in listening mode and forwards incoming webhook events to `http://localhost:3000/webhook/stripe`. 

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
