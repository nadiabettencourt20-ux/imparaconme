import { useEffect, useRef, useMemo } from "react"
import { gsap } from "gsap"
import "./TargetCursor.css"

function TargetCursor({
  targetSelector = "a, button, h1, h2, h3, p, .rotating-main",
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
}) {
  const cursorRef = useRef(null)
  const dotRef = useRef(null)
  const spinTl = useRef(null)
  const activeTargetRef = useRef(null)

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false
    return ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 768
  }, [])

  useEffect(() => {
    if (isMobile || !cursorRef.current) return

    const cursor = cursorRef.current
    const dot = dotRef.current
    const corners = Array.from(cursor.querySelectorAll(".target-cursor-corner"))
    const originalCursor = document.body.style.cursor

    if (hideDefaultCursor) document.body.style.cursor = "none"

    gsap.set(cursor, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      xPercent: -50,
      yPercent: -50,
      scale: 1,
    })

    const resetCorners = () => {
      activeTargetRef.current = null

      gsap.to(corners[0], { x: -18, y: -18, duration: 0.25, ease: "power3.out" })
      gsap.to(corners[1], { x: 6, y: -18, duration: 0.25, ease: "power3.out" })
      gsap.to(corners[2], { x: 6, y: 6, duration: 0.25, ease: "power3.out" })
      gsap.to(corners[3], { x: -18, y: 6, duration: 0.25, ease: "power3.out" })

      gsap.to(dot, { scale: 1, duration: 0.2 })

      if (spinTl.current && spinTl.current.paused()) {
        spinTl.current.play()
      }
    }

    resetCorners()

    spinTl.current = gsap.timeline({ repeat: -1 }).to(cursor, {
      rotation: "+=360",
      duration: spinDuration,
      ease: "none",
    })

    const activateTarget = (target, mouseX, mouseY) => {
      const rect = target.getBoundingClientRect()

      if (rect.width <= 0 || rect.height <= 0) {
        resetCorners()
        return
      }

      spinTl.current?.pause()
      gsap.set(cursor, { rotation: 0 })
      gsap.to(dot, { scale: 0.9, duration: 0.2 })

      const border = 6
      const cornerSize = 12

      const positions = [
        {
          x: rect.left - mouseX - border,
          y: rect.top - mouseY - border,
        },
        {
          x: rect.right - mouseX + border - cornerSize,
          y: rect.top - mouseY - border,
        },
        {
          x: rect.right - mouseX + border - cornerSize,
          y: rect.bottom - mouseY + border - cornerSize,
        },
        {
          x: rect.left - mouseX - border,
          y: rect.bottom - mouseY + border - cornerSize,
        },
      ]

      corners.forEach((corner, index) => {
        gsap.to(corner, {
          x: positions[index].x,
          y: positions[index].y,
          duration: hoverDuration,
          ease: "power3.out",
        })
      })
    }

    const moveHandler = (event) => {
      gsap.to(cursor, {
        x: event.clientX,
        y: event.clientY,
        duration: 0.14,
        ease: "power3.out",
      })

      const element = document.elementFromPoint(event.clientX, event.clientY)
      const target = element?.closest(targetSelector)

      if (!target) {
        resetCorners()
        return
      }

      activeTargetRef.current = target
      activateTarget(target, event.clientX, event.clientY)
    }

    const mouseDown = () => {
      gsap.to(dot, { scale: 0.55, duration: 0.2 })
      gsap.to(cursor, { scale: 0.92, duration: 0.2 })
    }

    const mouseUp = () => {
      gsap.to(dot, { scale: 1, duration: 0.2 })
      gsap.to(cursor, { scale: 1, duration: 0.2 })
    }

    window.addEventListener("mousemove", moveHandler)
    window.addEventListener("mousedown", mouseDown)
    window.addEventListener("mouseup", mouseUp)

    return () => {
      window.removeEventListener("mousemove", moveHandler)
      window.removeEventListener("mousedown", mouseDown)
      window.removeEventListener("mouseup", mouseUp)

      spinTl.current?.kill()
      document.body.style.cursor = originalCursor
    }
  }, [targetSelector, spinDuration, hideDefaultCursor, hoverDuration, isMobile])

  if (isMobile) return null

  return (
    <div ref={cursorRef} className="target-cursor-wrapper">
      <div ref={dotRef} className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  )
}

export default TargetCursor