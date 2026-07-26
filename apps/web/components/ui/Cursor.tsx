"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useMotionValue } from "framer-motion"

const variantColors = {
  default: "#2a241d",
  link: "#df513b",
  drag: "#3f6fb0",
}

type Variant = keyof typeof variantColors

function CursorSVG({ fill }: { fill: string }) {
  return (
    <svg
      stroke="#ffffff"
      fill={fill}
      strokeWidth="1.2"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      className="h-7 w-7 -translate-x-[12px] -translate-y-[11px] -rotate-[70deg] overflow-visible drop-shadow-md transition-colors duration-100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
    </svg>
  )
}

let activeCursorInstances = 0

export default function Cursor() {
  const [enabled, setEnabled] = useState(false)
  const [variant, setVariant] = useState<Variant>("default")
  const [isVisible, setIsVisible] = useState(false)
  const [isMouseDown, setIsMouseDown] = useState(false)

  const variantRef = useRef<Variant>("default")

  // Instant direct motion values (0ms latency, zero re-renders on mousemove)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    setEnabled(true)

    activeCursorInstances++
    document.documentElement.classList.add("cursor-none")

    const updateMouse = (clientX: number, clientY: number, target: HTMLElement | null) => {
      x.set(clientX)
      y.set(clientY)

      if (target && target.closest(".drawing-canvas")) {
        setIsVisible(false)
        return
      }
      setIsVisible(true)

      let nextVariant: Variant = "default"
      if (target && (target.closest(".grab") || target.closest("[draggable=true]"))) {
        nextVariant = "drag"
      } else if (
        target &&
        target.closest("a, button, input, textarea, select, [role=button], .cursor-pointer")
      ) {
        nextVariant = "link"
      }

      if (variantRef.current !== nextVariant) {
        variantRef.current = nextVariant
        setVariant(nextVariant)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      updateMouse(e.clientX, e.clientY, e.target as HTMLElement | null)
    }

    const handleDragOver = (e: DragEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setIsVisible(true)
      if (variantRef.current !== "drag") {
        variantRef.current = "drag"
        setVariant("drag")
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      setIsMouseDown(true)
      const t = e.target as HTMLElement | null
      if (t && (t.closest(".grab") || t.closest("[draggable=true]"))) {
        variantRef.current = "drag"
        setVariant("drag")
      }
    }

    const handleMouseUp = () => {
      setIsMouseDown(false)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    const handleMouseEnter = () => {
      setIsVisible(true)
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("dragover", handleDragOver, { passive: true })
    window.addEventListener("mousedown", handleMouseDown, { passive: true })
    window.addEventListener("mouseup", handleMouseUp, { passive: true })
    document.addEventListener("mouseleave", handleMouseLeave)
    document.addEventListener("mouseenter", handleMouseEnter)

    return () => {
      activeCursorInstances--
      if (activeCursorInstances <= 0) {
        activeCursorInstances = 0
        document.documentElement.classList.remove("cursor-none")
      }
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("mouseleave", handleMouseLeave)
      document.removeEventListener("mouseenter", handleMouseEnter)
    }
  }, [x, y])

  if (!enabled) return null

  const fill = variantColors[variant]

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {isVisible && (
        <motion.div
          style={{ left: x, top: y }}
          animate={{
            scale: isMouseDown ? 0.88 : variant === "link" ? 1.15 : variant === "drag" ? 1.25 : 1,
          }}
          transition={{ type: "spring", stiffness: 800, damping: 35 }}
          className="pointer-events-none fixed will-change-transform"
        >
          <CursorSVG fill={fill} />
        </motion.div>
      )}
    </div>
  )
}
