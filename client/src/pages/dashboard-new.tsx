import { useState } from "react";
import Layout from "@/components/layout";
import DrawingViewer from "@/components/drawing-viewer";
import VerticalTakeoffSelector from "@/components/vertical-takeoff-selector";
import LLMTakeoffProcessor from "@/components/llm-takeoff-processor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Download,
  Ruler,
  Square,
  Hash,
  Upload
} from "lucide-react";
import type { Drawing } from "@shared/schema";

export default function Dashboard() {
  const [selectedTakeoffTypes, setSelectedTakeoffTypes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);

  const { toast } = useToast();

  const handleRunAnalysis = () => {
    if (selectedTakeoffTypes.length === 0) {
      toast({
        title: "No takeoff types selected",
        description: "Please select at least one element type to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${selectedTakeoffTypes.length} element types.`,
      });
    }, 5000);
  };

  const handleFileUpload = (drawing: Drawing) => {
    setCurrentDrawing(drawing);
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-73px)] overflow-hidden">
        {/* Vertical Takeoff Selector - Left Sidebar */}
        <VerticalTakeoffSelector
          selectedTypes={selectedTakeoffTypes}
          onSelectionChange={setSelectedTakeoffTypes}
          onRunAnalysis={handleRunAnalysis}
          isAnalyzing={isAnalyzing}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Simplified Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  AI Takeoff Analysis Dashboard
                </h2>
                <span className="text-sm text-slate-500">
                  {currentDrawing?.name || "Upload a drawing to begin"}
                </span>
              </div>
            </div>
          </div>

          {/* Drawing Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-sm font-medium text-slate-900">
                  {currentDrawing?.name || "No drawing selected"}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Scale:</span>
                  <select className="text-xs border border-slate-300 rounded px-2 py-1">
                    <option>1/4" = 1'</option>
                    <option>1/8" = 1'</option>
                    <option>1/2" = 1'</option>
                  </select>
                </div>
                
                {/* Manual Measurement Tools */}
                <div className="flex items-center space-x-1 border-l border-slate-300 pl-3">
                  <Button variant="ghost" size="sm" title="Linear measurement">
                    <Ruler className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Area measurement">
                    <Square className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Count items">
                    <Hash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View Controls */}
                <div className="flex items-center bg-white rounded-lg p-1 border">
                  <Button variant="ghost" size="sm" className="bg-blueprint-50 text-blueprint-700 text-xs">
                    View
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-600 text-xs">
                    Annotate
                  </Button>
                </div>

                {/* Export */}
                <Button className="bg-green-600 hover:bg-green-700" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Drawing Viewer */}
            <DrawingViewer drawing={currentDrawing} onFileUpload={handleFileUpload} />

            {/* Enhanced LLM Takeoff Panel */}
            <div className="w-96 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Analysis Results</h2>
                <p className="text-sm text-slate-600">AI-powered takeoff analysis</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {currentDrawing ? (
                  <LLMTakeoffProcessor 
                    drawing={currentDrawing} 
                    onAnalysisComplete={() => {
                      // Refresh takeoff data after analysis
                    }}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-sm text-slate-600">Upload a drawing to view analysis results</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}