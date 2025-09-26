import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain,
  CheckCircle,
  Loader2,
  Eye,
  Square,
  DoorOpen,
  Zap,
  Droplets,
  Wind,
  Hammer,
  Download,
  RefreshCw
} from "lucide-react";
import type { Drawing } from "@shared/schema";

interface AnalysisStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete';
  progress: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface TakeoffResult {
  type: string;
  count: number;
  unit: string;
  details: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface RealtimeAnalysisPanelProps {
  drawing: Drawing | null;
  selectedTypes: string[];
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
  onElementHover?: (elementType: string | null) => void;
  analysisResults: any;  
}

export default function RealtimeAnalysisPanel({ 
  drawing, 
  selectedTypes, 
  isAnalyzing,
  onStartAnalysis,
  onElementHover 
}: RealtimeAnalysisPanelProps) {
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: 'preprocessing', name: 'Image Preprocessing', status: 'pending', progress: 0, icon: Eye },
    { id: 'detection', name: 'Element Detection', status: 'pending', progress: 0, icon: Brain },
    { id: 'measurement', name: 'Measurements', status: 'pending', progress: 0, icon: Square },
    { id: 'calculation', name: 'Calculations', status: 'pending', progress: 0, icon: CheckCircle }
  ]);

  const [results, setResults] = useState<TakeoffResult[]>([]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisSteps(steps => steps.map(step => ({ 
        ...step, 
        status: 'pending', 
        progress: 0 
      })));
      setResults([]);
      return;
    }

    // Simulate real-time analysis progress
    const runAnalysis = async () => {
      for (let i = 0; i < analysisSteps.length; i++) {
        const step = analysisSteps[i];
        
        // Start processing this step
        setAnalysisSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'processing' } : s
        ));

        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setAnalysisSteps(prev => prev.map(s => 
            s.id === step.id ? { ...s, progress } : s
          ));
        }

        // Complete this step
        setAnalysisSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'complete', progress: 100 } : s
        ));

        // Add results after all steps complete
        if (step.id === 'calculation') {
          setTimeout(() => {
            generateResults();
          }, 500);
        }
      }
    };

    runAnalysis();
  }, [isAnalyzing]);

  const generateResults = () => {
    const mockResults: TakeoffResult[] = [];

    if (selectedTypes.includes('doors')) {
      mockResults.push({
        type: 'Doors',
        count: 8,
        unit: 'each',
        details: ['3x Interior (32")', '2x Interior (28")', '2x Exterior (36")', '1x Bathroom (24")'],
        icon: DoorOpen,
        color: 'text-blue-600 bg-blue-50'
      });
    }

    if (selectedTypes.includes('windows')) {
      mockResults.push({
        type: 'Windows',
        count: 12,
        unit: 'each',
        details: ['4x Living Room (3\'x4\')', '6x Bedroom (2\'x3\')', '2x Kitchen (1.5\'x2\')'],
        icon: Square,
        color: 'text-cyan-600 bg-cyan-50'
      });
    }

    if (selectedTypes.includes('electrical')) {
      mockResults.push({
        type: 'Electrical',
        count: 24,
        unit: 'each',
        details: ['16x Outlets', '6x Light Switches', '2x GFCI Outlets'],
        icon: Zap,
        color: 'text-yellow-600 bg-yellow-50'
      });
    }

    if (selectedTypes.includes('flooring')) {
      mockResults.push({
        type: 'Flooring',
        count: 1850,
        unit: 'sq ft',
        details: ['Living: 420 sq ft', 'Bedrooms: 680 sq ft', 'Kitchen: 280 sq ft', 'Other: 470 sq ft'],
        icon: Square,
        color: 'text-amber-600 bg-amber-50'
      });
    }

    setResults(mockResults);
  };

  if (!drawing) {
    return (
      <div className="flex-1 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">AI Analysis</h2>
          <p className="text-sm text-slate-600">Real-time takeoff processing</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600">Upload a drawing to begin analysis</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Analysis</h2>
            <p className="text-sm text-slate-600">Real-time takeoff processing</p>
          </div>
          {!isAnalyzing && results.length > 0 && (
            <Button
              onClick={onStartAnalysis}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Rerun
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-3">Processing Steps</h3>
            <div className="space-y-3">
              {analysisSteps.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === 'complete' ? 'bg-green-100 text-green-600' :
                      step.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {step.status === 'processing' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : step.status === 'complete' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <IconComponent className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900">{step.name}</span>
                        {step.status === 'processing' && (
                          <span className="text-xs text-slate-500">{step.progress}%</span>
                        )}
                      </div>
                      {step.status !== 'pending' && (
                        <Progress value={step.progress} className="h-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results - Only show after analysis is complete */}
        {!isAnalyzing && results.length > 0 && (
          <div className="p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Takeoff Results</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Analysis Complete
              </Badge>
            </div>

            <div className="space-y-4">
              {results.map((result, index) => {
                const IconComponent = result.icon;
                return (
                  <Card 
                    key={index} 
                    className={`${result.color} border shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                    onMouseEnter={() => onElementHover?.(result.type.toLowerCase())}
                    onMouseLeave={() => onElementHover?.(null)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-white/80">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <span className="font-semibold">{result.type}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">{result.count}</div>
                          <div className="text-xs text-slate-600 uppercase tracking-wide">{result.unit}</div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {result.details.map((detail, i) => (
                          <div key={i} className="flex items-center text-sm text-slate-700">
                            <div className="w-2 h-2 bg-slate-400 rounded-full mr-3 flex-shrink-0"></div>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
              <h4 className="text-sm font-medium text-slate-900 mb-3">Analysis Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Categories:</span>
                  <span className="ml-2 font-medium">{results.length}</span>
                </div>
                <div>
                  <span className="text-slate-600">Total Items:</span>
                  <span className="ml-2 font-medium">
                    {results.reduce((sum, r) => sum + r.count, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Export Detailed Report
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && results.length === 0 && selectedTypes.length > 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                Ready to analyze {selectedTypes.length} element type{selectedTypes.length !== 1 ? 's' : ''}
              </p>
              <Button 
                onClick={onStartAnalysis}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Start Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}