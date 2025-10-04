// src/store/useStore.ts
import { create } from "zustand"

export type Point = [number, number]
export type Detection = {
  id: number | string
  label: string
  cls: string
  name?: string
  points: Point[] | number[]
  score?: number
}

export type SelectionMode = 'normal' | 'multi-select'
export type SelectedVertex = {
  detectionId: number | string
  vertexIndex: number
}

type Unit = 'in' | 'cm' | 'm'
type Mode = 'rooms' | 'all'

interface StoreState {
  history: Detection[][]
  future: Detection[][]
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  image: string | null
  imageFile: File | null
  detections: Detection[]
  unit: Unit
  scale: number | null
  zoomPct: number
  mode: Mode
  lastAnalysisType: 'rooms' | 'all' | null
  
  // Selection state
  selectionMode: SelectionMode
  selectedVertices: SelectedVertex[]
  isSelecting: boolean
  selectionStart: Point | null
  selectionEnd: Point | null
  
  setImage: (img: string | null) => void
  setImageFile: (file: File | null) => void
  setDetections: (dets: Detection[]) => void
  setUnit: (unit: Unit) => void
  setScale: (scale: number | null) => void
  setZoomPct: (pct: number) => void
  setMode: (m: Mode) => void
  setLastAnalysisType: (type: 'rooms' | 'all' | null) => void
  updateDetection: (id: number | string, updated: Partial<Detection>) => void
  removeDetection: (id: number | string) => void
  addDetection: (det: Omit<Detection, "id">) => void
  
  // Selection actions
  setSelectionMode: (mode: SelectionMode) => void
  addSelectedVertex: (vertex: SelectedVertex) => void
  removeSelectedVertex: (vertex: SelectedVertex) => void
  toggleVertexSelection: (vertex: SelectedVertex) => void
  clearSelectedVertices: () => void
  setIsSelecting: (selecting: boolean) => void
  setSelectionStart: (point: Point | null) => void
  setSelectionEnd: (point: Point | null) => void
  selectVerticesInArea: (start: Point, end: Point) => void
  deleteSelectedVertices: () => void
  simplifySelectedVertices: (tolerance: number) => void
}

export const useStore = create<StoreState>((set, get) => ({
  image: null,
  history: [],
  future: [],
  canUndo: false,
  canRedo: false,
  lastAnalysisType: null,
  
  // Selection state
  selectionMode: 'normal',
  selectedVertices: [],
  isSelecting: false,
  selectionStart: null,
  selectionEnd: null,
  
  setDetections: (dets) => set((s) => ({
    history: [...s.history, s.detections],
    future: [],
    detections: dets,
    canUndo: true,
    canRedo: false,
    selectedVertices: [], // Clear selections when new detections loaded
  })),
  
  undo: () => set((s) => {
    if (s.history.length === 0) return {}
    const previous = s.history[s.history.length - 1]
    const newHistory = s.history.slice(0, -1)
    return {
      detections: previous,
      history: newHistory,
      future: [s.detections, ...s.future],
      canUndo: newHistory.length > 0,
      canRedo: true,
      selectedVertices: [], // Clear selections on undo
    }
  }),
  
  redo: () => set((s) => {
    if (s.future.length === 0) return {}
    const next = s.future[0]
    const newFuture = s.future.slice(1)
    return {
      detections: next,
      history: [...s.history, s.detections],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
      selectedVertices: [], // Clear selections on redo
    }
  }),
  
  imageFile: null,
  detections: [],
  unit: 'in',
  scale: null,
  zoomPct: 100,
  mode: 'all',
  
  setImage: (img) => set({ image: img }),
  setImageFile: (file) => set({ imageFile: file }),
  setUnit: (unit) => set({ unit }),
  setScale: (scale) => set({ scale }),
  setZoomPct: (pct) => set({ zoomPct: Math.max(10, Math.min(300, pct)) }),
  setMode: (m) => set({ mode: m }),
  setLastAnalysisType: (type) => set({ lastAnalysisType: type }),
  
  updateDetection: (id, updated) =>
    set((s) => ({
      history: [...s.history, s.detections],
      future: [],
      detections: s.detections.map(d => d.id === id ? { ...d, ...updated } : d),
      canUndo: true,
      canRedo: false,
      // Remove selected vertices for this detection if points changed
      selectedVertices: updated.points ? 
        s.selectedVertices.filter(v => v.detectionId !== id) : 
        s.selectedVertices
    })),
    
  removeDetection: (id) =>
    set((s) => ({
      history: [...s.history, s.detections],
      future: [],
      detections: s.detections.filter(d => d.id !== id),
      canUndo: true,
      canRedo: false,
      selectedVertices: s.selectedVertices.filter(v => v.detectionId !== id),
    })),
    
  addDetection: (det) =>
    set((s) => ({
      history: [...s.history, s.detections],
      future: [],
      detections: [
        ...s.detections, 
        { 
          ...det, 
          id: s.detections.length 
            ? Math.max(...s.detections.map(d => typeof d.id === 'number' ? d.id : 0)) + 1 
            : 0 
        }
      ],
      canUndo: true,
      canRedo: false
    })),

  // Selection actions
  setSelectionMode: (mode) => set({ 
    selectionMode: mode,
    selectedVertices: mode === 'normal' ? [] : get().selectedVertices
  }),

  addSelectedVertex: (vertex) => set((s) => ({
    selectedVertices: s.selectedVertices.find(v => 
      v.detectionId === vertex.detectionId && v.vertexIndex === vertex.vertexIndex
    ) ? s.selectedVertices : [...s.selectedVertices, vertex]
  })),

  removeSelectedVertex: (vertex) => set((s) => ({
    selectedVertices: s.selectedVertices.filter(v => 
      !(v.detectionId === vertex.detectionId && v.vertexIndex === vertex.vertexIndex)
    )
  })),

  toggleVertexSelection: (vertex) => {
    const s = get()
    const exists = s.selectedVertices.find(v => 
      v.detectionId === vertex.detectionId && v.vertexIndex === vertex.vertexIndex
    )
    if (exists) {
      s.removeSelectedVertex(vertex)
    } else {
      s.addSelectedVertex(vertex)
    }
  },

  clearSelectedVertices: () => set({ selectedVertices: [] }),

  setIsSelecting: (selecting) => set({ isSelecting: selecting }),
  setSelectionStart: (point) => set({ selectionStart: point }),
  setSelectionEnd: (point) => set({ selectionEnd: point }),

  selectVerticesInArea: (start, end) => {
    const s = get()
    const minX = Math.min(start[0], end[0])
    const maxX = Math.max(start[0], end[0])
    const minY = Math.min(start[1], end[1])
    const maxY = Math.max(start[1], end[1])
    
    const newSelections: SelectedVertex[] = []
    
    s.detections.forEach(detection => {
      const points = Array.isArray(detection.points[0]) 
        ? detection.points as Point[]
        : []
      
      points.forEach((point, index) => {
        const [x, y] = point
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          newSelections.push({ detectionId: detection.id, vertexIndex: index })
        }
      })
    })
    
    set({ selectedVertices: newSelections })
  },

  deleteSelectedVertices: () => {
    const s = get()
    if (s.selectedVertices.length === 0) return
    
    // Group by detection
    const byDetection = new Map<string | number, number[]>()
    s.selectedVertices.forEach(sv => {
      if (!byDetection.has(sv.detectionId)) {
        byDetection.set(sv.detectionId, [])
      }
      byDetection.get(sv.detectionId)!.push(sv.vertexIndex)
    })
    
    // Update each detection
    const updatedDetections = s.detections.map(detection => {
      const indicesToDelete = byDetection.get(detection.id)
      if (!indicesToDelete || indicesToDelete.length === 0) return detection
      
      const points = Array.isArray(detection.points[0]) 
        ? detection.points as Point[]
        : []
      
      // Don't delete if it would leave less than 3 points
      if (points.length - indicesToDelete.length < 3) return detection
      
      // Remove vertices (sort indices in reverse order to avoid index shifting)
      const newPoints = points.filter((_, index) => 
        !indicesToDelete.includes(index)
      )
      
      return { ...detection, points: newPoints }
    })
    
    set({
      history: [...s.history, s.detections],
      future: [],
      detections: updatedDetections,
      selectedVertices: [],
      canUndo: true,
      canRedo: false
    })
  },

  simplifySelectedVertices: (tolerance) => {
    const s = get()
    if (s.selectedVertices.length === 0) return
    
    // Group selections by detection
    const byDetection = new Map<string | number, number[]>()
    s.selectedVertices.forEach(sv => {
      if (!byDetection.has(sv.detectionId)) {
        byDetection.set(sv.detectionId, [])
      }
      byDetection.get(sv.detectionId)!.push(sv.vertexIndex)
    })
    
    const updatedDetections = s.detections.map(detection => {
      const selectedIndices = byDetection.get(detection.id)
      if (!selectedIndices || selectedIndices.length === 0) return detection
      
      const points = Array.isArray(detection.points[0]) 
        ? detection.points as Point[]
        : []
      
      // Simple simplification: remove vertices that are very close to their neighbors
      const newPoints = points.filter((point, index) => {
        if (!selectedIndices.includes(index)) return true
        
        const prevIndex = (index - 1 + points.length) % points.length
        const nextIndex = (index + 1) % points.length
        const prevPoint = points[prevIndex]
        const nextPoint = points[nextIndex]
        
        // Calculate distance from point to line between neighbors
        const distance = pointToLineDistance(point, prevPoint, nextPoint)
        return distance > tolerance
      })
      
      // Ensure we keep at least 3 points
      if (newPoints.length < 3) return detection
      
      return { ...detection, points: newPoints }
    })
    
    set({
      history: [...s.history, s.detections],
      future: [],
      detections: updatedDetections,
      selectedVertices: [],
      canUndo: true,
      canRedo: false
    })
  }
}))

// Helper function for point-to-line distance calculation
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const [px, py] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd
  
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  
  if (lenSq === 0) return Math.hypot(A, B)
  
  const param = dot / lenSq
  
  let xx, yy
  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }
  
  return Math.hypot(px - xx, py - yy)
}