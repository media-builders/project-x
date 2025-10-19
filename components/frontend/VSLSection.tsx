"use client"

import React from "react"

export default function VSLSection() {
  return (
    <section id="vsl" className="vsl">
      <div className="section-container">
        <h2 className="section-title">
          See BrokerNest In Action
        </h2>
        <p className="section-subtitle">
          Watch how BrokerNest automatically calls, qualifies, and books appointments — 
          so you can focus on closing deals.
        </p>

        {/* Video Wrapper */}
        <div className="vsl-video-wrapper">

          {/* Embedded Video */}
          <iframe
            className=""
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
            title="BrokerNest Demo Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="section-footer">
          Explore what BrokerNest means for you.
        </p>
      </div>
    </section>
  )
}
