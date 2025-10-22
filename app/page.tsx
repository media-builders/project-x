import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { Star, Check, Coins, UserCheck, Database } from "lucide-react"
import Stripe from 'stripe'

import HeroSection from "@/components/frontend/HeroSection"
import IntroSection from "@/components/frontend/IntroSection"
import ROIStatsSection from "@/components/frontend/ROIStatsSection"
import BeforeAfterSection from "@/components/frontend/BeforeAfterSection"
import VSLSection from "@/components/frontend/VSLSection"
import TestCallSection from "@/components/frontend/TestCallSection"
import IntegrationSection from "@/components/frontend/IntegrationSection"
import StatsSection from "@/components/frontend/RealTimeStatsSection"
import ROICalculator from "@/components/frontend/ROICalculator"
import TestimonialsSection from "@/components/frontend/TestimonialsSection"
import FAQSection from "@/components/frontend/FAQSection"
import SecuritySection from "@/components/frontend/SecuritySection"
import Wave from "@/components/frontend/graphics/Wave"



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
      <header className="">
        <div className="header-container gradient">
          <Link className="" href="#">
            <Image src="/images/brokernest/SVG/BrokerNest - Logo - WhiteLogo.svg" alt="logo" width={35} height={35} />
            <span className="sr-only">BrokerNest.ai</span>
          </Link>
          <nav className="">
            <a className="" href="#features">
              Features
            </a>
            <a className="" href="#testimonials">
              Testimonials
            </a>
            <a className="" href="#pricing">
              Pricing
            </a>
          </nav>
          <Button className="nav-login-button" >
            <Link className="" href="/login">
              Get Started
            </Link>
          </Button>
        </div>
      </header>
        <Wave />
      <main className="no-scroll-bar">
        <HeroSection />
        <IntroSection />
        <BeforeAfterSection />
        <IntegrationSection />
        <StatsSection />
        <SecuritySection />
        <VSLSection />
        <TestCallSection />
        <section className="pricing" id="pricing">
          <div className="section-container">
            <h2 className="section-title">Pricing Plans</h2>
            <p className="section-subtitle">Choose the perfect plan for your needs</p>
            <div className="section-grid">
              {products.map((product) => (
                <Card key={product.id} className="card">
                  <CardHeader className="card-header">
                    <CardTitle className="card-name">{product.name}</CardTitle>
                    <CardDescription className="card-desc">{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pricing-card-content">
                    <p className="pricing-amount">
                      {product.price.unit_amount
                        ? `$${(product.price.unit_amount / 100).toFixed(2)}/${product.price.recurring?.interval}`
                        : "Custom"}
                    </p>
                    <ul className="pricing-features">
                      {product.features?.map((feature, index) => (
                        <li key={index} className="pricing-feature-item">
                          <Check className="check-icon" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pricing-card-footer">
                    <Link href={`/signup?plan=${product.id}`} className="pricing-link">
                      <Button className="pricing-button">Start Free Trial</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <p className="section-footer">
              Numbers mean results.
            </p>
          </div>
        </section>
        <ROIStatsSection />
        <ROICalculator />
        <TestimonialsSection />
        <FAQSection />
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row w-full shrink-0 items-center px-4">
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