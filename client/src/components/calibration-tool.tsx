// client/src/components/calibration-tool.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Ruler, X, Check } from "lucide-react";

interface CalibrationPoint {
  x: number;
  y: number;
}

interface CalibrationToolProps {
  isActive: boolean;
  onActivate: () => void;
  onComplete: (pixelsPerFoot: number) => void;
  onCancel: () => void;
  points?: CalibrationPoint[];
}

export default function CalibrationTool({
  isActive,
  onActivate,
  onComplete,
  onCancel,
  points = [],
}: CalibrationToolProps) {
  const [knownDistance, setKnownDistance] = useState("");
  const [unit, setUnit] = useState<"ft" | "in">("ft");

  const calculateDistance = () => {
    if (points.length !== 2) return 0;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const parseDistance = (input: string): number | null => {
    // Try to parse formats like: "11'4\"", "11' 4\"", "11-4", "11 4", or just "11.33"
    
    // Format: 11'4" or 11' 4" or 11'4
    const feetInchesQuote = input.match(/^(\d+(?:\.\d+)?)'?\s*(\d+(?:\.\d+)?)"?$/);
    if (feetInchesQuote) {
      const feet = parseFloat(feetInchesQuote[1]);
      const inches = parseFloat(feetInchesQuote[2]);
      return feet + inches / 12;
    }
    
    // Format: 11-4 or 11 4
    const feetInchesDash = input.match(/^(\d+(?:\.\d+)?)[- ](\d+(?:\.\d+)?)$/);
    if (feetInchesDash) {
      const feet = parseFloat(feetInchesDash[1]);
      const inches = parseFloat(feetInchesDash[2]);
      return feet + inches / 12;
    }
    
    // Simple decimal number
    const decimal = parseFloat(input);
    if (!isNaN(decimal)) {
      return decimal;
    }
    
    return null;
  };

  const handleComplete = () => {
    const pixelDistance = calculateDistance();
    const distanceValue = parseDistance(knownDistance);
    
    if (!distanceValue || distanceValue <= 0 || pixelDistance <= 0) {
      return;
    }

    // Convert to feet if in inches
    const distanceInFeet = unit === "in" ? distanceValue / 12 : distanceValue;
    
    // Calculate pixels per foot
    const pixelsPerFoot = pixelDistance / distanceInFeet;
    
    onComplete(pixelsPerFoot);
    handleReset();
  };

  const handleReset = () => {
    setKnownDistance("");
    setUnit("ft");
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  if (!isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onActivate}
        className="w-9 h-9 p-0"
        title="Calibrate Scale"
      >
        <Ruler className="w-4 h-4" />
      </Button>
    );
  }

  const pixelDistance = calculateDistance();

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm">Scale Calibration</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-xs text-slate-600 space-y-1">
        <p>
          <strong>Step {points.length + 1} of 3:</strong>
        </p>
        {points.length === 0 && <p>Click the first point on a known dimension</p>}
        {points.length === 1 && <p>Click the second point to complete the line</p>}
        {points.length === 2 && <p>Enter the known distance between the points</p>}
      </div>

      {points.length === 2 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500">
            Pixel distance: <span className="font-medium">{pixelDistance.toFixed(2)} px</span>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="known-distance" className="text-xs">Known Distance</Label>
            <div className="flex gap-2">
              <Input
                id="known-distance"
                type="text"
                placeholder="e.g., 11-4 or 11.33"
                value={knownDistance}
                onChange={(e) => setKnownDistance(e.target.value)}
                className="h-8"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as "ft" | "in")}
                className="h-8 px-2 border border-slate-300 rounded text-xs"
              >
                <option value="ft">ft</option>
                <option value="in">in</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500">
              Formats: 11-4, 11 4, or 11.33 (feet-inches or decimal)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={!knownDistance || parseFloat(knownDistance) <= 0}
              className="flex-1 gap-2"
            >
              <Check className="w-4 h-4" />
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {points.length < 2 && points.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="w-full"
        >
          Reset Points
        </Button>
      )}
    </Card>
  );
}

export { type CalibrationPoint };
