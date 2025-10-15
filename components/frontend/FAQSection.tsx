"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "Will AI replace my agents?",
    a: "No. BrokerNest replaces missed opportunities, not people. It gives your agents more booked conversations with qualified buyers and sellers.",
  },
  {
    q: "How hard is it to set up?",
    a: "Our team handles 99% of setup. We connect to your CRM and have you live within 48 hours.",
  },
  {
    q: "Does it sound robotic?",
    a: "Not at all. BrokerNest’s voice AI uses advanced models trained for real estate — adaptive tone, natural pauses, and selectable voices.",
  },
  {
    q: "How soon can I see results?",
    a: "Most teams start booking appointments within the first few days after launch.",
  },
  {
    q: "Is there a minimum agreement?",
    a: "No. Cancel anytime with 30 days’ notice.",
  },
]

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="faq-section">
      <div className="faq-container">
        <h2 className="faq-title">Frequently Asked Questions</h2>

        <div className="faq-grid">
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`faq-card ${open === i ? "open" : ""}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              <div className="faq-question">
                <h3>{f.q}</h3>
                <ChevronDown className={`chevron ${open === i ? "rotated" : ""}`} />
              </div>
              <div
                className="faq-answer"
                style={{
                  maxHeight: open === i ? "500px" : "0px",
                }}
              >
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="faq-footer">
          Have another question? Email{" "}
          <a href="mailto:hello@brokernest.ai" className="faq-link">
            hello@brokernest.ai
          </a>
          .
        </p>
      </div>
    </section>
  )
}
