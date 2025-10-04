import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DoorOpen, 
  Square, 
  Zap, 
  Droplets,
  Calculator,
  Edit,
  Download
} from "lucide-react";
import type { Drawing, Takeoff } from "@shared/schema";

interface TakeoffPanelProps {
  drawing: Drawing | null;
}

interface TakeoffSummary {
  doors: { total: number; interior36: number; interior32: number; entry: number };
  windows: { total: number; doubleHung: number; casement: number; picture: number };
  flooring: { hardwood: number; tile: number; carpet: number; total: number };
  electrical: { outlets: number; lights: number; switches: number };
  walls: { length: number };
  rooms: { total: number; totalArea: number; totalPerimeter: number };
  costs: { materials: number; labor: number; total: number };
}

export default function TakeoffPanel({ drawing }: TakeoffPanelProps) {
  const { data: takeoffs = [], isLoading } = useQuery<Takeoff[]>({
    queryKey: ["/api/drawings", drawing?.id, "takeoffs"],
    enabled: !!drawing?.id,
  });

  if (!drawing) {
    return (
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Takeoff Results</h2>
          <p className="text-sm text-slate-600">Select a drawing to view takeoff data</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600">No drawing selected</p>
          </div>
        </div>
      </div>
    );
  }

  // Process takeoffs into summary
  const summary: TakeoffSummary = {
    doors: { total: 0, interior36: 0, interior32: 0, entry: 0 },
    windows: { total: 0, doubleHung: 0, casement: 0, picture: 0 },
    flooring: { hardwood: 0, tile: 0, carpet: 0, total: 0 },
    electrical: { outlets: 0, lights: 0, switches: 0 },
    walls: { length: 0 },
    rooms: { total: 0, totalArea: 0, totalPerimeter: 0 },
    costs: { materials: 0, labor: 0, total: 0 },
  };

  if (takeoffs && Array.isArray(takeoffs)) {
    (takeoffs as Takeoff[]).forEach((takeoff: Takeoff) => {
      const cost = takeoff.totalCost || 0;
      summary.costs.total += cost;

      switch (takeoff.elementType) {
        case "doors":
          summary.doors.total += takeoff.quantity || 0;
          if (takeoff.elementName.includes("36")) {
            summary.doors.interior36 += takeoff.quantity || 0;
          } else if (takeoff.elementName.includes("32")) {
            summary.doors.interior32 += takeoff.quantity || 0;
          } else if (takeoff.elementName.toLowerCase().includes("entry")) {
            summary.doors.entry += takeoff.quantity || 0;
          }
          break;
        case "windows":
          summary.windows.total += takeoff.quantity || 0;
          if (takeoff.elementName.toLowerCase().includes("double hung")) {
            summary.windows.doubleHung += takeoff.quantity || 0;
          } else if (takeoff.elementName.toLowerCase().includes("casement")) {
            summary.windows.casement += takeoff.quantity || 0;
          } else if (takeoff.elementName.toLowerCase().includes("picture")) {
            summary.windows.picture += takeoff.quantity || 0;
          }
          break;
        case "flooring":
          const area = takeoff.area || 0;
          summary.flooring.total += area;
          if (takeoff.elementName.toLowerCase().includes("hardwood")) {
            summary.flooring.hardwood += area;
          } else if (takeoff.elementName.toLowerCase().includes("tile")) {
            summary.flooring.tile += area;
          } else if (takeoff.elementName.toLowerCase().includes("carpet")) {
            summary.flooring.carpet += area;
          }
          break;
        case "electrical":
          if (takeoff.elementName.toLowerCase().includes("outlet")) {
            summary.electrical.outlets += takeoff.quantity || 0;
          } else if (takeoff.elementName.toLowerCase().includes("light")) {
            summary.electrical.lights += takeoff.quantity || 0;
          } else if (takeoff.elementName.toLowerCase().includes("switch")) {
            summary.electrical.switches += takeoff.quantity || 0;
          }
          break;
        case "walls":
          summary.walls.length += takeoff.length || 0;
          break;
        case "rooms":
          summary.rooms.total += takeoff.quantity || 0;
          summary.rooms.totalArea += takeoff.area || 0;
          summary.rooms.totalPerimeter += takeoff.length || 0; // Perimeter is stored in length field
          break;
      }
    });

    // Calculate materials and labor breakdown (assuming 60/40 split)
    summary.costs.materials = summary.costs.total * 0.6;
    summary.costs.labor = summary.costs.total * 0.4;
  }

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Takeoff Results</h2>
        <p className="text-sm text-slate-600">AI-powered measurements and manual adjustments</p>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-100 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : takeoffs && Array.isArray(takeoffs) && takeoffs.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="p-4 space-y-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                      <DoorOpen className="w-4 h-4 mr-2" />
                      Total Doors
                    </h3>
                    <span className="text-lg font-bold text-blue-700">{summary.doors.total}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">AI Detected + Manual Count</p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-green-900 flex items-center">
                      <Square className="w-4 h-4 mr-2" />
                      Total Windows
                    </h3>
                    <span className="text-lg font-bold text-green-700">{summary.windows.total}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Standard & Custom Sizes</p>
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-amber-900">Floor Area</h3>
                    <span className="text-lg font-bold text-amber-700">
                      {summary.flooring.total.toLocaleString()} sq ft
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">Measured Areas Combined</p>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-purple-900">Wall Length</h3>
                    <span className="text-lg font-bold text-purple-700">
                      {summary.walls.length.toLocaleString()} ft
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Interior + Exterior</p>
                </CardContent>
              </Card>
              
              {summary.rooms.total > 0 && (
                <>
                  <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-indigo-900">Total Room Area</h3>
                        <span className="text-lg font-bold text-indigo-700">
                          {summary.rooms.totalArea.toLocaleString()} sq ft
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 mt-1">{summary.rooms.total} Room{summary.rooms.total !== 1 ? 's' : ''} Detected</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-cyan-50 border-cyan-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-cyan-900">Room Perimeter</h3>
                        <span className="text-lg font-bold text-cyan-700">
                          {summary.rooms.totalPerimeter.toLocaleString()} ft
                        </span>
                      </div>
                      <p className="text-xs text-cyan-600 mt-1">Combined Perimeter</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Detailed Breakdown */}
            <div className="p-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Detailed Breakdown</h3>
              
              {/* Doors Section */}
              {summary.doors.total > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <DoorOpen className="w-4 h-4 text-blue-600 mr-2" />
                      Doors
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {summary.doors.interior36 > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Interior Doors (36")</span>
                        <span className="font-medium">{summary.doors.interior36}</span>
                      </div>
                    )}
                    {summary.doors.interior32 > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Interior Doors (32")</span>
                        <span className="font-medium">{summary.doors.interior32}</span>
                      </div>
                    )}
                    {summary.doors.entry > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Entry Door</span>
                        <span className="font-medium">{summary.doors.entry}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Windows Section */}
              {summary.windows.total > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <Square className="w-4 h-4 text-green-600 mr-2" />
                      Windows
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {summary.windows.doubleHung > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Double Hung (3'x4')</span>
                        <span className="font-medium">{summary.windows.doubleHung}</span>
                      </div>
                    )}
                    {summary.windows.casement > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Casement (2'x3')</span>
                        <span className="font-medium">{summary.windows.casement}</span>
                      </div>
                    )}
                    {summary.windows.picture > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Picture Window</span>
                        <span className="font-medium">{summary.windows.picture}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Flooring Section */}
              {summary.flooring.total > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <Square className="w-4 h-4 text-amber-600 mr-2" />
                      Flooring
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {summary.flooring.hardwood > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Hardwood</span>
                        <span className="font-medium">{summary.flooring.hardwood.toLocaleString()} sq ft</span>
                      </div>
                    )}
                    {summary.flooring.tile > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Tile</span>
                        <span className="font-medium">{summary.flooring.tile.toLocaleString()} sq ft</span>
                      </div>
                    )}
                    {summary.flooring.carpet > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Carpet</span>
                        <span className="font-medium">{summary.flooring.carpet.toLocaleString()} sq ft</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Electrical Section */}
              {(summary.electrical.outlets > 0 || summary.electrical.lights > 0 || summary.electrical.switches > 0) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <Zap className="w-4 h-4 text-yellow-600 mr-2" />
                      Electrical
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {summary.electrical.outlets > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Outlets</span>
                        <span className="font-medium">{summary.electrical.outlets}</span>
                      </div>
                    )}
                    {summary.electrical.lights > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Light Fixtures</span>
                        <span className="font-medium">{summary.electrical.lights}</span>
                      </div>
                    )}
                    {summary.electrical.switches > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Switches</span>
                        <span className="font-medium">{summary.electrical.switches}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rooms Section */}
              {summary.rooms.total > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <Square className="w-4 h-4 text-indigo-600 mr-2" />
                      Rooms
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Total Rooms</span>
                      <span className="font-medium">{summary.rooms.total}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Total Area</span>
                      <span className="font-medium">{summary.rooms.totalArea.toLocaleString()} sq ft</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Total Perimeter</span>
                      <span className="font-medium">{summary.rooms.totalPerimeter.toLocaleString()} ft</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Estimation */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Cost Estimation</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Materials</span>
                  <span className="font-semibold text-slate-900">
                    ${summary.costs.materials.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Labor</span>
                  <span className="font-semibold text-slate-900">
                    ${summary.costs.labor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                  <span className="text-sm font-semibold text-slate-900">Total Estimate</span>
                  <span className="text-lg font-bold text-blueprint-700">
                    ${summary.costs.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <Button className="w-full mt-3 bg-blueprint-600 hover:bg-blueprint-700">
                <Calculator className="w-4 h-4 mr-2" />
                Generate Detailed Quote
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Takeoff Data</h3>
              <p className="text-sm text-slate-600 mb-4">
                {drawing.aiProcessed 
                  ? "No elements detected in this drawing"
                  : "Upload and process a drawing to see takeoff results"
                }
              </p>
              {!drawing.aiProcessed && (
                <Button size="sm" className="bg-blueprint-600 hover:bg-blueprint-700">
                  Start AI Analysis
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
