"use client"

export default function IntroSection() {
  return (
    <section className="w-full py-20 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6 space-y-6">
        <h2 className="text-3xl md:text-5xl font-bold text-center">
          If you’ve been in real estate long enough, you know the problem isn’t leads — it’s follow-up.
        </h2>

        <div className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed space-y-4">
          <p>
            Most agents only reach out once or twice. Industry stats consistently show that 80% of transactions occur
            after the fifth attempt — yet only 8% of Realtors make more than three calls.
          </p>
          <p>
            Agents get buried juggling hundreds of tasks, questions, and paperwork — leaving tens of thousands of dollars
            unclaimed in their databases.
          </p>
          <p className="font-semibold">BrokerNest fixes that.</p>
          <p>
            Built by a real estate broker with over 17 years of experience, BrokerNest gives you a trained, human-sounding AI
            caller that re-engages your old leads, calls new ones within seconds, qualifies every contact, and books appointments
            directly to your calendar.
          </p>
          <p className="font-semibold text-primary">
            No new hires. No extra software. Seamless CRM integration — ready in days, not weeks.
          </p>
        </div>
      </div>
    </section>
  )
}
