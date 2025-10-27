"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import BNLogo from "@/public/images/brokernest/SVG/BrokerNest - Logo - WhiteLogo.svg";
import Wave from "@/components/frontend/graphics/Wave";

export default function LogoIntroOverlay() {
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let start: number | null = null;

    const zoomDuration = 2000; // total zoom animation
    const bgFadeDuration = zoomDuration * 0.25; // 1/4 of zoom time = 0.5s
    const fadeOutStart = 1800;
    const fadeOutDuration = 1000;
    const startScale = 3.5;
    const endScale = 1;

    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
    const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4);

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;

      // logo zoom progress
      const zoomProgress = Math.min(elapsed / zoomDuration, 1);
      const zoomEase = easeOutQuart(zoomProgress);
      const scale = startScale + (endScale - startScale) * zoomEase;
      const logoOpacity = easeOutCubic(zoomProgress);

      // background fade-in progress (¼ duration)
      const bgProgress = Math.min(elapsed / bgFadeDuration, 1);
      const bgOpacity = easeOutCubic(bgProgress);

      if (logoRef.current) {
        logoRef.current.style.transform = `scale(${scale})`;
        logoRef.current.style.opacity = `${logoOpacity}`;

        const glowIntensity = Math.pow(zoomProgress, 2);
        logoRef.current.style.filter = `
          drop-shadow(0 0 ${40 + glowIntensity * 40}px rgba(255,255,255,${0.6 + glowIntensity * 0.2}))
          drop-shadow(0 0 ${100 + glowIntensity * 60}px rgba(180,200,255,${0.2 * glowIntensity}))
        `;
      }

      if (bgRef.current) {
        bgRef.current.style.opacity = `${bgOpacity}`;
      }

      if (whiteRef.current) whiteRef.current.style.opacity = "0";

      // fade overlay out near end
      if (elapsed > fadeOutStart && overlayRef.current) {
        const fadeProgress = Math.min(
          (elapsed - fadeOutStart) / fadeOutDuration,
          1
        );
        overlayRef.current.style.opacity = `${1 - fadeProgress}`;
        if (fadeProgress >= 1) setDone(true);
      }

      if (elapsed < zoomDuration + fadeOutDuration) {
        requestAnimationFrame(animate);
      } else {
        setDone(true);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  if (done) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 1,
        willChange: "transform, opacity, filter",
      }}
    >
      {/* Animated Wave Background (replaces radial gradient) */}
      <div
        ref={bgRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.08) 0%, transparent 70%)",
          willChange: "opacity",
          zIndex: 1,
          mixBlendMode: "screen",
        }}
      >
        {/* <Wave /> */}
      </div>

      {/* RGB Bloom Layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
          background:
            "radial-gradient(circle at 50% 50%, rgba(80,120,255,0.08) 0%, transparent 70%)",
          opacity: 0.5,
          filter: "blur(24px)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Transparent white layer (for future flash effect) */}
      <div
        ref={whiteRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "transparent",
          willChange: "opacity",
          opacity: 0,
          zIndex: 3,
        }}
      />

      {/* 🚀 Logo */}
      <div
        ref={logoRef}
        style={{
          transform: "scale(3.5)",
          opacity: 0,
          willChange: "transform, opacity, filter",
          filter: "drop-shadow(0 0 145px rgba(255,255,255,.50))",
          transition: "filter 0.4s ease",
          zIndex: 4,
        }}
      >
        <Image
          src={BNLogo}
          alt="BrokerNest.ai Logo"
          width={180}
          height={180}
          priority
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}
