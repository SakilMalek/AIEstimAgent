import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, 
  SquareStack, 
  Zap, 
  Droplets, 
  Wind, 
  Hammer,
  ArrowUpDown,
  Maximize,
  Settings
} from "lucide-react";

interface TakeoffType {
  id: string;
  name: string;
  description: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

// MODIFICATION: The data for the sidebar items has been updated here.
const takeoffTypes: TakeoffType[] = [
  {
    id: "openings", // New combined ID
    name: "Doors & Windows", // New combined name
    description: "All door and window types",
    unit: "each",
    icon: Building2, // Using one of the icons
    color: "text-blue-600 bg-blue-50 border-blue-200"
  },
  {
    id: "flooring",
    name: "Flooring & Rooms", // Renamed
    description: "Floor area and room detection", // Updated description
    unit: "sq ft",
    icon: Maximize,
    color: "text-amber-600 bg-amber-50 border-amber-200"
  },
  {
    id: "walls",
    name: "Walls",
    description: "Wall length and area",
    unit: "linear ft",
    icon: ArrowUpDown,
    color: "text-slate-600 bg-slate-50 border-slate-200"
  },
  {
    id: "electrical",
    name: "Electrical",
    description: "Outlets, switches, fixtures",
    unit: "each",
    icon: Zap,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200"
  },
  {
    id: "plumbing",
    name: "Plumbing",
    description: "Fixtures and pipe runs",
    unit: "each",
    icon: Droplets,
    color: "text-blue-600 bg-blue-50 border-blue-200"
  },
  {
    id: "hvac",
    name: "HVAC",
    description: "Heating and cooling systems",
    unit: "each",
    icon: Wind,
    color: "text-green-600 bg-green-50 border-green-200"
  },
  {
    id: "structural",
    name: "Structural",
    description: "Beams, columns, foundations",
    unit: "each",
    icon: Hammer,
    color: "text-red-600 bg-red-50 border-red-200"
  }
];

interface VerticalTakeoffSelectorProps {
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
  onRunAnalysis: () => void;
  isAnalyzing?: boolean;
}

export default function VerticalTakeoffSelector({ 
  selectedTypes, 
  onSelectionChange, 
  onRunAnalysis,
  isAnalyzing = false 
}: VerticalTakeoffSelectorProps) {
  const handleTypeToggle = (typeId: string) => {
    const newSelection = selectedTypes.includes(typeId)
      ? selectedTypes.filter(id => id !== typeId)
      : [...selectedTypes, typeId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(takeoffTypes.map(type => type.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select Takeoff Types</h2>
        <p className="text-sm text-slate-600 mb-4">Choose which building elements to detect and measure</p>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
            className="flex-1"
          >
            Select All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            className="flex-1"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Takeoff Types */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {takeoffTypes.map((type) => {
          const IconComponent = type.icon;
          const isSelected = selectedTypes.includes(type.id);
          
          return (
            <Card 
              key={type.id} 
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? `${type.color} border-2 shadow-sm` 
                  : 'border border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => handleTypeToggle(type.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/80' : type.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-slate-900">{type.name}</h3>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => handleTypeToggle(type.id)}
                        className="ml-2"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{type.description}</p>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {type.unit}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <Button 
          onClick={onRunAnalysis}
          disabled={selectedTypes.length === 0 || isAnalyzing}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            `Run AI Analysis (${selectedTypes.length} selected)`
          )}
        </Button>
        
        {selectedTypes.length === 0 && (
          <p className="text-xs text-slate-500 text-center">
            Select at least one element type to analyze
          </p>
        )}

        <Button 
          variant="outline" 
          className="w-full text-slate-600 hover:text-slate-900"
          onClick={() => window.location.href = '/settings'}
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}