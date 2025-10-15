"use client"

import React from "react"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah J., CEO",
    quote:
      "Before this, I was drowning in sticky notes and half-finished follow-ups. BrokerNest picked up 3 extra closings last quarter from leads I would’ve forgotten about.",
  },
  {
    name: "Mark T., CTO",
    quote:
      "The AI dialer blew me away — it booked an appointment automatically while I was showing a property. It’s like having a full-time assistant I don’t have to manage.",
  },
  {
    name: "Emily R., Operations Manager",
    quote:
      "Other CRMs were too complicated. BrokerNest actually feels like it was built for real estate. Easy setup, daily list, no overwhelm — just results.",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <h2 className="testimonials-title">What Our Customers Say</h2>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div className="testimonial-card" key={i}>
              <div className="testimonial-stars">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="star-icon" />
                ))}
              </div>
              <p className="testimonial-quote">“{t.quote}”</p>
              <p className="testimonial-name">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
