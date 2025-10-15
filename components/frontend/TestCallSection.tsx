"use client"

import React, { useState } from "react"
import Image from "next/image"

export default function TestCallSection() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="demo" className="testcall-section">
      <div className="testcall-container">
        {/* ==== Section Header ==== */}
        <header className="testcall-header">
          <h2 className="testcall-title">
            Try BrokerNest AI
          </h2>
          <p className="testcall-subtitle">
            Experience a Conversation with BrokerNest AI yourself or listen to a real AI follow-up call that books an appointment in under two minutes.
          </p>
        </header>

        {/* ==== Steps ==== */}
        <ol className="testcall-steps">
          <li><span className="step-badge">1</span> Fill out the form below</li>
          <li><span className="step-badge">2</span> Receive a call within seconds</li>
          <li><span className="step-badge">3</span> Pretend you’re a lead and enjoy the experience</li>
        </ol>

        {/* ==== Two-Column Layout ==== */}
        <div className="testcall-grid">
          {/* === Left: Form === */}
          <form className="testcall-form" onSubmit={handleSubmit}>
            <h3 className="form-title">Request a Test Call</h3>

            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" type="text" placeholder="Jane Agent" required />
            </div>

            <div className="form-group">
              <label htmlFor="mobile">Mobile</label>
              <input id="mobile" type="tel" placeholder="(555) 123-4567" required />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@company.com" required />
            </div>

            <button type="submit" className="btn-primary full">
              {submitted ? "Request Sent ✅" : "Request Test Call"}
            </button>

            {submitted && (
              <p className="form-success">
                We’ve received your request — expect a call shortly!
              </p>
            )}
          </form>

          {/* === Right: Audio Demo === */}
          <div className="testcall-audio">
            <div className="audio-header">
              <Image
                src="/call-icon.svg"
                alt="AI Call Icon"
                width={48}
                height={48}
                className="audio-icon"
              />
              <div>
                <p className="audio-title">Listen to a Real AI Follow-Up Call</p>
                <p className="audio-desc">
                  Hear how BrokerNest reactivates cold leads and books meetings — automatically.
                </p>
              </div>
            </div>

            <div className="audio-wave">
              {Array.from({ length: 30 }).map((_, i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${(i % 10) * 0.1}s` }}
                />
              ))}
            </div>

            <audio controls className="audio-player">
              <source src="/demo-call.mp3" type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      </div>
    </section>
  )
}
