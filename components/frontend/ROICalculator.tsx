"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Premium ROI Calculator — matches testimonial section styling
 */
export default function ROICalculator() {
  const [avgSalePrice, setAvgSalePrice] = useState(750000);
  const [commissionPct, setCommissionPct] = useState(2.5);
  const [missedLeadsPerMonth, setMissedLeadsPerMonth] = useState(12);
  const [months, setMonths] = useState(12);

  const commissionPerDeal = useMemo(
    () => avgSalePrice * (commissionPct / 100),
    [avgSalePrice, commissionPct]
  );

  const assumedCloseRate = 0.12;
  const projectedRecoveredDeals = useMemo(
    () => Math.round(missedLeadsPerMonth * months * assumedCloseRate),
    [missedLeadsPerMonth, months]
  );
  const projectedRecoveredRevenue = useMemo(
    () => projectedRecoveredDeals * commissionPerDeal,
    [projectedRecoveredDeals, commissionPerDeal]
  );

  const progress = Math.min((projectedRecoveredRevenue / 500000) * 100, 100);
  const progressColor =
    progress < 33 ? "#FF5252" : progress < 66 ? "#FFD54F" : "#56ccf2";

  // Animated motion values
  const motionProgress = useMotionValue(progress);
  const motionRevenue = useMotionValue(projectedRecoveredRevenue);
  const motionCommission = useMotionValue(commissionPerDeal);
  const motionDeals = useMotionValue(projectedRecoveredDeals);

  const [displayProgress, setDisplayProgress] = useState(progress.toFixed(1));
  const [displayRevenue, setDisplayRevenue] = useState(formatMoney(projectedRecoveredRevenue));
  const [displayCommission, setDisplayCommission] = useState(formatMoney(commissionPerDeal));
  const [displayDeals, setDisplayDeals] = useState(projectedRecoveredDeals.toString());

  // live subscription
  useEffect(() => {
    const subs = [
      motionProgress.on("change", (v) => setDisplayProgress(v.toFixed(1))),
      motionRevenue.on("change", (v) => setDisplayRevenue(formatMoney(v))),
      motionCommission.on("change", (v) => setDisplayCommission(formatMoney(v))),
      motionDeals.on("change", (v) => setDisplayDeals(Math.round(v).toString())),
    ];
    return () => subs.forEach((unsub) => unsub());
  }, [motionProgress, motionRevenue, motionCommission, motionDeals]);

  // smooth animate
  useEffect(() => {
    animate(motionProgress, progress, { duration: 0.6, ease: "easeOut" });
    animate(motionRevenue, projectedRecoveredRevenue, { duration: 0.6 });
    animate(motionCommission, commissionPerDeal, { duration: 0.6 });
    animate(motionDeals, projectedRecoveredDeals, { duration: 0.6 });
  }, [
    progress,
    projectedRecoveredRevenue,
    commissionPerDeal,
    projectedRecoveredDeals,
    motionProgress,
    motionRevenue,
    motionCommission,
    motionDeals,
  ]);

  return (
    <section className="roi-calculator" id="roi-calculator">
      <div className="section-container">
        <h2 className="section-title">Interactive ROI Calculator</h2>
        <p className="section-subtitle">Discover your untapped revenue potential.</p>

        <div className="section-grid">
          {/* Input side */}
          <div className="card">
            <h3 className="card-title">Adjust Your Numbers</h3>
            <InputSlider
              label="Average Sale Price"
              id="avgSale"
              min={100000}
              max={3000000}
              step={10000}
              value={avgSalePrice}
              unit="$"
              onChange={setAvgSalePrice}
            />
            <InputSlider
              label="Average Commission (%)"
              id="commission"
              min={1}
              max={5}
              step={0.1}
              value={commissionPct}
              unit="%"
              onChange={setCommissionPct}
            />
            <InputSlider
              label="Missed Leads / Month"
              id="missed"
              min={0}
              max={20}
              step={1}
              value={missedLeadsPerMonth}
              onChange={setMissedLeadsPerMonth}
            />
            <InputSlider
              label="Projection Window (months)"
              id="months"
              min={1}
              max={24}
              step={1}
              value={months}
              onChange={setMonths}
            />
          </div>

          {/* Output side */}
          <div className="card result">
            <h3 className="card-title">Projected ROI Results</h3>

            <div className="result-line">
              <span className="label">Commission per Deal</span>
              <motion.span className="value">${displayCommission}</motion.span>
            </div>

            <div className="result-line">
              <span className="label">Projected Recovered Deals</span>
              <motion.span className="value highlight">{displayDeals}</motion.span>
              <small className="subtext">
                Assuming {Math.round(assumedCloseRate * 100)}% close rate
              </small>
            </div>

            <div className="result-line divider">
              <span className="label">Recovered Revenue</span>
              <motion.span className="value glow" style={{ color: progressColor }}>
                ${displayRevenue}
              </motion.span>
            </div>

            <div className="progress-bar-alt">
              <motion.div
                className="progress-fill-alt"
                style={{ width: `${displayProgress}%`, backgroundColor: progressColor }}
              />
            </div>
            <p className="progress-text-alt">
              ROI Potential:{" "}
              <motion.span className="percent" style={{ color: progressColor }}>
                {displayProgress}%
              </motion.span>
            </p>

            <p className="roi-note-alt">
              With an average commission of {commissionPct.toFixed(1)}%, that’s{" "}
              <strong>${formatMoney(commissionPerDeal)}</strong> per deal. Imagine your gains over{" "}
              <strong>{months} months</strong> with BrokerNest automation.
            </p>

            <div className="roi-buttons-alt">
              <Link href="/signup" className="btn-primary-alt">
                Try BrokerNest <ArrowRight className="icon" />
              </Link>
              <a href="#demo" className="btn-secondary-alt">
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
        <p className="section-footer">
          Numbers mean results.
        </p>
      </div>
    </section>
  );
}

/* ------------------------- Input Slider ------------------------- */
function InputSlider({
  label,
  id,
  min,
  max,
  step,
  value,
  unit,
  onChange,
}: {
  label: string;
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="roi-input-alt">
      <label htmlFor={id}>{label}</label>
      <div className="slider-row-alt">
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="slider-value-alt">
          {unit === "$"
            ? "$" + formatMoney(value)
            : unit
            ? value.toFixed(1) + unit
            : value}
        </span>
      </div>
    </div>
  );
}

function formatMoney(n: number) {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}
