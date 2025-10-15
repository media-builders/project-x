"use client"
import Image from "next/image"

const crms = [
  "/logos/hubspot.png",
  "/logos/salesforce.png",
  "/logos/followupboss.png",
  "/logos/realgeeks.png",
  "/logos/kvcore.png",
]

export default function IntegrationSection() {
  return (
    <section className="landing-section alt" id="integration">
      <div className="section-container text-center">
        <h2 className="section-title">Seamless Integration</h2>
        <p className="section-subtitle max-w-2xl mx-auto">
          BrokerNest connects directly with your CRM — automating the entire workflow from 
          lead import to call transcript export. Your systems stay clean, synced, and always organized.
        </p>

        {/* Scrolling CRM Logos */}
        <div className="marquee glass my-10">
          <div className="marquee-track">
            {crms.concat(crms).map((src, i) => (
              <Image
                key={i}
                src={src}
                alt="CRM Logo"
                width={120}
                height={60}
                className="logo"
              />
            ))}
          </div>
        </div>

        {/* Connected Workflow Diagram */}
        <div className="connected">
          <div className="node">CRM</div>
          <span className="arrow">↔</span>
          <div className="node primary">BrokerNest</div>
          <span className="arrow">↔</span>
          <div className="node">Calendar</div>
        </div>

        <p className="section-subtitle mt-10">
          Full automation, real-time updates, and effortless data flow between all your tools.
        </p>
      </div>
    </section>
  )
}
