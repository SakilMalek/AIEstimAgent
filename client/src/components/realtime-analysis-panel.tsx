// client/src/components/realtime-analysis-panel.tsx — FULL UPDATED

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle } from "lucide-react";
import type { Drawing } from "@shared/schema";

type MaskPoint = { x: number; y: number };
interface DetectionItem {
  id: string;
  category: "openings" | "rooms" | "walls" | string;
  class: string;
  confidence: number;
  metrics: Record<string, number>;
  name?: string;
  display?: Record<string, number>;
  mask: MaskPoint[];
}

interface Props {
  drawing: Drawing | null;
  selectedTypes: string[];
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
  onElementHover?: (k: string | null) => void;
  analysisResults?: {
    predictions?: {
      openings?: DetectionItem[];
      rooms?: DetectionItem[];
      walls?: DetectionItem[];
      [k: string]: DetectionItem[] | undefined;
    };
    errors?: Record<string, string | null>;
  } | null;
}

function number(n?: number, digits = 0) {
  if (n === undefined || n === null) return "—";
  const f = digits > 0 ? n : Math.round(n);
  return digits > 0 ? f.toFixed(digits) : String(f);
}

export default function RealtimeAnalysisPanel({
  drawing,
  selectedTypes,
  isAnalyzing,
  onStartAnalysis,
  onElementHover,
  analysisResults
}: Props) {
  const [roomEdits, setRoomEdits] = useState<Record<string, string>>({});

  const cats = useMemo(() => {
    const p = analysisResults?.predictions || {};
    return {
      openings: p.openings || [],
      rooms: p.rooms || [],
      walls: p.walls || [],
    };
  }, [analysisResults]);

  const totals = useMemo(() => {
    const openCount = cats.openings.length;
    const roomArea = cats.rooms.reduce((s, r) => s + (r.display?.area_sqft || 0), 0);
    const roomPerim = cats.rooms.reduce((s, r) => s + (r.display?.perimeter_ft || 0), 0);
    const wallCount = cats.walls.length;
    const wallLength = cats.walls.reduce((s, w) => s + (w.display?.perimeter_ft || 0), 0);
    return { openCount, roomArea, roomPerim, wallCount, wallLength };
  }, [cats]);

  const editedName = (id: string, fallback: string) => roomEdits[id] ?? fallback;

  return (
    <div className="h-full overflow-auto bg-white border-l border-slate-200">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">Analysis Results</h3>
            {isAnalyzing && <Badge variant="secondary" className="text-xs">Analyzing...</Badge>}
          </div>
          <Button size="sm" onClick={onStartAnalysis} disabled={!drawing || isAnalyzing}>
            {isAnalyzing ? 'Running...' : 'Run Analysis'}
          </Button>
        </div>
        {drawing && (
          <div className="text-xs text-slate-500">
            {drawing.name}
          </div>
        )}

        {/* quick totals */}
        <div className="space-y-3 mt-4">
          {/* Openings Card */}
          <Card className="p-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Openings</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Doors</div>
                <div className="text-2xl font-bold text-slate-900">
                  {cats.openings.filter(o => o.class.toLowerCase().includes('door')).length}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Windows</div>
                <div className="text-2xl font-bold text-slate-900">
                  {cats.openings.filter(o => o.class.toLowerCase().includes('window')).length}
                </div>
              </div>
            </div>
          </Card>

          {/* Rooms Card */}
          <Card className="p-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Rooms & Flooring</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Total Area</div>
                <div className="text-2xl font-bold text-slate-900">{number(totals.roomArea, 1)}</div>
                <div className="text-xs text-slate-500">sq ft</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Perimeter</div>
                <div className="text-2xl font-bold text-slate-900">{number(totals.roomPerim, 1)}</div>
                <div className="text-xs text-slate-500">ft</div>
              </div>
            </div>
          </Card>

          {/* Walls Card */}
          <Card className="p-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Walls</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Segments</div>
                <div className="text-2xl font-bold text-slate-900">{totals.wallCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Length</div>
                <div className="text-2xl font-bold text-slate-900">{number(totals.wallLength, 1)}</div>
                <div className="text-xs text-slate-500">LF</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="rooms" className="w-full">
        <div className="border-b border-slate-200 px-4">
          <TabsList className="w-full bg-transparent h-auto p-0 gap-1">
            <TabsTrigger 
              value="rooms" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-3 py-2 text-xs font-medium"
            >
              Rooms
            </TabsTrigger>
            <TabsTrigger 
              value="openings" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-3 py-2 text-xs font-medium"
            >
              Openings
            </TabsTrigger>
            <TabsTrigger 
              value="walls" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-3 py-2 text-xs font-medium"
            >
              Walls
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Rooms */}
        <TabsContent value="rooms" className="p-3">
          {cats.rooms.length === 0 ? (
            <div className="text-xs text-slate-500">No rooms detected.</div>
          ) : (
            <div className="space-y-2">
              {cats.rooms.map(r => (
                <Card key={r.id} className="p-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      className="h-8"
                      value={editedName(r.id, r.name ?? r.class ?? "Room")}
                      onChange={(e) => setRoomEdits(s => ({ ...s, [r.id]: e.target.value }))}
                    />
                    <Badge variant="outline">{Math.round((r.confidence ?? 0) * 100)}%</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    <div>Area: <span className="font-medium">{number(r.display?.area_sqft, 1)}</span> sq ft</div>
                    <div>Perimeter: <span className="font-medium">{number(r.display?.perimeter_ft, 1)}</span> ft</div>
                    <div>Class: <span className="font-medium">{r.class}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Openings */}
        <TabsContent value="openings" className="p-3">
          {cats.openings.length === 0 ? (
            <div className="text-xs text-slate-500">No doors/windows detected.</div>
          ) : (
            <>
              {/* Group by type */}
              {['door', 'window'].map(type => {
                const items = cats.openings.filter(o => o.class.toLowerCase().includes(type));
                if (items.length === 0) return null;
                
                return (
                  <div key={type} className="mb-4">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span>{type}s ({items.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((o, idx) => (
                        <div key={o.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                              {idx + 1}
                            </div>
                            <span className="text-sm text-slate-700 capitalize">{o.class}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round((o.confidence ?? 0) * 100)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="text-xs text-blue-800">
                  <span className="font-medium">Note:</span> Opening dimensions should be verified against blueprint annotations or specifications.
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Walls */}
        <TabsContent value="walls" className="p-3">
          {cats.walls.length === 0 ? (
            <div className="text-xs text-slate-500">No walls detected.</div>
          ) : (
            <div className="space-y-2">
              {cats.walls.map(w => (
                <Card key={w.id} className="p-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{w.class}</div>
                    <Badge variant="outline">{Math.round((w.confidence ?? 0) * 100)}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>Length: <span className="font-medium">{number(w.display?.perimeter_ft, 1)}</span> LF</div>
                    <div>Area: <span className="font-medium">{number(w.display?.area_sqft, 1)}</span> SF</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!!analysisResults?.errors && (
        <div className="p-3 border-t">
          <div className="text-xs font-medium mb-1">Model Errors</div>
          <ul className="text-xs list-disc ml-4">
            {Object.entries(analysisResults.errors).map(([k, v]) => v ? <li key={k}><span className="font-semibold">{k}:</span> {String(v)}</li> : null)}
          </ul>
        </div>
      )}
    </div>
  );
}
