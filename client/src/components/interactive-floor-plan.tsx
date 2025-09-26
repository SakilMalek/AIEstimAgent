import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  CheckCircle,
  Loader2
} from "lucide-react";
import type { Drawing } from "@shared/schema";

interface FloorPlanElement {
  id: string;
  type: string;
  coordinates: { x: number; y: number; width: number; height: number };
  highlighted: boolean;
}
interface InteractiveFloorPlanProps {
  drawing: Drawing | null;
  highlightedElement?: string | null;
  activeViewMode?: 'view' | 'annotate';
  activeTool?: 'ruler' | 'area' | 'count' | null;
  selectedScale?: string;
  onElementClick?: (elementId: string) => void;
  onMeasurement?: (measurement: { type: string; value: string; coordinates: any }) => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

export default function InteractiveFloorPlan({
  drawing,
  highlightedElement,
  activeViewMode = 'view',
  activeTool = null,
  selectedScale = "1/4\" = 1'",
  onElementClick,
  onMeasurement
}: InteractiveFloorPlanProps) {
  const [viewState, setViewState] = useState({ scale: 1, offsetX: 50, offsetY: 50 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isDrawingMeasurement, setIsDrawingMeasurement] = useState(false);
  const [measurementStart, setMeasurementStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMeasurement, setCurrentMeasurement] = useState<{ x: number; y: number } | null>(null);
  const [floorPlanElements, setFloorPlanElements] = useState<FloorPlanElement[]>([]);

  useEffect(() => {
    setFloorPlanElements(prev =>
      prev.map(element => ({ ...element, highlighted: highlightedElement === element.type }))
    );
  }, [highlightedElement]);

  const screenToImageCoords = useCallback((screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - viewState.offsetX) / viewState.scale;
    const y = (screenY - rect.top - viewState.offsetY) / viewState.scale;
    return { x, y };
  }, [viewState]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      if (activeViewMode !== 'view' && activeTool) return;

      const { clientX, clientY, deltaY } = e;
      const zoomIntensity = 0.1;
      const direction = deltaY > 0 ? -1 : 1;

      const { x: imageX, y: imageY } = screenToImageCoords(clientX, clientY);
      
      setViewState(prev => {
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + direction * zoomIntensity * prev.scale));
          const newOffsetX = prev.offsetX + (imageX * prev.scale - imageX * newScale);
          const newOffsetY = prev.offsetY + (imageY * prev.scale - imageY * newScale);
          return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
      });
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [activeViewMode, activeTool, screenToImageCoords]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeViewMode === 'annotate' && activeTool === 'ruler') {
      // Measurement logic would go here
    } else if (activeViewMode === 'view' || !activeTool) {
      isPanningRef.current = true;
      document.body.style.cursor = 'grabbing'; // Instantly change cursor
      panStartRef.current = {
        x: e.clientX - viewState.offsetX,
        y: e.clientY - viewState.offsetY
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const newOffsetX = e.clientX - panStartRef.current.x;
      const newOffsetY = e.clientY - panStartRef.current.y;
      setViewState(prev => ({ ...prev, offsetX: newOffsetX, offsetY: newOffsetY }));
    }
    // Measurement logic would go here
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    document.body.style.cursor = ''; // Instantly reset cursor
  };

  const handleZoomIn = () => setViewState(prev => ({ ...prev, scale: Math.min(prev.scale * 1.25, MAX_SCALE) }));
  const handleZoomOut = () => setViewState(prev => ({ ...prev, scale: Math.max(prev.scale / 1.25, MIN_SCALE) }));
  const handleFitToScreen = () => setViewState({ scale: 1, offsetX: 50, offsetY: 50 });
  const handleSliderChange = (value: number[]) => setViewState(prev => ({ ...prev, scale: value[0] }));

  const getElementColor = (type: string, highlighted: boolean) => { return '#6b7280' };
  const getElementOpacity = (highlighted: boolean, hasHighlight: boolean) => { return 0.8 };

  if (!drawing) {
    return <div></div>;
  }

  const isComplete = drawing.status === "complete" && drawing.aiProcessed;

  return (
    <div className="flex-1 bg-slate-100 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
        <Button variant="ghost" size="sm" onClick={handleZoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <Slider
          value={[viewState.scale]}
          onValueChange={handleSliderChange}
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={0.01}
          className="w-24"
        />
        <Button variant="ghost" size="sm" onClick={handleZoomIn}><ZoomIn className="w-4 h-4" /></Button>
        <span className="text-sm text-slate-600 px-2 min-w-[50px] text-center border-l">
          {Math.round(viewState.scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleFitToScreen} className="border-l"><Maximize className="w-4 h-4" /></Button>
      </div>

      <div className="absolute top-4 right-4 z-10">...</div>
      {isComplete && (<div className="absolute bottom-4 left-4 z-10">...</div>)}

      <div
        ref={containerRef}
        // MODIFICATION: Removed 'active:cursor-grabbing' to prevent conflicts
        className={`absolute inset-0 ${(activeViewMode === 'view' || !activeTool)
            ? 'cursor-grab'
            : 'cursor-crosshair'
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="bg-white border-2 border-slate-300 relative"
          style={{
            width: '800px',
            height: '600px',
            transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {drawing.fileUrl && (<img src={drawing.fileUrl} alt={drawing.name} className="w-full h-full object-contain" />)}
          {!drawing.fileUrl && (<div className="flex items-center justify-center w-full h-full bg-gray-100">
            <span className="text-gray-500">No floor plan image available</span>
          </div>)}
          {isComplete && floorPlanElements.map((element) => (
            <div
              key={element.id}
              style={{
                left: `${element.coordinates.x}px`,
                top: `${element.coordinates.y}px`,
                width: `${element.coordinates.width}px`,
                height: `${element.coordinates.height}px`,
                backgroundColor: getElementColor(element.type, element.highlighted),
                opacity: getElementOpacity(element.highlighted, !!highlightedElement),
              }}
            />
          ))}
        </div>
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* SVG content for measurements */}
        </svg>
      </div>
    </div>
  );
}