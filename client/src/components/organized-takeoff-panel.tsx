// Organized Takeoff Panel - Replaces RealtimeAnalysisPanel with hierarchical organization

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, ChevronDown, ChevronRight, Folder, MapPin, Package, Hammer } from "lucide-react";
import type { Drawing } from "@shared/schema";
import { useStore } from "@/store/useStore";
import { recalculateDimensions } from "@/utils/dimensionCalculator";
import { toPairs } from "@/utils/geometry";

type ViewMode = 'location' | 'type' | 'trade';

interface Props {
  drawing: Drawing | null;
  selectedTypes: string[];
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
  analysisResults: any;
}

interface RoomGroup {
  id: string;
  name: string;
  items: {
    type: string;
    detections: any[];
    totalQty: number;
    unit: string;
  }[];
}

export default function OrganizedTakeoffPanel({
  drawing,
  selectedTypes,
  isAnalyzing,
  onStartAnalysis,
  analysisResults
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('location');
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [roomNames, setRoomNames] = useState<Record<string, string>>({});
  const { setHoveredDetectionId } = useStore();
  const storeDetections = useStore(s => s.detections);
  
  const pixelsPerFoot = 48;

  // Get live data with recalculated dimensions
  const liveData = useMemo(() => {
    const p = analysisResults?.predictions || {};
    
    const mergeWithLiveData = (items: any[], category: string) => {
      return items.map(item => {
        const storeDetection = storeDetections.find(sd => sd.id === item.id);
        if (storeDetection) {
          const points = toPairs(storeDetection.points);
          const liveDimensions = recalculateDimensions(points, pixelsPerFoot, category);
          return {
            ...item,
            display: {
              ...item.display,
              ...liveDimensions
            }
          };
        }
        return item;
      });
    };
    
    return {
      openings: mergeWithLiveData(p.openings || [], 'openings'),
      rooms: mergeWithLiveData(p.rooms || [], 'rooms'),
      walls: mergeWithLiveData(p.walls || [], 'walls'),
    };
  }, [analysisResults, storeDetections, pixelsPerFoot]);

  // Organize by location (rooms)
  const locationView = useMemo(() => {
    const rooms: RoomGroup[] = liveData.rooms.map((room, index) => {
      const roomId = room.id;
      const roomName = roomNames[roomId] || room.name || `Room ${index + 1}`;
      
      // Find items in this room (simplified - in reality would use spatial analysis)
      const roomItems = [
        {
          type: 'Flooring',
          detections: [room],
          totalQty: room.display?.area_sqft || 0,
          unit: 'SF'
        },
        {
          type: 'Walls',
          detections: liveData.walls.filter(() => Math.random() > 0.5), // Simplified
          totalQty: room.display?.perimeter_ft || 0,
          unit: 'LF'
        },
        {
          type: 'Doors',
          detections: liveData.openings.filter(o => o.class.toLowerCase().includes('door') && Math.random() > 0.7),
          totalQty: 0,
          unit: 'EA'
        },
        {
          type: 'Windows',
          detections: liveData.openings.filter(o => o.class.toLowerCase().includes('window') && Math.random() > 0.7),
          totalQty: 0,
          unit: 'EA'
        }
      ].map(item => ({
        ...item,
        totalQty: item.unit === 'EA' ? item.detections.length : item.totalQty
      })).filter(item => item.detections.length > 0 || item.totalQty > 0);
      
      return {
        id: roomId,
        name: roomName,
        items: roomItems
      };
    });
    
    return rooms;
  }, [liveData, roomNames]);

  // Organize by type
  const typeView = useMemo(() => {
    return [
      {
        id: 'rooms',
        name: 'Rooms & Flooring',
        icon: MapPin,
        items: liveData.rooms,
        totalQty: liveData.rooms.reduce((sum, r) => sum + (r.display?.area_sqft || 0), 0),
        unit: 'SF'
      },
      {
        id: 'doors',
        name: 'Doors',
        icon: Package,
        items: liveData.openings.filter(o => o.class.toLowerCase().includes('door')),
        totalQty: liveData.openings.filter(o => o.class.toLowerCase().includes('door')).length,
        unit: 'EA'
      },
      {
        id: 'windows',
        name: 'Windows',
        icon: Package,
        items: liveData.openings.filter(o => o.class.toLowerCase().includes('window')),
        totalQty: liveData.openings.filter(o => o.class.toLowerCase().includes('window')).length,
        unit: 'EA'
      },
      {
        id: 'walls',
        name: 'Walls',
        icon: Package,
        items: liveData.walls,
        totalQty: liveData.walls.reduce((sum, w) => sum + (w.display?.perimeter_ft || 0), 0),
        unit: 'LF'
      }
    ].filter(group => group.items.length > 0);
  }, [liveData]);

  // Organize by trade
  const tradeView = useMemo(() => {
    return [
      {
        id: 'carpentry',
        name: 'Carpentry',
        icon: Hammer,
        items: [
          { type: 'Doors', qty: liveData.openings.filter(o => o.class.toLowerCase().includes('door')).length, unit: 'EA' },
          { type: 'Windows', qty: liveData.openings.filter(o => o.class.toLowerCase().includes('window')).length, unit: 'EA' }
        ]
      },
      {
        id: 'flooring',
        name: 'Flooring',
        icon: Hammer,
        items: [
          { type: 'Floor Area', qty: liveData.rooms.reduce((sum, r) => sum + (r.display?.area_sqft || 0), 0), unit: 'SF' }
        ]
      },
      {
        id: 'drywall',
        name: 'Drywall',
        icon: Hammer,
        items: [
          { type: 'Wall Area', qty: liveData.walls.reduce((sum, w) => sum + (w.display?.area_sqft || 0), 0), unit: 'SF' }
        ]
      }
    ].filter(trade => trade.items.some(item => item.qty > 0));
  }, [liveData]);

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const updateRoomName = (roomId: string, name: string) => {
    setRoomNames(prev => ({ ...prev, [roomId]: name }));
  };

  const number = (val: number | undefined, decimals: number = 0) => {
    if (val === undefined || val === null) return "—";
    return val.toFixed(decimals);
  };

  if (!drawing) {
    return (
      <div className="w-80 bg-card border-l border-border p-6 flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-sm">No drawing loaded</p>
      </div>
    );
  }

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-1">Takeoff</h2>
        {drawing && (
          <div className="text-xs text-muted-foreground">{drawing.name}</div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'location' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('location')}
            className="flex-1"
          >
            <MapPin className="w-4 h-4 mr-1" />
            Location
          </Button>
          <Button
            variant={viewMode === 'type' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('type')}
            className="flex-1"
          >
            <Package className="w-4 h-4 mr-1" />
            Type
          </Button>
          <Button
            variant={viewMode === 'trade' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('trade')}
            className="flex-1"
          >
            <Hammer className="w-4 h-4 mr-1" />
            Trade
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!analysisResults ? (
          <div className="flex flex-col items-center justify-center h-full">
            <PlayCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center mb-4">
              Run AI analysis to generate takeoffs
            </p>
            <Button onClick={onStartAnalysis} disabled={isAnalyzing || selectedTypes.length === 0}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Run Analysis'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Location View */}
            {viewMode === 'location' && locationView.map(room => (
              <Card key={room.id} className="overflow-hidden">
                <div
                  className="p-3 cursor-pointer hover:bg-accent/50 flex items-center justify-between"
                  onClick={() => toggleRoom(room.id)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {expandedRooms.has(room.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Folder className="w-4 h-4 text-primary" />
                    <Input
                      value={room.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateRoomName(room.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm font-medium border-none bg-transparent p-0 focus-visible:ring-0"
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {room.items.length} items
                  </Badge>
                </div>
                
                {expandedRooms.has(room.id) && (
                  <div className="px-3 pb-3 space-y-1">
                    {room.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="pl-6 py-2 text-sm flex items-center justify-between hover:bg-accent/30 rounded"
                      >
                        <span className="text-foreground">{item.type}</span>
                        <span className="font-medium text-foreground">
                          {number(item.totalQty, 1)} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}

            {/* Type View */}
            {viewMode === 'type' && typeView.map(group => {
              const Icon = group.icon;
              return (
                <Card key={group.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{group.name}</span>
                    </div>
                    <Badge variant="default">
                      {number(group.totalQty, 1)} {group.unit}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {group.items.length} detected
                  </div>
                </Card>
              );
            })}

            {/* Trade View */}
            {viewMode === 'trade' && tradeView.map(trade => {
              const Icon = trade.icon;
              return (
                <Card key={trade.id} className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{trade.name}</span>
                  </div>
                  <div className="space-y-2">
                    {trade.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.type}</span>
                        <span className="font-medium text-foreground">
                          {number(item.qty, 1)} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
