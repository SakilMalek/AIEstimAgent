import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  CheckCircle,
  Loader2
} from "lucide-react";
import type { Drawing } from "@shared/schema";

interface DrawingViewerProps {
  drawing: Drawing | null;
}

export default function DrawingViewer({ drawing }: DrawingViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 400));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleFitToScreen = () => {
    setZoom(100);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!drawing) {
    return (
      <div className="flex-1 bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Maximize className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Drawing Selected</h3>
          <p className="text-sm text-slate-600">Select a drawing from the sidebar to view it here</p>
        </div>
      </div>
    );
  }

  const isProcessing = drawing.status === "processing";
  const isComplete = drawing.status === "complete" && drawing.aiProcessed;

  return (
    <div className="flex-1 bg-slate-100 relative overflow-hidden">
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1">
        <Button variant="ghost" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-slate-600 px-2 min-w-[60px] text-center">
          {zoom}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleFitToScreen}>
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      {/* AI Status Indicator */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3 border border-slate-200">
        <div className="flex items-center space-x-2">
          {isProcessing ? (
            <>
              <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
              <span className="text-sm font-medium text-slate-700">AI Processing...</span>
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-sm font-medium text-slate-700">AI Analysis Complete</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-slate-400 rounded-full" />
              <span className="text-sm font-medium text-slate-700">Ready for Analysis</span>
            </>
          )}
        </div>
        {isComplete && (
          <p className="text-xs text-slate-500 mt-1">
            Detected: 8 doors, 12 windows, 6 rooms
          </p>
        )}
      </div>

      {/* Drawing Container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center p-8 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Blueprint Image */}
        <div 
          className="relative bg-white shadow-lg rounded-lg overflow-hidden"
          style={{
            transform: `scale(${zoom / 100}) translate(${offset.x}px, ${offset.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease',
          }}
        >
          {/* Mock Blueprint Image */}
          <img
            src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800"
            alt={drawing.name}
            className="max-w-[800px] max-h-[600px] object-contain"
            draggable={false}
          />
          
          {/* AI Detection Overlays */}
          {isComplete && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Door Detection Markers */}
              <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg animate-pulse">
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Door (36")
                </div>
              </div>
              <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg animate-pulse">
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Door (32")
                </div>
              </div>
              
              {/* Window Detection Markers */}
              <div className="absolute top-1/4 right-1/3 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg animate-pulse">
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Window (3'x4')
                </div>
              </div>
              <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg animate-pulse">
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Window (2'x3')
                </div>
              </div>
              
              {/* Area Highlights */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-24 border-2 border-amber-400 bg-amber-100 bg-opacity-30 rounded cursor-pointer hover:bg-opacity-50">
                <div className="absolute -top-6 left-0 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                  Living Room: 245 sq ft
                </div>
              </div>

              {/* Electrical Elements */}
              <div className="absolute top-1/4 left-1/2 w-3 h-3 bg-yellow-500 border border-white rounded-full shadow">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white text-xs px-1 py-0.5 rounded">
                  Outlet
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blueprint-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Processing Drawing</h3>
              <p className="text-sm text-slate-600 mb-4">
                AI is analyzing your blueprint for doors, windows, and measurements...
              </p>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blueprint-600 h-2 rounded-full transition-all duration-300 w-2/3"></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">This usually takes 30-60 seconds</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
