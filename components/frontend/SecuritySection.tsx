"use client"
import { Shield, Lock, FileCheck, Eye } from "lucide-react"

export default function SecuritySection() {
  const features = [
    {
      icon: Shield,
      title: "TCPA-Compliant",
      desc: "Fully compliant outbound calling across the U.S. and Canada.",
    },
    {
      icon: Lock,
      title: "SOC 2–Aligned Infrastructure",
      desc: "Encryption in transit and at rest using enterprise-grade cloud standards.",
    },
    {
      icon: FileCheck,
      title: "CRM Data Privacy",
      desc: "Your leads remain your property — never shared, sold, or reused.",
    },
    {
      icon: Eye,
      title: "Human Oversight",
      desc: "Every AI call is reviewed for compliance, tone, and accuracy.",
    },
  ]

  return (
    <section id="security" className="security">
      <div className="section-container">
        <h2 className="section-title">Enterprise Security</h2>
        <p className="section-subtitle">BrokerNest is protected by enterprise-grade security standards — so your data and reputation remain safe.
        </p>

        <div className="section-grid">
          {features.map((f, i) => (
            <div key={i} className="card">
              <div className="security-icon">
                <f.icon className="h-10 w-10 text-sky-400" />
              </div>
              <h4 className="card-title">{f.title}</h4>
              <p className="card-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="section-footer">
          BrokerNest ensures that your automation never compromises what you’ve built.
        </p>
      </div>
    </section>
  )
}
