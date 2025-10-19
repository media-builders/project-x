"use client"
import Image from "next/image"

const crms = [
  "/images/fub/FUB Logo Mark RGB_Fub Logo Mark Main.png",
  "/images/kvcore/logo858.png",
  "/images/hubspot/hubspot-1.svg",
  "/images/salesforce/Salesforce.com_logo.svg",
  "/images/zoho/Zoho Logo RGB_Main.png",
]

export default function IntegrationSection() {
  return (
    <section className="integrations" id="integrations">
      <div className="section-container">
        <h2 className="section-title">Seamless Integration</h2>
        <p className="section-subtitle">
          BrokerNest connects directly with your CRM — automating the entire workflow from 
          lead import to call transcript export. Your systems stay clean, synced, and always organized.
        </p>

        {/* Scrolling CRM Logos */}
        <div className="marquee">
          <div className="marquee-track">
            {crms.concat(crms).map((src, i) => (
              <Image
                key={i}
                src={src}
                alt="CRM Logo"
                width={75}
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

        <p className="section-footer">
          Full automation, real-time updates, and effortless data flow between all your tools.
        </p>
      </div>
    </section>
  )
}
