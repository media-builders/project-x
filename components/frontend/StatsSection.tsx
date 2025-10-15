"use client"

import React, { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts"

// === Stats Configuration ===
const stats = [
  { label: "Calls Made", value: 12483, color: "#4FC3F7" },
  { label: "Minutes Used", value: 39210, color: "#69F0AE" }, // ✅ Green
  { label: "Meetings Booked", value: 1274, color: "#82B1FF" },
  { label: "Avg. Response", value: 23, color: "#00E676" }, // ✅ Fast = Green Dial
]

// === Data Generator for Upward Zig-Zag Trend ===
const generateUpwardData = (base: number) => {
  const data = []
  let value = base * 0.25
  for (let i = 0; i < 8; i++) {
    const exponentialBoost = Math.pow(1.35, i)
    const trend = base * 0.07 * exponentialBoost
    const direction = i % 2 === 0 ? 1 : -1
    const variance = base * 0.15 * direction
    const noise = Math.random() * base * 0.03
    value += trend + variance + noise
    data.push({ name: `T${i}`, value: Math.max(0, Math.floor(value)) })
  }
  return data
}

export default function StatsSection() {
  const [animatedValues, setAnimatedValues] = useState<number[]>([0, 0, 0, 0])
  const [dialFill, setDialFill] = useState(0)
  const [chartData, setChartData] = useState(
    stats.map(() => generateUpwardData(1000))
  )

  // === Simultaneous Animation for All Charts ===
  useEffect(() => {
    const duration = 1200 // total animation duration (ms)
    const steps = 60
    let frame = 0

    const targetValues = stats.map((s) => s.value)
    const startTime = performance.now()

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / duration, 1)
      frame++

      setAnimatedValues(targetValues.map((target) => Math.floor(target * progress)))

      // Update dial fill (sync with response count)
      setDialFill(progress * 100)

      // Update all chart datasets with smooth growth effect
      setChartData((prevData) =>
        prevData.map((_, idx) =>
          generateUpwardData(Math.max(100, targetValues[idx] * progress))
        )
      )

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [])

  return (
    <section className="landing-section alt glass" id="stats">
      <div className="section-container">
        <h2 className="section-title">Real-Time Statistics Dashboard</h2>
        <p className="section-subtitle">
          See live insights on how BrokerNest drives your success — from total
          calls made to meetings booked and response speeds.
        </p>

        <div className="stats-grid">
          {stats.map((stat, i) => {
            const isResponse = stat.label.includes("Response")

            return (
              <div className="stat-card glass" key={i}>
                {/* === Header === */}
                <div className="stat-header">
                  <h3 className="stat-label">{stat.label}</h3>
                  <p className="stat-value" style={{ color: stat.color }}>
                    {isResponse
                      ? `${animatedValues[i]}ms`
                      : animatedValues[i].toLocaleString()}
                  </p>
                </div>

                {/* === Chart === */}
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={90}>
                    {isResponse ? (
                      // ✅ Response Time Dial (fills while counting)
                      <RadialBarChart
                        cx="50%"
                        cy="70%"
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={10}
                        data={[
                          {
                            name: "Response Speed",
                            value: dialFill,
                            fill: "#00E676",
                          },
                        ]}
                        startAngle={180}
                        endAngle={0}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar
                          dataKey="value"
                          cornerRadius={10}
                          background
                        />
                      </RadialBarChart>
                    ) : i % 2 === 0 ? (
                      // ✅ Upward Zig-Zag Line Chart
                      <LineChart data={chartData[i]}>
                        <Line
                          type="linear"
                          dataKey="value"
                          stroke={stat.color}
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    ) : (
                      // ✅ Upward Zig-Zag Bar Chart
                      <BarChart data={chartData[i]}>
                        <Bar
                          dataKey="value"
                          fill={stat.color}
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
