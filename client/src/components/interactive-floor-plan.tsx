// client/src/components/interactive-floor-plan.tsx — FULL UPDATED

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import type { Drawing } from "@shared/schema";
import EditableOverlay from "./EditableOverlay";
import { useStore } from "../store/useStore";
import type { Detection as StoreDetection } from "../store/useStore";
import { smartSimplify } from "../utils/polygonUtils";

type MaskPoint = { x: number; y: number };

interface DetectionItem {
  id: string;
  category: "openings" | "rooms" | "walls" | string;
  class: string;
  confidence: number;
  metrics: {
    width_px?: number;
    height_px?: number;
    area_px2?: number;
    perimeter_px?: number;
  } & Record<string, number>;
  name?: string;
  display?: Record<string, number>;
  mask: MaskPoint[]; // normalized points
}

interface AnalysisResults {
  image?: { width: number; height: number };
  predictions?: {
    openings?: DetectionItem[];
    rooms?: DetectionItem[];
    walls?: DetectionItem[];
  } & Record<string, DetectionItem[] | undefined>;
  errors?: Record<string, string | null>;
}

interface InteractiveFloorPlanProps {
  drawing: Drawing | null;
  highlightedElement?: string | null;
  activeViewMode?: 'view' | 'annotate';
  activeTool?: 'ruler' | 'area' | 'count' | null;
  selectedScale?: string;
  onElementClick?: (id: string) => void;
  onMeasurement?: (m: { type: string; value: string; coordinates: any }) => void;
  analysisResults?: AnalysisResults | null;
  isCalibrating?: boolean;
  calibrationPoints?: { x: number; y: number }[];
  onCalibrationClick?: (x: number, y: number) => void;
  isPanMode?: boolean;
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
  onMeasurement,
  analysisResults,
  isCalibrating = false,
  calibrationPoints = [],
  onCalibrationClick,
  isPanMode = false
}: InteractiveFloorPlanProps) {
  const [viewState, setViewState] = useState({ scale: 1, offsetX: 50, offsetY: 50 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten all detections to render easily
  const detections: DetectionItem[] = useMemo(() => {
    if (!analysisResults?.predictions) return [];
    return [
      ...(analysisResults.predictions.openings || []),
      ...(analysisResults.predictions.rooms || []),
      ...(analysisResults.predictions.walls || []),
    ];
  }, [analysisResults]);

  // Convert API detections to store format for EditableOverlay
  const storeDetections: StoreDetection[] = useMemo(() => {
    return detections.map(det => {
      // Convert mask points to Point[] format
      const rawPoints = det.mask.map(p => [p.x, p.y] as [number, number]);
      
      // Apply smart simplification to remove clustered and redundant points
      const simplifiedPoints = smartSimplify(rawPoints, {
        douglasPeuckerTolerance: 3,      // Remove points within 3px of the line
        clusterThreshold: 8,              // Merge points closer than 8px
        angleThreshold: 10,               // Remove points on lines (within 10 degrees)
        minPoints: 3                      // Keep at least 3 points for valid polygon
      });
      
      return {
        id: det.id,
        label: det.class || det.category,
        cls: det.class || det.category,
        name: det.name || det.class,
        points: simplifiedPoints,
        score: det.confidence
      };
    });
  }, [detections]);

  // Sync detections to store when they change
  const { setDetections: setStoreDetections } = useStore();
  useEffect(() => {
    console.log('Syncing detections to store:', storeDetections.length, storeDetections);
    if (storeDetections.length > 0) {
      setStoreDetections(storeDetections);
    }
  }, [storeDetections, setStoreDetections]);

  const screenToImageCoords = useCallback((sx: number, sy: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (sx - rect.left - viewState.offsetX) / viewState.scale;
    const y = (sy - rect.top - viewState.offsetY) / viewState.scale;
    return { x, y };
  }, [viewState]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (activeViewMode !== 'view' && activeTool) return;
      const { clientX, clientY, deltaY } = e;
      const dir = deltaY > 0 ? -1 : 1;
      const { x: imgX, y: imgY } = screenToImageCoords(clientX, clientY);
      setViewState(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + dir * 0.1 * prev.scale));
        const newOffsetX = prev.offsetX + (imgX * prev.scale - imgX * newScale);
        const newOffsetY = prev.offsetY + (imgY * prev.scale - imgY * newScale);
        return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [activeViewMode, activeTool, screenToImageCoords]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCalibrating && onCalibrationClick) {
      const { x, y } = screenToImageCoords(e.clientX, e.clientY);
      onCalibrationClick(x, y);
    } else if (isPanMode || ((activeViewMode === 'view' || !activeTool) && !storeDetections.length)) {
      // Allow panning in pan mode or when no detections (EditableOverlay handles its own events)
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY };
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setViewState(prev => ({ ...prev, offsetX: e.clientX - panStartRef.current.x, offsetY: e.clientY - panStartRef.current.y }));
    }
  };
  const handleMouseUp = () => (isPanningRef.current = false);

  const handleZoomIn = () => setViewState(p => ({ ...p, scale: Math.min(p.scale * 1.25, MAX_SCALE) }));
  const handleZoomOut = () => setViewState(p => ({ ...p, scale: Math.max(p.scale / 1.25, MIN_SCALE) }));
  const handleFitToScreen = () => setViewState({ scale: 1, offsetX: 50, offsetY: 50 });
  const handleSliderChange = (v: number[]) => setViewState(p => ({ ...p, scale: v[0] }));

  // helper to build an SVG path from normalized mask
  const maskPath = (mask: MaskPoint[], imgW: number, imgH: number) => {
    if (!mask?.length) return "";
    const pts = mask.map(p => `${p.x * imgW},${p.y * imgH}`).join(" L ");
    return `M ${pts} Z`;
  };

  if (!drawing) return <div />;

  const imgW = analysisResults?.image?.width || 2000;
  const imgH = analysisResults?.image?.height || 1500;

  return (
    <div className="flex-1 bg-slate-100 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
        <Button variant="ghost" size="sm" onClick={handleZoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <Slider value={[viewState.scale]} onValueChange={handleSliderChange} min={MIN_SCALE} max={MAX_SCALE} step={0.01} className="w-24" />
        <Button variant="ghost" size="sm" onClick={handleZoomIn}><ZoomIn className="w-4 h-4" /></Button>
        <span className="text-sm text-slate-600 px-2 min-w-[50px] text-center border-l">{Math.round(viewState.scale * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={handleFitToScreen} className="border-l"><Maximize className="w-4 h-4" /></Button>
      </div>

      <div
        ref={containerRef}
        className={`absolute inset-0 ${isCalibrating ? 'cursor-crosshair' : isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        {/* Background image layer */}
        <div
          className="bg-white border-2 border-slate-300 relative pointer-events-none"
          style={{ width: `${imgW}px`, height: `${imgH}px`, transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`, transformOrigin: "top left" }}
        >
          {drawing.fileUrl ? (
            <img src={drawing.fileUrl} alt={drawing.name} className="w-full h-full object-contain" />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-100"><span className="text-gray-500">No floor plan image available</span></div>
          )}
        </div>

        {/* EditableOverlay for interactive mask editing - positioned absolutely to match image */}
        {!isCalibrating && storeDetections.length > 0 && (
          <div 
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ 
              transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`,
              transformOrigin: "top left"
            }}
          >
            <EditableOverlay width={imgW} height={imgH} />
          </div>
        )}

        {/* SVG overlay for calibration only */}
        {isCalibrating && (
          <svg 
            className="absolute top-0 left-0 pointer-events-none" 
            style={{ 
              width: `${imgW}px`, 
              height: `${imgH}px`,
              transform: `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`,
              transformOrigin: "top left"
            }}
            viewBox={`0 0 ${imgW} ${imgH}`} 
            preserveAspectRatio="none"
          >
            {/* Calibration points and line */}
            {calibrationPoints.map((point, idx) => (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r={8}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
              />
            ))}
            {calibrationPoints.length === 2 && (
              <line
                x1={calibrationPoints[0].x}
                y1={calibrationPoints[0].y}
                x2={calibrationPoints[1].x}
                y2={calibrationPoints[1].y}
                stroke="#3b82f6"
                strokeWidth={3}
                strokeDasharray="5,5"
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
