import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, AnimatePresence } from 'framer-motion';

const circleData = [
  { id: 1, headline: 'Instant', text: 'What once took months, now happens in moments.' },
  { id: 2, headline: 'Predictive', text: 'So you never had to wait for symptoms.' },
  { id: 3, headline: 'Accessible', text: 'No longer limited by geographical location and availability.' },
  { id: 4, headline: 'Intelligent', text: 'Where data tells your story — and changes your outcome.' },
  { id: 5, headline: 'Designed for you', text: 'Because you’re not a checkbox or a protocol.' },
  { id: 6, headline: 'Designed for you', text: 'Because you’re not a checkbox or a protocol.' },
  
  

];

export default function CircleTimeline() {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const totalItems = circleData.length;
  const angleStep = 360 / totalItems; // 72 deg step

  // Track page scroll inside 500vh container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Calculate discrete target rotation (0, -72, -144, -216, -288) based on scroll step
  const targetRotation = useTransform(scrollYProgress, (progress) => {
    const rawStep = progress * (totalItems - 1);
    const stepIndex = Math.min(Math.round(rawStep), totalItems - 1);
    return -stepIndex * angleStep;
  });

  // Smooth out the step snap transitions
  const smoothRotation = useSpring(targetRotation, {
    stiffness: 80,
    damping: 20,
    mass: 0.8,
  });

  // Track current step index for content rendering
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const stepIndex = Math.min(Math.round(latest * (totalItems - 1)), totalItems - 1);
    if (stepIndex !== activeIndex) {
      setActiveIndex(stepIndex);
    }
  });

  const activeItem = circleData[activeIndex];

  return (
    <div ref={containerRef} style={styles.scrollContainer}>
      {/* Sticky Fullscreen Frame */}
      <div style={styles.stickyFrame}>
        
        {/* Outer Wheel Anchor */}
        <div style={styles.circleWrap}>
          <motion.div style={{ ...styles.circleBorder, rotate: smoothRotation }}>
            {circleData.map((item, index) => {
              const itemAngle = index * angleStep;
              const isActive = index === activeIndex;

              return (
                <div
                  key={item.id}
                  style={{
                    ...styles.circleNode,
                    transform: `rotate(${itemAngle}deg)`,
                  }}
                >
                  {/* Number Badge & Yellow Dot positioned on the perimeter line */}
                  <div style={styles.nodeBadgeWrap}>
                    <div
                      style={{
                        ...styles.circleDate,
                      }}
                    >
                      {item.id}
                    </div>

                    {/* Dot directly sitting on the border stroke */}
                    <div
                      style={{
                        ...styles.circleDot,
                        transform: isActive ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Static Center Text - Always Remains Straight at Top Center */}
          <div style={styles.centerTextOverlay}>
            <div style={styles.stemLine} />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={styles.textContent}
              >
                <h3 style={styles.headlineText}>{activeItem.headline}</h3>
                <p style={styles.bodyText}>{activeItem.text}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  scrollContainer: {
    height: '450vh',
    backgroundColor: '#fff',
    position: 'relative',
  },
  stickyFrame: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#ffffff',
    fontFamily: 'sans-serif',
  },
  headingWrap: {
    position: 'absolute',
    top: '7vh',
    left: '5vw',
    zIndex: 10,
  },
  headingTitle: {
    fontSize: 'clamp(2.2rem, 5vw, 4.5rem)',
    fontWeight: 500,
    lineHeight: 1.1,
    margin: 0,
    color: '#B77145',
  },
  // Positions the wheel so only the top semicircle shows
  circleWrap: {
    position: 'absolute',
    top: '38vh',
    width: 'clamp(650px, 85vw, 1250px)',
    height: 'clamp(650px, 85vw, 1250px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBorder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '1px solid #B77145',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleNode: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  nodeBadgeWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transform: 'translateY(-100%)', // Aligns yellow dot right on top of the circle edge line
  },
  circleDate: {
    width: 'clamp(32px, 3.2vw, 46px)',
    height: 'clamp(32px, 3.2vw, 46px)',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 'clamp(0.85rem, 1.2vw, 1.15rem)',
    marginBottom: '8px',
    backgroundColor: '#B77145',
    transition: 'border-color 0.3s ease, color 0.3s ease',
  },
  circleDot: {
    backgroundColor: '#B77145',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'transform 0.3s ease, background-color 0.3s ease',
  },
  // Overlay content box pinned straight down from top edge
  centerTextOverlay: {
    position: 'absolute',
    top: '0px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '90%',
    maxWidth: '440px',
    pointerEvents: 'none',
  },
  stemLine: {
    width: '1px',
    height: 'clamp(60px, 12vh, 130px)',
    backgroundColor: '#B77145',
    marginBottom: '16px',
    marginTop: '20px',
  },
  textContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  headlineText: {
    fontSize: 'clamp(1.8rem, 3.2vw, 2.8rem)',
    fontWeight: 500,
    margin: '0 0 10px 0',
    color: '#B77145',
  },
  bodyText: {
    fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)',
    color: '#B77145',
    margin: 0,
    lineHeight: 1.45,
  },
};