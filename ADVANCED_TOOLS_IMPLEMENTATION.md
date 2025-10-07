# Advanced Takeoff Tools Implementation Plan

## 🎯 Overview
Implementation plan for professional takeoff editing tools inspired by Togal AI and PlanSwift.

## 📊 Current Architecture Analysis

### ✅ Already Implemented:
- **Canvas:** React-Konva for rendering
- **State:** Zustand store with undo/redo
- **Selection:** Multi-select vertices
- **Basic Editing:** Vertex dragging, deletion
- **Keyboard Shortcuts:** Escape, Delete, Ctrl+S, Ctrl+A

### 🔧 Existing Components:
- `EditableOverlay.tsx` - Main canvas component
- `useStore.ts` - State management
- `DraggableToolbar.tsx` - Tool UI
- Polygon rendering and manipulation

---

## 🛠️ Tools to Implement

### 1. **Cut/Subtract Tool** 🔪
**Purpose:** Remove areas from existing polygons (e.g., cut out columns, pools)

#### Implementation Strategy:

**A. Add Tool State:**
```typescript
// In useStore.ts
type ToolMode = 'select' | 'cut' | 'merge' | 'split' | 'measure' | 'markup'

interface StoreState {
  activeTool: ToolMode
  cutMode: {
    active: boolean
    targetPolygonId: string | null
    cutPoints: Point[]
  }
  setActiveTool: (tool: ToolMode) => void
}
```

**B. Polygon Boolean Operations:**
```typescript
// utils/polygonBoolean.ts
import * as martinez from 'martinez-polygon-clipping'

export function subtractPolygon(
  mainPolygon: Point[],
  cutPolygon: Point[]
): Point[][] {
  // Convert to martinez format
  const main = [mainPolygon.map(p => [p[0], p[1]])]
  const cut = [cutPolygon.map(p => [p[0], p[1]])]
  
  // Perform difference operation
  const result = martinez.diff(main, cut)
  
  // Convert back to Point[]
  return result.map(ring => 
    ring[0].map(([x, y]) => [x, y] as Point)
  )
}
```

**C. UI Flow:**
1. User selects Cut tool (keyboard: `C`)
2. Click on target polygon to select
3. Draw cutting shape by clicking points
4. Double-click or Enter to complete
5. Result: Original polygon split into multiple polygons

**D. Implementation Steps:**
- [ ] Install `martinez-polygon-clipping` library
- [ ] Create `utils/polygonBoolean.ts` with boolean operations
- [ ] Add cut mode state to store
- [ ] Add cut tool to toolbar
- [ ] Implement drawing cut shape on canvas
- [ ] Apply boolean operation on completion
- [ ] Update detections with result polygons

---

### 2. **Merge Tool** 🔗
**Purpose:** Combine adjacent polygons or extend existing ones

#### Implementation Strategy:

**A. Add Merge State:**
```typescript
interface StoreState {
  mergeMode: {
    active: boolean
    sourcePolygonId: string | null
    mergePoints: Point[]
  }
}
```

**B. Polygon Union:**
```typescript
// utils/polygonBoolean.ts
export function mergePolygons(
  polygon1: Point[],
  polygon2: Point[]
): Point[] {
  const poly1 = [polygon1.map(p => [p[0], p[1]])]
  const poly2 = [polygon2.map(p => [p[0], p[1]])]
  
  const result = martinez.union(poly1, poly2)
  
  // Return largest polygon (main result)
  return result[0][0].map(([x, y]) => [x, y] as Point)
}
```

**C. UI Flow:**
1. User selects Merge tool (keyboard: `M`)
2. Click inside source polygon
3. Draw extension shape
4. Double-click to complete
5. Result: Extended/merged polygon

**D. Implementation Steps:**
- [ ] Add merge mode state
- [ ] Add merge tool to toolbar
- [ ] Implement polygon selection
- [ ] Draw merge shape
- [ ] Apply union operation
- [ ] Update detection with merged result

---

### 3. **Split Tool** ✂️
**Purpose:** Divide polygons into multiple segments

#### Implementation Strategy:

**A. Add Split State:**
```typescript
interface StoreState {
  splitMode: {
    active: boolean
    targetPolygonIds: string[]
    splitLine: Point[]
  }
}
```

**B. Line-Polygon Intersection:**
```typescript
// utils/polygonSplit.ts
import { lineIntersectsPolygon, splitPolygonByLine } from './geometryUtils'

export function splitPolygon(
  polygon: Point[],
  splitLine: Point[]
): Point[][] {
  // Find intersection points
  const intersections = findIntersections(polygon, splitLine)
  
  if (intersections.length < 2) return [polygon]
  
  // Split polygon at intersection points
  return performSplit(polygon, intersections)
}
```

**C. UI Flow:**
1. User selects Split tool (keyboard: `S`)
2. Select target polygon(s)
3. Draw split line (start outside polygon)
4. Double-click to complete
5. Result: Multiple polygons

**D. Implementation Steps:**
- [ ] Add split mode state
- [ ] Create `utils/polygonSplit.ts`
- [ ] Implement line-polygon intersection
- [ ] Add split tool to toolbar
- [ ] Draw split line with preview
- [ ] Apply split operation
- [ ] Create new detections for each segment

---

### 4. **Measure Tool** 📏
**Purpose:** Measure distances and areas

#### Implementation Strategy:

**A. Add Measurement State:**
```typescript
interface Measurement {
  id: string
  type: 'distance' | 'area' | 'perimeter'
  points: Point[]
  value: number
  unit: string
  label?: string
}

interface StoreState {
  measurements: Measurement[]
  measureMode: {
    active: boolean
    currentPoints: Point[]
  }
  addMeasurement: (m: Measurement) => void
  removeMeasurement: (id: string) => void
}
```

**B. Measurement Calculations:**
```typescript
// utils/measurements.ts
export function calculateDistance(p1: Point, p2: Point, scale: number): number {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const pixels = Math.sqrt(dx * dx + dy * dy)
  return pixels / scale // Convert to real units
}

export function calculateArea(points: Point[], scale: number): number {
  // Shoelace formula
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return Math.abs(area / 2) / (scale * scale)
}
```

**C. UI Flow:**
1. User selects Measure tool
2. Click points to measure
3. Display real-time measurement
4. Results show in quantities panel
5. Measurements persist on canvas

**D. Implementation Steps:**
- [ ] Add measurement state
- [ ] Create `utils/measurements.ts`
- [ ] Add measure tool to toolbar
- [ ] Render measurement lines/areas
- [ ] Display measurement labels
- [ ] Add to quantities panel

---

### 5. **Markup Tool** ✏️
**Purpose:** Add annotations, text, arrows, symbols

#### Implementation Strategy:

**A. Add Markup Types:**
```typescript
type MarkupType = 'freehand' | 'arrow' | 'text' | 'rectangle' | 'circle' | 'stamp'

interface Markup {
  id: string
  type: MarkupType
  points?: Point[]
  text?: string
  style: {
    color: string
    strokeWidth: number
    fontSize?: number
  }
}

interface StoreState {
  markups: Markup[]
  markupMode: {
    active: boolean
    type: MarkupType
    currentMarkup: Partial<Markup> | null
  }
}
```

**B. Markup Components:**
```typescript
// components/MarkupLayer.tsx
export function MarkupLayer({ markups }: { markups: Markup[] }) {
  return (
    <Layer>
      {markups.map(markup => {
        switch (markup.type) {
          case 'freehand':
            return <Line key={markup.id} points={markup.points.flat()} {...markup.style} />
          case 'arrow':
            return <Arrow key={markup.id} points={markup.points.flat()} {...markup.style} />
          case 'text':
            return <Text key={markup.id} text={markup.text} {...markup.style} />
          // ... other types
        }
      })}
    </Layer>
  )
}
```

**C. UI Flow:**
1. User selects Markup tool
2. Sub-menu appears with markup types
3. Select type (freehand, arrow, text, etc.)
4. Draw/place markup on canvas
5. Customize color, size, style
6. Markups export with takeoffs

**D. Implementation Steps:**
- [ ] Add markup state
- [ ] Create `MarkupLayer.tsx` component
- [ ] Add markup toolbar with sub-menu
- [ ] Implement each markup type
- [ ] Add style customization panel
- [ ] Export markups with reports

---

### 6. **Enhanced Undo/Redo** ↩️↪️
**Purpose:** Comprehensive history management

#### Current Implementation:
```typescript
// Already in useStore.ts
history: Detection[][]
future: Detection[][]
undo: () => void
redo: () => void
```

#### Enhancements Needed:

**A. Expand History to Include All Actions:**
```typescript
type HistoryAction = {
  type: 'detection' | 'measurement' | 'markup'
  timestamp: number
  before: any
  after: any
}

interface StoreState {
  history: HistoryAction[]
  historyIndex: number
  maxHistorySize: number
}
```

**B. Action Recording:**
```typescript
function recordAction(action: HistoryAction) {
  set(state => ({
    history: [
      ...state.history.slice(0, state.historyIndex + 1),
      action
    ].slice(-state.maxHistorySize),
    historyIndex: state.historyIndex + 1,
    future: []
  }))
}
```

**C. Implementation Steps:**
- [ ] Expand history to include all action types
- [ ] Add action recording wrapper
- [ ] Enhance undo/redo to handle all types
- [ ] Add visual history panel (optional)
- [ ] Keyboard shortcuts already work (Ctrl+Z/Y)

---

## 🎨 UI Components to Create

### 1. **Tool Palette** (Left Panel)
```typescript
// components/ToolPalette.tsx
const tools = [
  { id: 'select', icon: <Cursor />, label: 'Select', key: '' },
  { id: 'cut', icon: <Scissors />, label: 'Cut/Subtract', key: 'C' },
  { id: 'merge', icon: <Merge />, label: 'Merge', key: 'M' },
  { id: 'split', icon: <Split />, label: 'Split', key: 'S' },
  { id: 'measure', icon: <Ruler />, label: 'Measure', key: '' },
  { id: 'markup', icon: <Pencil />, label: 'Markup', key: '' },
]
```

### 2. **Markup Sub-Menu** (Bottom Panel)
```typescript
// components/MarkupMenu.tsx
const markupTypes = [
  { id: 'freehand', icon: <Pen />, label: 'Draw' },
  { id: 'arrow', icon: <ArrowRight />, label: 'Arrow' },
  { id: 'text', icon: <Type />, label: 'Text' },
  { id: 'rectangle', icon: <Square />, label: 'Rectangle' },
  { id: 'circle', icon: <Circle />, label: 'Circle' },
  { id: 'stamp', icon: <Stamp />, label: 'Stamp' },
]
```

### 3. **Style Panel** (Right Panel)
```typescript
// components/StylePanel.tsx
- Color picker
- Stroke width slider
- Font size (for text)
- Opacity slider
- Fill/No fill toggle
```

---

## 📦 Dependencies to Install

```bash
npm install martinez-polygon-clipping
npm install @turf/turf  # For advanced geometry operations
npm install polygon-clipping  # Alternative to martinez
npm install konva  # Already installed
```

---

## 🗂️ File Structure

```
client/src/
├── components/
│   ├── tools/
│   │   ├── ToolPalette.tsx
│   │   ├── CutTool.tsx
│   │   ├── MergeTool.tsx
│   │   ├── SplitTool.tsx
│   │   ├── MeasureTool.tsx
│   │   └── MarkupTool.tsx
│   ├── markup/
│   │   ├── MarkupLayer.tsx
│   │   ├── MarkupMenu.tsx
│   │   └── StylePanel.tsx
│   └── EditableOverlay.tsx (enhance)
├── utils/
│   ├── polygonBoolean.ts (NEW)
│   ├── polygonSplit.ts (NEW)
│   ├── measurements.ts (NEW)
│   ├── geometryUtils.ts (enhance)
│   └── polygonUtils.ts (existing)
└── store/
    └── useStore.ts (enhance)
```

---

## 🎯 Implementation Phases

### **Phase 1: Foundation** (Week 1)
- [ ] Install dependencies
- [ ] Create utility functions for boolean operations
- [ ] Enhance store with tool modes
- [ ] Create ToolPalette component

### **Phase 2: Core Tools** (Week 2-3)
- [ ] Implement Cut/Subtract tool
- [ ] Implement Merge tool
- [ ] Implement Split tool
- [ ] Add keyboard shortcuts

### **Phase 3: Measurement** (Week 4)
- [ ] Implement Measure tool
- [ ] Add measurement display
- [ ] Integrate with quantities panel

### **Phase 4: Markup** (Week 5)
- [ ] Implement Markup tool
- [ ] Create markup types
- [ ] Add style customization
- [ ] Export functionality

### **Phase 5: Polish** (Week 6)
- [ ] Enhanced undo/redo
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Testing and bug fixes

---

## 🎮 Keyboard Shortcuts Summary

| Tool | Shortcut | Action |
|------|----------|--------|
| Select | Default | Select polygons/vertices |
| Cut | `C` | Activate cut tool |
| Merge | `M` | Activate merge tool |
| Split | `S` | Activate split tool |
| Undo | `Ctrl+Z` | Undo last action |
| Redo | `Ctrl+Y` | Redo last undone action |
| Delete | `Delete` | Delete selected |
| Escape | `Esc` | Cancel/Deselect |
| Multi-Select | `Shift+Click` | Add to selection |

---

## 💡 Key Technical Considerations

### 1. **Performance**
- Use `useMemo` for expensive calculations
- Implement virtual rendering for large datasets
- Debounce real-time measurements

### 2. **Accuracy**
- Use proper scale factors for measurements
- Handle floating-point precision
- Validate polygon topology

### 3. **UX**
- Visual feedback for all operations
- Preview before committing
- Clear error messages
- Undo any mistake

### 4. **Data Integrity**
- Validate polygon results (no self-intersections)
- Maintain detection metadata
- Preserve classification after operations

---

## 🚀 Quick Start Implementation

Would you like me to start implementing any specific tool first? I recommend starting with:

1. **Cut Tool** - Most requested, clear use case
2. **Measure Tool** - Easier to implement, immediate value
3. **Split Tool** - Common operation, good foundation

Let me know which tool you'd like to tackle first, and I'll create the complete implementation!
