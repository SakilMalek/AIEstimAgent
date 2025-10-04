// src/components/DraggableToolbar.tsx
import React from "react"
import { Html } from "react-konva-utils"
import type { Point, Detection } from "../store/useStore"
import { calculateOptimalDialogPosition } from "../utils/polygonUtils"
import { toPairs } from "../utils/geometry"
import { Trash2, Copy, Sparkles, Check, GripVertical } from "lucide-react"

interface Props {
  detection: Detection
  canvasSize: [number, number]
  onDelete: () => void
  onCopy: () => void
  onDone: () => void
  onSimplify?: () => void
  selectedVerticesCount?: number
}

export default function DraggableToolbar({ 
  detection, 
  canvasSize, 
  onDelete, 
  onCopy, 
  onDone, 
  onSimplify,
  selectedVerticesCount = 0
}: Props) {
  const [position, setPosition] = React.useState<Point | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [hasBeenDragged, setHasBeenDragged] = React.useState(false)
  const toolbarRef = React.useRef<HTMLDivElement>(null)
  const dragStartPos = React.useRef<Point>([0, 0])

  // Calculate initial position only when detection ID changes (not on every point update)
  React.useEffect(() => {
    // Only recalculate if not manually dragged
    if (hasBeenDragged) return
    
    // Ensure points is Point[] format
    const points = Array.isArray(detection.points[0]) 
      ? detection.points as Point[]
      : []
    
    if (points.length === 0) return
    
    const dialogSize: [number, number] = [280, 50] // Estimated toolbar size
    const optimalPos = calculateOptimalDialogPosition(points, dialogSize, canvasSize)
    setPosition(optimalPos)
  }, [detection.id, canvasSize, hasBeenDragged])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!position) return
    
    setIsDragging(true)
    setHasBeenDragged(true)
    
    // Store the offset between mouse and toolbar position
    dragStartPos.current = [e.clientX - position[0], e.clientY - position[1]]
    
    // Add global mouse move and up listeners
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStartPos.current[0]
      const newY = e.clientY - dragStartPos.current[1]
      
      // Clamp to canvas bounds with some padding
      const clampedX = Math.max(10, Math.min(newX, canvasSize[0] - 300))
      const clampedY = Math.max(10, Math.min(newY, canvasSize[1] - 60))
      
      setPosition([clampedX, clampedY])
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!position) return null

  const hasSelectedVertices = Number(selectedVerticesCount) > 0

  return (
    <Html
      transform={false}
      divProps={{
        style: {
          pointerEvents: 'auto',
        }
      }}
    >
      <div
        ref={toolbarRef}
        style={{
          position: "absolute",
          top: position[1],
          left: position[0],
          background: "white",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          borderRadius: 8,
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: 'none',
          minWidth: "fit-content",
        }}
      >
        {/* Drag handle */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            padding: '4px',
            color: '#94a3b8',
            transition: 'color 0.2s'
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => e.currentTarget.style.color = '#64748b'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
        >
          <GripVertical size={16} />
        </div>
        
        {/* Buttons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2'
              e.currentTarget.style.borderColor = '#fecaca'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
            title="Delete polygon"
          >
            <Trash2 size={14} />
            Delete
          </button>
          
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
            title="Copy polygon"
          >
            <Copy size={14} />
            Copy
          </button>
          
          {hasSelectedVertices && onSimplify && (
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #dbeafe',
                background: '#eff6ff',
                color: '#2563eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSimplify()
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dbeafe'
                e.currentTarget.style.borderColor = '#93c5fd'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#eff6ff'
                e.currentTarget.style.borderColor = '#dbeafe'
              }}
              title={`Simplify ${selectedVerticesCount} selected vertices`}
            >
              <Sparkles size={14} />
              Simplify ({selectedVerticesCount})
            </button>
          )}
          
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#16a34a',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onDone()
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dcfce7'
              e.currentTarget.style.borderColor = '#86efac'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0fdf4'
              e.currentTarget.style.borderColor = '#bbf7d0'
            }}
            title="Finish editing"
          >
            <Check size={14} />
            Done
          </button>
        </div>
      </div>
    </Html>
  )
}