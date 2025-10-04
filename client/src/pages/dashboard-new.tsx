import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import DrawingViewer from "@/components/drawing-viewer";
import InteractiveFloorPlan from "@/components/interactive-floor-plan";
import VerticalTakeoffSelector from "@/components/vertical-takeoff-selector";
import RealtimeAnalysisPanel from "@/components/realtime-analysis-panel";
import { ReportGeneratorComponent } from "@/components/report-generator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CalibrationTool from "@/components/calibration-tool";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download, Ruler, Square, Hash, MessageSquare, PanelLeft, PanelRight, Hand, FileText } from "lucide-react";
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
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [customPixelsPerFoot, setCustomPixelsPerFoot] = useState<number | null>(null);
  const [isPanMode, setIsPanMode] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { toast } = useToast();
  // MODIFICATION: The Zustand hook is now called at the top level, which is correct.
  const setDetections = useDetectionsStore(s => s.setDetections);

  const handleRunAnalysis = async () => {
    if (!currentDrawing || !currentDrawing.fileUrl) {
      toast({ title: "No Drawing", description: "Please upload a drawing first.", variant: "destructive" });
      return;
    }
    const typesToAnalyze = selectedTakeoffTypes.length > 0 ? selectedTakeoffTypes : ['flooring', 'openings', 'walls'];
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

      // Use custom calibrated scale if available, otherwise use standard scale
      let scaleValue: number;
      if (customPixelsPerFoot) {
        // Custom calibration: convert pixels per foot to scale factor
        // Assuming 96 DPI: scale = pixels_per_foot / 96
        scaleValue = customPixelsPerFoot / 96;
      } else {
        // Convert scale string to numeric value (e.g., "1/4\" = 1'" -> 0.25)
        const scaleMap: { [key: string]: number } = {
          '1/4" = 1\'': 0.25,
          '1/8" = 1\'': 0.125,
          '1/2" = 1\'': 0.5,
          '1" = 1\'': 1.0,
        };
        scaleValue = scaleMap[selectedScale] || 0.25;
      }

      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('types', JSON.stringify(typesToAnalyze));
      formData.append('scale', scaleValue.toString());

      const results = await apiRequest('/api/analyze', 'POST', formData, true);

      setAnalysisResults(results);

      // MODIFICATION: The hook itself is removed from here. We now call the 'setDetections' function.
      if (results && results.predictions) {
        // We can flatten all predictions from different categories into one array for the store
        const allPredictions = Object.values(results.predictions)
          .flat()
          .filter((item): item is Detection => isDetection(item));

        setDetections(allPredictions);
        
        // Save analysis results to database as takeoffs
        try {
          await apiRequest(`/api/drawings/${currentDrawing.id}/analysis`, 'POST', {
            results: results,
            scale: scaleValue
          });
          
          // Invalidate takeoffs query to refresh the takeoff panel
          queryClient.invalidateQueries({ queryKey: ["/api/drawings", currentDrawing.id, "takeoffs"] });
        } catch (saveError) {
          console.error("Failed to save analysis results:", saveError);
          // Don't show error to user as the analysis itself succeeded
        }
      } else {
        setDetections([]); // Clear detections if the analysis returns no predictions
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
    setDetections([]); // Clear previous detections on new upload

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

              <div className="flex items-center gap-2">
                {currentProject && (
                  <span className="text-sm font-medium text-slate-900">{currentProject.name}</span>
                )}
                {currentProject && currentDrawing && (
                  <span className="text-slate-300">/</span>
                )}
                {currentDrawing && (
                  <span className="text-sm text-slate-600">{currentDrawing.name}</span>
                )}
                {!currentProject && !currentDrawing && (
                  <span className="text-sm text-slate-400">No drawing selected</span>
                )}
              </div>

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
                      <div className="flex items-center space-x-2">
                        {!customPixelsPerFoot ? (
                          <>
                            <span className="text-xs text-slate-500 hidden sm:inline">Scale:</span>
                            <select className="text-xs border border-slate-300 rounded px-2 py-1" value={selectedScale} onChange={(e) => setSelectedScale(e.target.value)} disabled={isCalibrating}>
                              <option>1/4" = 1'</option>
                              <option>1/8" = 1'</option>
                              <option>1/2" = 1'</option>
                              <option>1" = 1'</option>
                            </select>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Calibrated:</span>
                            <span className="text-xs font-medium text-blue-600">{customPixelsPerFoot.toFixed(1)} px/ft</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setCustomPixelsPerFoot(null)}
                              className="h-6 px-2 text-xs"
                            >
                              Reset
                            </Button>
                          </div>
                        )}
                      </div>
                      <CalibrationTool
                        isActive={isCalibrating}
                        points={calibrationPoints}
                        onActivate={() => {
                          setIsCalibrating(true);
                          setIsPanMode(false);
                        }}
                        onComplete={(pixelsPerFoot) => {
                          setCustomPixelsPerFoot(pixelsPerFoot);
                          setIsCalibrating(false);
                          setCalibrationPoints([]);
                          toast({
                            title: "Calibration Complete",
                            description: `Scale set to ${pixelsPerFoot.toFixed(1)} pixels per foot`,
                          });
                        }}
                        onCancel={() => {
                          setIsCalibrating(false);
                          setCalibrationPoints([]);
                        }}
                      />
                      <Button
                        variant={isPanMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setIsPanMode(!isPanMode);
                          setIsCalibrating(false);
                        }}
                        className="w-9 h-9 p-0"
                        title={isPanMode ? "Pan Mode Active (Click to disable)" : "Pan/Move Tool"}
                      >
                        <Hand className="w-4 h-4" />
                      </Button>
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
                analysisResults={analysisResults}
                isCalibrating={isCalibrating}
                calibrationPoints={calibrationPoints}
                isPanMode={isPanMode}
                onCalibrationClick={(x, y) => {
                  if (calibrationPoints.length < 2) {
                    setCalibrationPoints([...calibrationPoints, { x, y }]);
                  }
                }}
              />
              
              {!currentDrawing && (
                <DrawingViewer drawing={null} onFileUpload={handleFileUpload} isUploading={isUploading} />
              )}
            </div>

            <div className="w-96 flex-col hidden lg:flex">
              <div className="bg-white p-4 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 flex-1" 
                          size="sm"
                          disabled={!currentProject || !currentDrawing}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Generate Project Report</DialogTitle>
                        </DialogHeader>
                        {currentProject && currentDrawing && (() => {
                          // Convert analysis results to takeoffs format
                          const takeoffs = [];
                          if (analysisResults?.predictions) {
                            const { rooms = [], walls = [], openings = [] } = analysisResults.predictions;
                            
                            // Add rooms
                            rooms.forEach((room: any, idx: number) => {
                              takeoffs.push({
                                id: room.id || `room-${idx}`,
                                projectId: currentProject.id,
                                drawingId: currentDrawing.id,
                                elementType: 'room',
                                name: room.class || `Room ${idx + 1}`,
                                quantity: 1,
                                area: room.display?.area_sqft || 0,
                                length: room.display?.perimeter_ft || 0,
                                unit: 'sq ft',
                                unitCost: 0,
                                totalCost: 0,
                                verified: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                              });
                            });
                            
                            // Add walls
                            walls.forEach((wall: any, idx: number) => {
                              takeoffs.push({
                                id: wall.id || `wall-${idx}`,
                                projectId: currentProject.id,
                                drawingId: currentDrawing.id,
                                elementType: 'wall',
                                name: wall.class || `Wall ${idx + 1}`,
                                quantity: 1,
                                area: wall.display?.area_sqft || 0,
                                length: wall.display?.perimeter_ft || 0,
                                unit: 'LF',
                                unitCost: 0,
                                totalCost: 0,
                                verified: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                              });
                            });
                            
                            // Add openings
                            openings.forEach((opening: any, idx: number) => {
                              takeoffs.push({
                                id: opening.id || `opening-${idx}`,
                                projectId: currentProject.id,
                                drawingId: currentDrawing.id,
                                elementType: opening.class?.toLowerCase().includes('door') ? 'door' : 'window',
                                name: opening.class || `Opening ${idx + 1}`,
                                quantity: 1,
                                area: 0,
                                length: 0,
                                unit: 'EA',
                                unitCost: 0,
                                totalCost: 0,
                                verified: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                              });
                            });
                          }
                          
                          return (
                            <ReportGeneratorComponent
                              project={currentProject}
                              takeoffs={takeoffs as any}
                              drawings={[currentDrawing]}
                              analyses={analysisResults ? [{
                                id: 'current',
                                drawingId: currentDrawing.id,
                                projectId: currentProject.id,
                                predictions: analysisResults.predictions || {},
                                createdAt: new Date(),
                                analysisType: 'full'
                              } as any] : []}
                            />
                          );
                        })()}
                      </DialogContent>
                    </Dialog>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1" size="sm">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      AI Chat
                    </Button>
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
