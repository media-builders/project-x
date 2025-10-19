"use client"

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

const roiData = [
  {
    title: "391% Increase in Conversions",
    source: "InsideSales.com",
    description:
      "Teams using AI-powered follow-up tools see up to a 391% increase in contact-to-conversion rates.",
    chartType: "line",
    chartData: [
      { month: "Jan", value: 50 },
      { month: "Feb", value: 120 },
      { month: "Mar", value: 200 },
      { month: "Apr", value: 300 },
      { month: "May", value: 391 },
    ],
  },
  {
    title: "70% Fewer Missed Opportunities",
    source: "HubSpot Sales Data, 2024",
    description:
      "Automated appointment systems reduce missed opportunities by up to 70%.",
    chartType: "bar",
    chartData: [
      { label: "Manual", value: 100 },
      { label: "With AI", value: 30 },
    ],
  },
  {
    title: "$48,000 Added GCI / 1,000 Leads",
    source: "Inman Tech Report, 2025",
    description:
      "Reactivating past leads generates an average of $48,000 in additional GCI per 1,000 contacts.",
    chartType: "area",
    chartData: [
      { q: "Q1", value: 10 },
      { q: "Q2", value: 22 },
      { q: "Q3", value: 36 },
      { q: "Q4", value: 48 },
    ],
  },
]

export default function ROIStatsSection() {
  return (
    <section className="roi-stats" id="roi-stats">
      <div className="section-container">
        <h2 className="section-title">A Simple System That Pays For Itself</h2>
        <p className="section-subtitle">
          Proven by data. Backed by results. Real estate teams using automation consistently see higher conversions and lower costs.
        </p>

        <div className="section-grid">
          {roiData.map((item, idx) => (
            <div key={idx} className="card">
              <div className="card-header">
                <h3 className="card-title">{item.title}</h3>
              </div>
              <div className="roi-chart">
                <ResponsiveContainer width="100%" height={120}>
                  {
                    item.chartType === "line" ? (
                      <LineChart data={item.chartData}>
                        <XAxis dataKey="month" hide />
                        <YAxis hide />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#56ccf2"
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    ) : item.chartType === "bar" ? (
                      <BarChart data={item.chartData}>
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <Bar dataKey="value" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#56ccf2" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#2f80ed" stopOpacity={0.5} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    ) : (
                      <AreaChart data={item.chartData}>
                        <XAxis dataKey="q" hide />
                        <YAxis hide />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#56ccf2"
                          fillOpacity={1}
                          fill="url(#areaGradient)"
                        />
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="10%" stopColor="#56ccf2" stopOpacity={0.9} />
                            <stop offset="90%" stopColor="#2f80ed" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    )
                  }
                </ResponsiveContainer>
              </div>
              <p className="card-desc">{item.description}</p>
              <span className="card-source">{item.source}</span>
            </div>
          ))}
        </div>

        <p className="section-footer">
          Every uncalled lead costs more than ad spend — it costs commissions and referrals. BrokerNest ensures every lead is contacted, qualified, and scheduled automatically.
        </p>
      </div>
    </section>
  )
}
