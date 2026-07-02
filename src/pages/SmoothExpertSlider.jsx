import React, { useRef } from "react";
import { motion } from "framer-motion";

// Mock Data matching the Figma design style
const cardsData = [
  { id: 1, name: "Dr. Alex Johnson", role: "Therapist", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500" },
  { id: 2, name: "Dr. Sarah Ahmed", role: "Psychologist", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500" },
  { id: 3, name: "Dr. Michael Chen", role: "Neuroscientist", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500" },
  { id: 4, name: "Dr. Emily Blunt", role: "Cardiologist", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500" },
];

// Duplicate list to ensure a seamless visual bridge during the CSS marquee loop
const infiniteCards = [...cardsData, ...cardsData, ...cardsData];

export default function SmoothExpertSlider() {
  const constraintsRef = useRef(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFFDFB] px-4 py-12 overflow-hidden">
      {/* Header section from design */}
      <span className="text-xs font-semibold tracking-widest text-[#B36A4B] uppercase bg-[#F7EFEA] px-3 py-1 rounded-full mb-3">
        Testimonials
      </span>
      <h2 className="text-3xl md:text-4xl font-serif text-[#3C2216] text-center max-w-md mb-16 font-medium">
        Insights backed by Real Experts
      </h2>

      {/* Slider Viewport Container */}
      <div 
        ref={constraintsRef}
        className="w-full max-w-7xl overflow-visible md:overflow-hidden relative py-10"
      >
        {/* Track Container: Auto-scrolls on desktop, turns into a touch-draggable field on mobile */}
        <motion.div 
          drag="x"
          dragConstraints={constraintsRef}
          className="flex gap-6 w-max cursor-grab active:cursor-grabbing desktop-marquee-track mobile-drag-behavior"
        >
          {infiniteCards.map((card, index) => {
            // Apply slight rotation variables down the line for that curved look
            const positionFactor = (index % cardsData.length) - 1;
            const rotateZ = positionFactor * 3; // Slight organic card fan tilt
            const translateY = Math.abs(positionFactor) * 6; // Soft dip downwards

            return (
              <div
                key={`${card.id}-${index}`}
                style={{
                  transform: `rotate(${rotateZ}deg) translateY(${translateY}px)`,
                  transformOrigin: "bottom center"
                }}
                className="w-55 h-70 rounded-4xl overflow-hidden bg-white shadow-xl border border-[#F0E6DF] shrink-0 relative select-none"
              >
                {/* Image */}
                <img
                  src={card.img}
                  alt={card.name}
                  className="w-full h-full object-cover pointer-events-none"
                />
                
                {/* Floating Name Tag */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm max-w-[85%]">
                  <p className="text-[10px] font-bold text-[#3C2216] truncate">{card.name}</p>
                </div>

                {/* Subtle Play icon overlay */}
                <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full text-white">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Embedded CSS Injection to cleanly isolate responsive animation states */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          /* Smooth, ultra-slow linear marquee scroll for desktops */
          .desktop-marquee-track {
            animation: slowScroll 35s linear infinite;
            pointer-events: none; /* Disables drag interfere on desktop to maintain steady track loop */
          }
          
          /* Pause scrolling on hover for accessibility and user interaction */
          .desktop-marquee-track:hover {
            animation-play-state: paused;
          }
        }

        @media (max-width: 767px) {
          /* Native physics support for fluid thumb swipes on mobile devices */
          .mobile-drag-behavior {
            transform: none !important; 
            touch-action: pan-y;
          }
        }

        @keyframes slowScroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            /* Shifts loop by exactly one data iteration length to ensure perfect invisible reset */
            transform: translate3d(calc(-244px * ${cardsData.length}), 0, 0); 
          }
        }
      `}} />
    </div>
  );
}