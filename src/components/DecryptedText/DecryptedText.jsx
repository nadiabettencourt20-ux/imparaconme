import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { motion } from "motion/react"

const styles = {
  wrapper: {
    display: "inline-block",
    whiteSpace: "pre-wrap",
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    border: 0,
  },
}

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  className = "",
  parentClassName = "",
  encryptedClassName = "",
  animateOn = "hover",
  clickMode = "once",
  ...props
}) {
  const [displayText, setDisplayText] = useState(text)
  const [isAnimating, setIsAnimating] = useState(false)
  const [revealedIndices, setRevealedIndices] = useState(new Set())
  const [hasAnimated, setHasAnimated] = useState(false)
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== "click")
  const [direction, setDirection] = useState("forward")

  const containerRef = useRef(null)
  const orderRef = useRef([])
  const pointerRef = useRef(0)
  const intervalRef = useRef(null)

  const availableChars = useMemo(() => {
    return useOriginalCharsOnly
      ? Array.from(new Set(text.split(""))).filter((char) => char !== " ")
      : characters.split("")
  }, [useOriginalCharsOnly, text, characters])

  const shuffleText = useCallback(
    (originalText, currentRevealed) => {
      return originalText
        .split("")
        .map((char, index) => {
          if (char === " ") return " "
          if (currentRevealed.has(index)) return originalText[index]

          return availableChars[Math.floor(Math.random() * availableChars.length)]
        })
        .join("")
    },
    [availableChars]
  )

  const computeOrder = useCallback(
    (length) => {
      const order = []

      if (length <= 0) return order

      if (revealDirection === "start") {
        for (let index = 0; index < length; index++) order.push(index)
        return order
      }

      if (revealDirection === "end") {
        for (let index = length - 1; index >= 0; index--) order.push(index)
        return order
      }

      const middle = Math.floor(length / 2)
      let offset = 0

      while (order.length < length) {
        if (offset % 2 === 0) {
          const index = middle + offset / 2
          if (index >= 0 && index < length) order.push(index)
        } else {
          const index = middle - Math.ceil(offset / 2)
          if (index >= 0 && index < length) order.push(index)
        }

        offset++
      }

      return order.slice(0, length)
    },
    [revealDirection]
  )

  const fillAllIndices = useCallback(() => {
    const set = new Set()

    for (let index = 0; index < text.length; index++) {
      set.add(index)
    }

    return set
  }, [text])

  const removeRandomIndices = useCallback((set, count) => {
    const array = Array.from(set)

    for (let index = 0; index < count && array.length > 0; index++) {
      const randomIndex = Math.floor(Math.random() * array.length)
      array.splice(randomIndex, 1)
    }

    return new Set(array)
  }, [])

  const encryptInstantly = useCallback(() => {
    const emptySet = new Set()

    setRevealedIndices(emptySet)
    setDisplayText(shuffleText(text, emptySet))
    setIsDecrypted(false)
  }, [text, shuffleText])

  const triggerDecrypt = useCallback(() => {
    if (sequential) {
      orderRef.current = computeOrder(text.length)
      pointerRef.current = 0
      setRevealedIndices(new Set())
    } else {
      setRevealedIndices(new Set())
    }

    setDirection("forward")
    setIsAnimating(true)
  }, [sequential, computeOrder, text.length])

  const triggerReverse = useCallback(() => {
    if (sequential) {
      orderRef.current = computeOrder(text.length).slice().reverse()
      pointerRef.current = 0

      const allIndices = fillAllIndices()

      setRevealedIndices(allIndices)
      setDisplayText(shuffleText(text, allIndices))
    } else {
      const allIndices = fillAllIndices()

      setRevealedIndices(allIndices)
      setDisplayText(shuffleText(text, allIndices))
    }

    setDirection("reverse")
    setIsAnimating(true)
  }, [sequential, computeOrder, fillAllIndices, shuffleText, text])

  useEffect(() => {
    if (!isAnimating) return

    let currentIteration = 0

    const getNextIndex = (revealedSet) => {
      const textLength = text.length

      if (revealDirection === "start") {
        return revealedSet.size
      }

      if (revealDirection === "end") {
        return textLength - 1 - revealedSet.size
      }

      if (revealDirection === "center") {
        const middle = Math.floor(textLength / 2)
        const offset = Math.floor(revealedSet.size / 2)
        const nextIndex =
          revealedSet.size % 2 === 0
            ? middle + offset
            : middle - offset - 1

        if (
          nextIndex >= 0 &&
          nextIndex < textLength &&
          !revealedSet.has(nextIndex)
        ) {
          return nextIndex
        }

        for (let index = 0; index < textLength; index++) {
          if (!revealedSet.has(index)) return index
        }
      }

      return revealedSet.size
    }

    intervalRef.current = setInterval(() => {
      setRevealedIndices((previousRevealed) => {
        if (sequential) {
          if (direction === "forward") {
            if (previousRevealed.size < text.length) {
              const nextIndex = getNextIndex(previousRevealed)
              const newRevealed = new Set(previousRevealed)

              newRevealed.add(nextIndex)
              setDisplayText(shuffleText(text, newRevealed))

              return newRevealed
            }

            clearInterval(intervalRef.current)
            setIsAnimating(false)
            setIsDecrypted(true)

            return previousRevealed
          }

          if (direction === "reverse") {
            if (pointerRef.current < orderRef.current.length) {
              const indexToRemove = orderRef.current[pointerRef.current++]
              const newRevealed = new Set(previousRevealed)

              newRevealed.delete(indexToRemove)
              setDisplayText(shuffleText(text, newRevealed))

              if (newRevealed.size === 0) {
                clearInterval(intervalRef.current)
                setIsAnimating(false)
                setIsDecrypted(false)
              }

              return newRevealed
            }

            clearInterval(intervalRef.current)
            setIsAnimating(false)
            setIsDecrypted(false)

            return previousRevealed
          }
        }

        if (direction === "forward") {
          setDisplayText(shuffleText(text, previousRevealed))
          currentIteration++

          if (currentIteration >= maxIterations) {
            clearInterval(intervalRef.current)
            setIsAnimating(false)
            setDisplayText(text)
            setIsDecrypted(true)
          }

          return previousRevealed
        }

        if (direction === "reverse") {
          let currentSet = previousRevealed

          if (currentSet.size === 0) {
            currentSet = fillAllIndices()
          }

          const removeCount = Math.max(
            1,
            Math.ceil(text.length / Math.max(1, maxIterations))
          )

          const nextSet = removeRandomIndices(currentSet, removeCount)

          setDisplayText(shuffleText(text, nextSet))
          currentIteration++

          if (nextSet.size === 0 || currentIteration >= maxIterations) {
            clearInterval(intervalRef.current)
            setIsAnimating(false)
            setIsDecrypted(false)
            setDisplayText(shuffleText(text, new Set()))

            return new Set()
          }

          return nextSet
        }

        return previousRevealed
      })
    }, speed)

    return () => clearInterval(intervalRef.current)
  }, [
    isAnimating,
    text,
    speed,
    maxIterations,
    sequential,
    revealDirection,
    shuffleText,
    direction,
    fillAllIndices,
    removeRandomIndices,
  ])

  const handleClick = () => {
    if (animateOn !== "click") return

    if (clickMode === "once") {
      if (isDecrypted) return

      setDirection("forward")
      triggerDecrypt()
    }

    if (clickMode === "toggle") {
      if (isDecrypted) {
        triggerReverse()
      } else {
        setDirection("forward")
        triggerDecrypt()
      }
    }
  }

  const triggerHoverDecrypt = useCallback(() => {
    if (isAnimating) return

    setRevealedIndices(new Set())
    setIsDecrypted(false)
    setDisplayText(text)
    setDirection("forward")
    setIsAnimating(true)
  }, [isAnimating, text])

  const resetToPlainText = useCallback(() => {
    clearInterval(intervalRef.current)
    setIsAnimating(false)
    setRevealedIndices(new Set())
    setDisplayText(text)
    setIsDecrypted(true)
    setDirection("forward")
  }, [text])

  useEffect(() => {
    if (animateOn !== "view" && animateOn !== "inViewHover") return

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasAnimated) {
          triggerDecrypt()
          setHasAnimated(true)
        }
      })
    }

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    }

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    )

    const currentRef = containerRef.current

    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [animateOn, hasAnimated, triggerDecrypt])

  useEffect(() => {
    if (animateOn === "click") {
      encryptInstantly()
    } else {
      setDisplayText(text)
      setIsDecrypted(true)
    }

    setRevealedIndices(new Set())
    setDirection("forward")
  }, [animateOn, text, encryptInstantly])

  const animateProps =
    animateOn === "hover" || animateOn === "inViewHover"
      ? {
          onMouseEnter: triggerHoverDecrypt,
          onMouseLeave: resetToPlainText,
        }
      : animateOn === "click"
        ? {
            onClick: handleClick,
          }
        : {}

  return (
    <motion.span
      className={parentClassName}
      ref={containerRef}
      style={styles.wrapper}
      {...animateProps}
      {...props}
    >
      <span style={styles.srOnly}>{displayText}</span>

      <span aria-hidden="true">
        {displayText.split("").map((char, index) => {
          const isRevealedOrDone =
            revealedIndices.has(index) || (!isAnimating && isDecrypted)

          return (
            <span
              key={index}
              className={isRevealedOrDone ? className : encryptedClassName}
            >
              {char}
            </span>
          )
        })}
      </span>
    </motion.span>
  )
}