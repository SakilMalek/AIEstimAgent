// src/components/SelectionBox.tsx
// import React from "react"
import { Rect } from "react-konva"
import type { Point } from "../store/useStore"

interface Props {
  start: Point | null
  end: Point | null
  visible: boolean
}

export default function SelectionBox({ start, end, visible }: Props) {
  if (!visible || !start || !end) return null
  
  const x = Math.min(start[0], end[0])
  const y = Math.min(start[1], end[1])
  const width = Math.abs(end[0] - start[0])
  const height = Math.abs(end[1] - start[1])
  
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke="#2563eb"
      strokeWidth={1}
      fill="rgba(37, 99, 235, 0.1)"
      dash={[5, 5]}
      listening={false}
    />
  )
}