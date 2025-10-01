import React, { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import DrawingViewer from "@/components/drawing-viewer";
import InteractiveFloorPlan from "@/components/interactive-floor-plan";
import VerticalTakeoffSelector from "@/components/vertical-takeoff-selector";
import RealtimeAnalysisPanel from "@/components/realtime-analysis-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download, Ruler, Square, Hash, MessageSquare, PanelLeft, PanelRight } from "lucide-react";
import type { Drawing, Project } from "@shared/schema";
import { useDetectionsStore } from "@/store/useDetectionsStore";
import type { Detection } from "@/store/useDetectionsStore";

const isDetection = (value: unknown): value is Detection => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Detection;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.cls === "string" &&
    Array.isArray(candidate.points)
  );
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedTakeoffTypes, setSelectedTakeoffTypes] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'view' | 'annotate'>('view');
  const [activeTool, setActiveTool] = useState<'ruler' | 'area' | 'count' | null>(null);
  const [selectedScale, setSelectedScale] = useState("1/4\" = 1'");

  const { toast } = useToast();
  const setDetections = useDetectionsStore(s => s.setDetections);

  const handleRunAnalysis = async () => {
    if (!currentDrawing || !currentDrawing.fileUrl) {
      toast({ title: "No Drawing", description: "Please upload a drawing first.", variant: "destructive" });
      return;
    }
    const typesToAnalyze = selectedTakeoffTypes.length > 0 ? selectedTakeoffTypes : ['openings', 'flooring', 'walls'];
    if (typesToAnalyze.length === 0) {
      toast({ title: "No Selection", description: "Please select at least one takeoff type.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults(null);

    try {
      const response = await fetch(currentDrawing.fileUrl);
      const imageBlob = await response.blob();
      const imageFile = new File([imageBlob], currentDrawing.filename!, { type: imageBlob.type });

      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('types', JSON.stringify(typesToAnalyze));
      formData.append('scale', selectedScale);

      const results = await apiRequest('/api/analyze', 'POST', formData, true);

      setAnalysisResults(results);

      if (results && results.predictions) {
        const allPredictions = Object.values(results.predictions)
          .flat()
          .filter((item): item is Detection => isDetection(item));

        setDetections(allPredictions);
      } else {
        setDetections([]);
      }
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${typesToAnalyze.length} element types.`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createNewProject = async (drawingName: string): Promise<Project> => {
    const projectData = { name: `Project - ${drawingName}`, description: `Auto-generated project for ${drawingName}`, status: "active" };
    const project = await apiRequest("/api/projects", "POST", projectData);
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    return project;
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setCurrentDrawing(null);
    setAnalysisResults(null);
    setDetections([]);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadResult = await apiRequest('/api/upload', 'POST', uploadFormData, true);
      
      let projectToUse = currentProject || await createNewProject(file.name);
      setCurrentProject(projectToUse);
      
      const drawingData = {
        projectId: projectToUse.id,
        name: file.name,
        filename: uploadResult.filename,
        fileUrl: uploadResult.fileUrl,
        fileType: file.type,
        status: "complete",
        scale: selectedScale,
        aiProcessed: false
      };
      const savedDrawing = await apiRequest(`/api/projects/${projectToUse.id}/drawings`, "POST", drawingData);
      
      setCurrentDrawing(savedDrawing);
      toast({ title: "Upload Successful", description: "Select takeoff types and click 'Run AI Analysis'." });
    } catch (error) {
      toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">
        <div className="hidden lg:flex">
          <VerticalTakeoffSelector
            selectedTypes={selectedTakeoffTypes}
            onSelectionChange={setSelectedTakeoffTypes}
            onRunAnalysis={handleRunAnalysis}
            isAnalyzing={isAnalyzing}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3">
            <div className="flex items-center">
               <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden mr-2">
                    <PanelLeft className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Takeoff Types Menu</SheetTitle>
                    <SheetDescription>Select building elements to detect and measure from this list.</SheetDescription>
                  </SheetHeader>
                  <VerticalTakeoffSelector
                    selectedTypes={selectedTakeoffTypes}
                    onSelectionChange={setSelectedTakeoffTypes}
                    onRunAnalysis={handleRunAnalysis}
                    isAnalyzing={isAnalyzing}
                  />
                </SheetContent>
              </Sheet>

              <span className="text-sm text-slate-500 truncate">
                {currentProject ? `${currentProject.name} - ` : ""}{currentDrawing?.name || "Upload a drawing"}
              </span>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden ml-auto">
                    <PanelRight className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-full sm:w-96">
                   <SheetHeader className="sr-only">
                    <SheetTitle>AI Analysis Panel</SheetTitle>
                    <SheetDescription>View the results of the real-time AI takeoff processing.</SheetDescription>
                  </SheetHeader>
                   <RealtimeAnalysisPanel 
                      drawing={currentDrawing}
                      selectedTypes={selectedTakeoffTypes}
                      isAnalyzing={isAnalyzing}
                      onStartAnalysis={handleRunAnalysis}
                      onElementHover={setHighlightedElement}
                      analysisResults={analysisResults}
                    />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-2 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 lg:space-x-4">
                      <h3 className="text-sm font-medium text-slate-900 hidden md:block truncate max-w-xs">{currentDrawing?.name || "No drawing selected"}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500 hidden sm:inline">Scale:</span>
                        <select className="text-xs border border-slate-300 rounded px-2 py-1" value={selectedScale} onChange={(e) => setSelectedScale(e.target.value)}>
                          <option>1/4" = 1'</option>
                          <option>1/8" = 1'</option>
                          <option>1/2" = 1'</option>
                          <option>1" = 1'</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              
              <InteractiveFloorPlan
                drawing={currentDrawing}
                highlightedElement={highlightedElement}
                activeViewMode={activeViewMode}
                activeTool={activeTool}
                selectedScale={selectedScale}
                onElementClick={() => {}}
                onMeasurement={() => {}}
              />
              
              {!currentDrawing && (
                <DrawingViewer drawing={null} onFileUpload={handleFileUpload} isUploading={isUploading} />
              )}
            </div>

            <div className="w-96 flex-col hidden lg:flex">
              <div className="bg-white p-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                    <Button className="bg-green-600 hover:bg-green-700" size="sm"><Download className="w-4 h-4 mr-2" />Export Report</Button>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white" size="sm"><MessageSquare className="w-4 h-4 mr-2" />AI Assistant</Button>
                </div>
              </div>
              
              <RealtimeAnalysisPanel 
                drawing={currentDrawing} 
                selectedTypes={selectedTakeoffTypes} 
                isAnalyzing={isAnalyzing} 
                onStartAnalysis={handleRunAnalysis} 
                onElementHover={setHighlightedElement}
                analysisResults={analysisResults}
              />
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
