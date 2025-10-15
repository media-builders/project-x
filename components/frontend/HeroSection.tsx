"use client"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <section className="w-full py-20 lg:py-32 bg-white text-center">
      <div className="container px-4 md:px-6">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Your AI-powered inside sales team that calls, qualifies, and books appointments while you focus on selling more.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Meet BrokerNest — built by experienced real estate industry veterans specifically for professionals like you.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg">Try BrokerNest</Button>
          <Button variant="outline" size="lg">
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  )
}
