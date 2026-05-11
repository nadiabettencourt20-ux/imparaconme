import React, { useEffect, useRef, useState, useMemo } from "react"
import "./GradualBlur.css"

const DEFAULT_CONFIG = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 30,
  opacity: 1,
  curve: "linear",
  target: "parent",
  className: "",
  style: {},
}

const CURVE_FUNCTIONS = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
}

const getGradientDirection = (position) =>
  ({
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right",
  })[position] || "to bottom"

function GradualBlur(props) {
  const containerRef = useRef(null)
  const [isVisible] = useState(true)

  const config = useMemo(() => {
    return { ...DEFAULT_CONFIG, ...props }
  }, [props])

  const blurDivs = useMemo(() => {
    const divs = []
    const increment = 100 / config.divCount
    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount
      progress = curveFunc(progress)

      const blurValue = config.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * config.strength
        : 0.0625 * (progress * config.divCount + 1) * config.strength

      const p1 = Math.round((increment * i - increment) * 10) / 10
      const p2 = Math.round(increment * i * 10) / 10
      const p3 = Math.round((increment * i + increment) * 10) / 10
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10

      let gradient = `transparent ${p1}%, black ${p2}%`

      if (p3 <= 100) gradient += `, black ${p3}%`
      if (p4 <= 100) gradient += `, transparent ${p4}%`

      const direction = getGradientDirection(config.position)

      divs.push(
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            maskImage: `linear-gradient(${direction}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
            backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            opacity: config.opacity,
          }}
        />
      )
    }

    return divs
  }, [config])

  const containerStyle = {
    position: config.target === "page" ? "fixed" : "absolute",
    pointerEvents: "none",
    opacity: isVisible ? 1 : 0,
    zIndex: config.zIndex,
    height: config.height,
    width: "100%",
    left: 0,
    right: 0,
    [config.position]: 0,
    ...config.style,
  }

  return (
    <div
      ref={containerRef}
      className={`gradual-blur ${config.className}`}
      style={containerStyle}
    >
      <div className="gradual-blur-inner">{blurDivs}</div>
    </div>
  )
}

export default React.memo(GradualBlur)