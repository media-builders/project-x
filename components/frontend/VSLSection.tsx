"use client"

import React from "react"

export default function VSLSection() {
  return (
    <section
      id="vsl"
      className="relative w-full py-28 overflow-hidden bg-[#070b14] text-center"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1224] via-[#070b14] to-[#050810] z-0" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#1e3a8a_0%,transparent_60%)] animate-pulse-slow" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_70%,#0284c7_0%,transparent_70%)] animate-pulse-slower" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
          See BrokerNest In Action
        </h2>
        <p className="text-slate-400 mb-12 max-w-2xl mx-auto text-lg leading-relaxed">
          Watch how BrokerNest automatically calls, qualifies, and books appointments — 
          so you can focus on closing deals.
        </p>

        {/* Video Wrapper */}
        <div className="relative group max-w-5xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(56,189,248,0.25)] border border-slate-700/50 bg-gradient-to-br from-[#0d1628]/90 to-[#030712]/90 backdrop-blur-lg transition-all duration-500 hover:shadow-[0_0_40px_rgba(56,189,248,0.35)] hover:border-sky-400/60">
          
          {/* Play pulse overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-sky-500/10 backdrop-blur-md">
              <div className="absolute w-20 h-20 rounded-full border-4 border-sky-400/30 animate-ping-slow" />
              <div className="absolute w-16 h-16 rounded-full border-2 border-sky-300/30 animate-ping-slower" />
              <svg
                className="w-10 h-10 text-sky-400 relative"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Embedded Video */}
          <iframe
            className="w-full h-full relative z-0"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
            title="BrokerNest Demo Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
