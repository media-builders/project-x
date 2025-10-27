"use client"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import BNScreen from "@/public/images/brokernest/brokernestscreen.png";

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="section-container">
        <div className="bn-screen blend-screen">
          <Image
            src={BNScreen}
            alt="BrokerNest Screenshot"
            width={1200}
            height={600}
            priority
            className="object-contain"
          />
        </div>
        <h2 className="section-title">
          Your AI-powered inside sales team that calls, qualifies, and books appointments while you focus on selling more.
        </h2>
        <h3 className="section-subtitle">
          Meet BrokerNest — built by experienced real estate industry veterans specifically for professionals like you.
        </h3>
        <div className="">
          <Button size="lg">Try BrokerNest</Button>
          <Button variant="outline" size="lg">
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  )
}
