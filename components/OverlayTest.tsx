"use client";

import { useState } from "react";
import LogoIntroOverlay from "@/components/LogoIntroOverlay";

export default function OverlayTest() {
  const [play, setPlay] = useState(false);

  const handlePlay = () => {
    setPlay(false); // reset it in case it was running
    setTimeout(() => setPlay(true), 50); // retrigger after short delay
  };

  return (
    <div>
      <h1>Overlay Animation Test</h1>
      <button className="btn" onClick={handlePlay}>Play Animation</button>
      {play && <LogoIntroOverlay />}
    </div>
  )
}
