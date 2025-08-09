import { useState } from "react";
import Layout from "@/components/layout";
import DrawingViewer from "@/components/drawing-viewer";
import VerticalTakeoffSelector from "@/components/vertical-takeoff-selector";
import AIChatWidget from "@/components/ai-chat-widget";
import RealtimeAnalysisPanel from "@/components/realtime-analysis-panel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Download,
  Ruler,
  Square,
  Hash,
  MessageSquare
} from "lucide-react";
import type { Drawing, Project } from "@shared/schema";

export default function Dashboard() {
  const [selectedTakeoffTypes, setSelectedTakeoffTypes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const { toast } = useToast();

  const handleRunAnalysis = () => {
    // Use default types if none selected
    const typesToAnalyze = selectedTakeoffTypes.length > 0 
      ? selectedTakeoffTypes 
      : ['doors', 'windows', 'flooring', 'electrical'];
    
    if (typesToAnalyze.length === 0) {
      toast({
        title: "No takeoff types available",
        description: "Unable to start analysis without element types.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    // Update selected types if we're using defaults
    if (selectedTakeoffTypes.length === 0) {
      setSelectedTakeoffTypes(typesToAnalyze);
    }
    
    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${typesToAnalyze.length} element types.`,
      });
    }, 8000); // Longer duration to show the progress steps
  };

  const createNewProject = async (drawingName: string): Promise<Project> => {
    try {
      const projectData = {
        name: `Project - ${drawingName}`,
        description: `Auto-generated project from uploaded drawing: ${drawingName}`,
        status: "active"
      };
      
      const project = await apiRequest("/api/projects", "POST", projectData);
      
      // Invalidate projects cache so the new project appears on the projects page
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      return project;
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    }
  };

  const handleFileUpload = async (drawing: Drawing) => {
    try {
      let projectToUse = currentProject;
      
      // Create a new project if none exists
      if (!currentProject) {
        projectToUse = await createNewProject(drawing.name);
        setCurrentProject(projectToUse);
        
        toast({
          title: "Project created",
          description: `Created new project: ${projectToUse.name}`,
        });
      }
      
      // Save the drawing to the database with the correct project ID
      const drawingData = {
        projectId: projectToUse!.id,
        name: drawing.name,
        filename: drawing.filename,
        fileUrl: drawing.fileUrl,
        fileType: drawing.fileType,
        status: "complete",
        aiProcessed: true,
      };
      
      const savedDrawing = await apiRequest(`/api/projects/${projectToUse!.id}/drawings`, "POST", drawingData);
      setCurrentDrawing(savedDrawing);
      
      // Auto-select common takeoff types if none are selected
      if (selectedTakeoffTypes.length === 0) {
        setSelectedTakeoffTypes(['doors', 'windows', 'flooring', 'electrical']);
      }
      
      // Automatically start analysis after a brief delay
      setTimeout(() => {
        handleRunAnalysis();
      }, 1000);
      
      toast({
        title: "File uploaded successfully",
        description: "Starting automatic AI analysis...",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to create project or upload drawing",
        variant: "destructive",
      });
    }
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
          {/* Simple Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-3">
            <div className="flex items-center">
              <span className="text-sm text-slate-500">
                {currentProject ? `${currentProject.name} - ` : ""}{currentDrawing?.name || "Upload a drawing to begin"}
              </span>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left side: Drawing area with toolbar */}
            <div className="flex-1 flex flex-col overflow-hidden">
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

                    {/* View Controls - Moved next to measurement tools */}
                    <div className="flex items-center bg-white rounded-lg p-1 border">
                      <Button variant="ghost" size="sm" className="bg-blueprint-50 text-blueprint-700 text-xs">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-600 text-xs">
                        Annotate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Drawing Viewer */}
              <DrawingViewer drawing={currentDrawing} onFileUpload={handleFileUpload} />
            </div>

            {/* Right side: Buttons + AI Analysis Panel */}
            <div className="w-96 flex flex-col">
              {/* Header buttons positioned above AI Analysis panel */}
              <div className="bg-white p-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  {/* Export Report - Aligned with AI Analysis panel */}
                  <Button className="bg-green-600 hover:bg-green-700" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                  
                  {/* AI Assistant - Positioned after Export Report */}
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    AI Assistant
                  </Button>
                </div>
              </div>
              
              {/* AI Analysis Panel */}
              <RealtimeAnalysisPanel 
                drawing={currentDrawing}
                selectedTypes={selectedTakeoffTypes}
                isAnalyzing={isAnalyzing}
                onStartAnalysis={handleRunAnalysis}
              />
            </div>
          </div>


        </main>
      </div>
    </Layout>
  );
}