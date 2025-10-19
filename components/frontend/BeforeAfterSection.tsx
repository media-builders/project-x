"use client"

export default function BeforeAfterSection() {
  const rows = [
    { label: "Follow Up Process & Re-Engagement", before: "Manual calls and reminders", after: "Automated 24/7" },
    { label: "Speed to Lead", before: "Schedule Dependant", after: "Calls Within Seconds" },
    { label: "Cost", before: "High (Salary / your time)", after: "Low (monthly cost)" },
    { label: "Stress", before: "High (Burnout & Turnover)", after: "Low (leads qualified)" },
    { label: "Conversion", before: "Inconsistent & Time Tested", after: "Consistent, 3x more appts" },
    { label: "Team Attention & Focus", before: "Cold Calling and Admin Work", after: "Selling, showing & closing" },
  ]

  return (
    <section className="landing-section alt comparison floating-pulse">
      <div className="section-container">
        <h2 className="section-title">
          Replace Manual Follow-Up with BrokerNest
        </h2>
        <p className="section-subtitle">The difference of BrokerNest</p>

        <div className="before-after-table">
          <div className="table-head">
            <div className="cell label strong">Aspect</div>
            <div className="cell before strong">Before BrokerNest</div>
            <div className="cell after strong">After BrokerNest</div>
          </div>

          {rows.map((r, i) => (
            <div key={i} className="table-row">
              <div className="cell label">{r.label}</div>
              <div className="cell before">{r.before}</div>
              <div className="cell after">{r.after}</div>
            </div>
          ))}
        </div>

        <p className="section-footer">
          You and your team shouldn’t be chasing leads — you should be closing more deals. 
          <br />BrokerNest makes that possible.
        </p>
      </div>
    </section>
  )
}
