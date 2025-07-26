export interface AIDetection {
  id: string;
  type: 'door' | 'window' | 'room' | 'electrical' | 'plumbing';
  name: string;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  measurements?: {
    width?: number;
    height?: number;
    area?: number;
    quantity?: number;
  };
  confidence: number;
}

export interface TakeoffSummaryData {
  totalDoors: number;
  totalWindows: number;
  floorArea: number;
  wallLength: number;
  electricalCount: number;
  plumbingCount: number;
  estimatedCost: number;
}

export interface ProjectStats {
  totalDrawings: number;
  processedDrawings: number;
  pendingDrawings: number;
  lastUpdated: Date;
}
