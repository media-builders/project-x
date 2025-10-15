"use client"

import React from "react"
import { Coins, UserCheck, Database } from "lucide-react"

interface Feature {
  icon: React.ElementType
  title: string
  short: string
  description: string
  points: string[]
}

const features: Feature[] = [
  {
    icon: Coins,
    title: "AI Dialer — Speed-to-Lead in 60 Seconds",
    short: "Stop losing deals to faster agents.",
    description:
      "The system instantly calls and texts new leads the moment they hit your CRM, so you’re the first to respond—even when you’re in a showing.",
    points: [
      "Multi-channel outreach (voice + SMS) in seconds",
      "Smart retry engine—calls back at the best times until connected",
      "Hands-free booking of live appointments",
    ],
  },
  {
    icon: UserCheck,
    title: "Auto Call Logging & Follow-Up Timeline",
    short: "Never worry about forgetting who said what.",
    description:
      "Every call, text, and note is automatically captured, organized, and threaded to the right contact. You get one clear timeline—no more sticky notes or lost scraps of paper.",
    points: [
      "Voice-to-text notes recorded instantly",
      "Daily digest of all calls and outcomes in your inbox",
      "One-click view of the entire relationship history",
    ],
  },
  {
    icon: Database,
    title: "Lead Requalification Engine",
    short: "Turn “dead” leads into booked appointments.",
    description:
      "Your database is full of hidden money. The system re-engages old leads with natural, human-sounding outreach that feels personal—not robotic.",
    points: [
      "Re-engages past internet leads & sphere-of-influence",
      "Detects buyer/seller intent from replies & actions",
      "Auto-books callbacks when interest resurfaces",
    ],
  },
  {
    icon: Database,
    title: "Compliance Guard (TCPA Safe)",
    short: "Protect your reputation, brand, and wallet.",
    description:
      "Every text, call, and outreach workflow is designed to meet TCPA guidelines so you don’t get hit with fines or risk looking “spammy.”",
    points: [
      "Automatic opt-in/opt-out management",
      "Quiet hours + Do Not Call scrubbing built in",
      "Templates tuned to sound like you, not a robot",
    ],
  },
  {
    icon: Database,
    title: "Next-Best Action Dashboard",
    short: "Wake up every morning knowing exactly what to do.",
    description:
      "The CRM prioritizes your tasks based on intent signals, timing, and conversation history. No more guesswork—just a short, focused list that keeps your pipeline moving.",
    points: [
      "AI ranks leads daily by urgency and likelihood",
      "Generates call, text, and follow-up reminders automatically",
      "Helps solo agents stay consistent without overwhelm",
    ],
  },
  {
    icon: Database,
    title: "One-Day Setup & Solo-Friendly Onboarding",
    short: "No “set-up tax,” no headaches.",
    description:
      "Other CRMs bury you in training videos. This one comes pre-loaded with real estate-specific templates and workflows.",
    points: [
      "Done-for-you setup with plug-and-play flows",
      "Import leads via CSV or CRM in seconds",
      "Simple UI designed for non-technical agents",
    ],
  },
]

export default function FeaturesSection() {
  return (
    <section className="w-full py-10 md:py-20 lg:py-32 bg-muted" id="features">
      <div className="container px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-4">
          Our Features
        </h2>
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="flex flex-col items-center space-y-2 border-muted-foreground/10 p-4 rounded-lg"
              >
                <div className="p-2 bg-primary/10 rounded-full">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-center">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-center">
                  {feature.short}
                </p>
                <p className="text-muted-foreground text-center">
                  {feature.description}
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {feature.points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
