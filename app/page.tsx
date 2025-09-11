import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { Star, Check, Coins, UserCheck, Database } from "lucide-react"
import Stripe from 'stripe'

// Types
interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  price: Stripe.Price;
}

// This makes the page dynamic instead of static
export const revalidate = 3600 // Revalidate every hour

async function getStripeProducts(): Promise<StripeProduct[]> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  });

  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
    price: product.default_price as Stripe.Price
  }));
}

export default async function LandingPage() {
  const products = await getStripeProducts();

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="px-4 lg:px-6 h-16 flex items-center  bg-white border-b fixed border-b-slate-200 w-full">
        <Link className="flex items-center justify-center" href="#">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="sr-only">BrokerNest.ai</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#testimonials">
            Testimonials
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#pricing">
            Pricing
          </a>
        </nav>
        <Button className="mx-2 md:mx-4 lg:mx-6 xl:mx-10" >
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Get Started
          </Link>
        </Button>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 lg:py-32 xl:py-40">
          <div className="container px-4 md:px-6 flex flex-col md:flex-row ">
            <div className="flex flex-col space-y-4 md:w-1/2 w-full ">
              <div className="space-y-2">
                <h1 className="text-2xl  tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl/none">
                  Never Lose Another Lead Again
                </h1>
                <p className=" text-muted-foreground md:text-xl">
                  An AI-powered real estate CRM that works while you’re showing homes—auto-dialing, logging, and requalifying so no contact slips through the cracks
                </p>
              </div>
              <div className="space-x-4">
                <Button>Start Free Trial</Button>
                <Button variant="outline">Get Your AI Assistant Today</Button>
              </div>
            </div>
            <div className="w-full md:w-1/2  flex justify-center">
              <Image src="/hero.png" alt="Hero" width={500} height={500} priority />
            </div>
          </div>
        </section>
        <section aria-labelledby="features-heading" class="relative isolate overflow-hidden">
          <div class="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950"></div>

          <div class="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <div class="mx-auto max-w-3xl text-center">
              <h2 id="features-heading" class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Our Features
              </h2>
              <p class="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Built for solo agents and small teams—so you move faster, follow up smarter, and never let a lead slip.
              </p>
            </div>

            <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <!-- Feature 1 -->
              <div class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 group-hover:scale-105 transition dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/40" aria-hidden="true">
                  <!-- icon placeholder -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M3 5h3l3 7-2 4h4l3-6h5"/></svg>
                </div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">AI Dialer — Speed-to-Lead, <span class="whitespace-nowrap">&lt;60s</span></h3>
                <p class="mt-2 text-slate-600 dark:text-slate-300">Instant outreach that books while you show homes.</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• Auto-call + SMS first touch on new leads</li>
                  <li>• Smart retries at optimal times</li>
                </ul>
              </div>

              <!-- Feature 2 -->
              <div class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 group-hover:scale-105 transition dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/40" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M8 7h8M8 11h8M8 15h5M5 4h14v16H5z"/></svg>
                </div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Auto Call Logging</h3>
                <p class="mt-2 text-slate-600 dark:text-slate-300">Every detail captured without lifting a pen.</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• Records calls, outcomes, and notes automatically</li>
                  <li>• Threaded timeline for each contact</li>
                </ul>
              </div>

              <!-- Feature 3 -->
              <div class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 group-hover:scale-105 transition dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-900/40" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 8v8m-4-4h8M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"/></svg>
                </div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Lead Re-qualification Engine</h3>
                <p class="mt-2 text-slate-600 dark:text-slate-300">Breathes life into “dead” leads and uncovers hidden revenue.</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• AI re-engages old contacts with human-sounding outreach</li>
                  <li>• Books callbacks & surfaces hot intent signals</li>
                </ul>
              </div>

              <!-- Feature 4 -->
              <div class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 group-hover:scale-105 transition dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-900/40" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 9v4m0 4h.01M4 6h16l-2 12H6L4 6z"/></svg>
                </div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Compliance Guard</h3>
                <p class="mt-2 text-slate-600 dark:text-slate-300">TCPA-aware cadences that protect reputation and deliverability.</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• Opt-in/opt-out, quiet hours & DNC checks</li>
                  <li>• Templates tuned for trust (not spam)</li>
                </ul>
              </div>

              <!-- Feature 5 -->
              <div class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-100 group-hover:scale-105 transition dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:ring-fuchsia-900/40" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M13 7H7v10h10V9l-4-2zM9 11h6m-6 3h4"/></svg>
                </div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Next-Best Action</h3>
                <p class="mt-2 text-slate-600 dark:text-slate-300">Wake up to a prioritized list—just call, text, or book.</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• Intent scoring from behavior & history</li>
                  <li>• Tasks that fit a solo agent’s day</li>
                </ul>
              </div>

              <!-- Feature 6 -->
              <div class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 group-hover:scale-105 transition dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-900/40" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M8 21h8M12 17V3m7 6l-7-6-7 6"/></svg>
                </div>
                <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Plug-and-Play with Your Stack</h3>
                <p class="mt-2 text-slate-600 dark:text-slate-300">Import leads instantly and keep your tools in sync.</p>
                <ul class="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• Zapier & CSV import ready</li>
                  <li>• Calendar, email & website forms</li>
                </ul>
              </div>
            </div>

            <!-- trust strip / micro-CTA -->
            <div class="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-800/50">
              <p class="text-slate-700 dark:text-slate-200">
                Agents report faster responses, cleaner notes, and more booked appointments within the first 30 days.
              </p>
              <a href="#get-started" class="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                Start Free Trial
              </a>
            </div>
          </div>
        </section>
        <section className="w-full py-10 md:py-20 lg:py-32" id="testimonials">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-4">What Our Customers Say</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-2">&quot;I believe missing follow-ups is costing me money.&quot;</p>
                  <p className="font-semibold">- Sarah J., CEO</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-2">&quot;I believe AI can help without replacing my personal touch.&quot;</p>
                  <p className="font-semibold">- Mark T., CTO</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-2">&quot;I believe this CRM is simple enough for me to actually use.&quot;</p>
                  <p className="font-semibold">- Emily R., Operations Manager</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-10 md:py-20 lg:py-32 bg-muted" id="pricing">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-4">Pricing Plans</h2>
            <p className="text-muted-foreground text-center mb-8 md:text-xl">Choose the perfect plan for your needs</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {product.price.unit_amount 
                        ? `$${(product.price.unit_amount / 100).toFixed(2)}/${product.price.recurring?.interval}`
                        : 'Custom'}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {product.features?.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Link 
                      className="text-sm font-medium hover:underline underline-offset-4 w-full" 
                      href={`/signup?plan=${product.id}`}
                    >
                      <Button className="w-full">Start Free Trial</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="w-full py-10 md:py-20 lg:py-32 ">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Your Next Closing Is Already in Your Phone.</h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Join thousands of satisfied customers and take your business to the next level.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <Link className="btn" href="#">
                  <Button className=" p-7" >Start Free Trial</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">©BrokerNest.ai All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}