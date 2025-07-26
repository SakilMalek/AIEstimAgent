import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProjectSidebar from "@/components/project-sidebar";
import DrawingViewer from "@/components/drawing-viewer";
import TakeoffPanel from "@/components/takeoff-panel";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  User, 
  Home, 
  Folder, 
  BarChart3,
  Settings,
  Download
} from "lucide-react";
import type { Project, Drawing } from "@shared/schema";

export default function Dashboard() {
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: drawings = [], isLoading: drawingsLoading } = useQuery({
    queryKey: ["/api/projects", currentProject?.id, "drawings"],
    enabled: !!currentProject?.id,
  });

  // Set first project as current if none selected
  if (projects && projects.length > 0 && !currentProject) {
    setCurrentProject(projects[0]);
  }

  // Set first drawing as selected if none selected
  if (drawings && drawings.length > 0 && !selectedDrawing) {
    setSelectedDrawing(drawings[0]);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blueprint-600 rounded-lg flex items-center justify-center">
                <Home className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-slate-900">EstimAgent</span>
            </div>
            <div className="hidden md:flex items-center space-x-1 ml-8">
              <Button variant="ghost" size="sm" className="text-blueprint-700 bg-blueprint-50 hover:bg-blueprint-100">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blueprint-700">
                <Folder className="w-4 h-4 mr-2" />
                Projects
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blueprint-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">John Constructor</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)] overflow-hidden">
        {/* Sidebar */}
        <ProjectSidebar
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
          drawings={drawings}
          selectedDrawing={selectedDrawing}
          setSelectedDrawing={setSelectedDrawing}
          isLoading={projectsLoading || drawingsLoading}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-slate-900">
                  {selectedDrawing?.name || "Select a drawing"}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500">Scale:</span>
                  <select className="text-sm border border-slate-300 rounded px-2 py-1">
                    <option>1/4" = 1'</option>
                    <option>1/8" = 1'</option>
                    <option>1/2" = 1'</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View Controls */}
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <Button variant="ghost" size="sm" className="bg-white text-slate-900 shadow-sm">
                    View
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-600">
                    Annotate
                  </Button>
                </div>
                
                {/* Measurement Tools */}
                <div className="flex items-center space-x-1 border-l border-slate-300 pl-3">
                  <Button variant="ghost" size="sm" title="Linear measurement">
                    <Home className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Area measurement">
                    <Folder className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Count items">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Export */}
                <Button className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Drawing Viewer */}
            <DrawingViewer drawing={selectedDrawing} />

            {/* Takeoff Results Panel */}
            <TakeoffPanel drawing={selectedDrawing} />
          </div>
        </main>
      </div>
    </div>
  );
}
