import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import ProjectSidebar from "@/components/project-sidebar";
import DrawingViewer from "@/components/drawing-viewer";
import TakeoffPanel from "@/components/takeoff-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Settings,
  Download,
  Ruler,
  Square,
  Hash,
  Plus
} from "lucide-react";
import type { Project, Drawing, InsertProject } from "@shared/schema";

export default function Dashboard() {
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<InsertProject>({
    name: "",
    description: "",
    location: "",
    client: "",
    status: "active",
  });

  const { toast } = useToast();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: drawings = [], isLoading: drawingsLoading } = useQuery({
    queryKey: ["/api/projects", currentProject?.id, "drawings"],
    enabled: !!currentProject?.id,
  });

  const createProjectMutation = useMutation({
    mutationFn: (projectData: InsertProject) =>
      apiRequest("/api/projects", "POST", projectData),
    onSuccess: (newProject) => {
      toast({
        title: "Project created",
        description: "New project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      setNewProject({ name: "", description: "", location: "", client: "", status: "active" });
      setCurrentProject(newProject);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }
    createProjectMutation.mutate(newProject);
  };

  // Set first project as current if none selected
  if (projects && projects.length > 0 && !currentProject) {
    setCurrentProject(projects[0]);
  }

  // Set first drawing as selected if none selected
  if (drawings && drawings.length > 0 && !selectedDrawing) {
    setSelectedDrawing(drawings[0]);
  }

  return (
    <Layout>
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
                {/* New Project Button */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blueprint-600 hover:bg-blueprint-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="dashboard-project-name">Project Name</Label>
                        <Input
                          id="dashboard-project-name"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                          placeholder="Enter project name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dashboard-project-location">Location</Label>
                        <Input
                          id="dashboard-project-location"
                          value={newProject.location || ""}
                          onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                          placeholder="Enter project location"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dashboard-project-client">Client</Label>
                        <Input
                          id="dashboard-project-client"
                          value={newProject.client || ""}
                          onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                          placeholder="Enter client name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dashboard-project-description">Description</Label>
                        <Input
                          id="dashboard-project-description"
                          value={newProject.description || ""}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          placeholder="Enter project description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dashboard-project-status">Status</Label>
                        <select
                          id="dashboard-project-status"
                          value={newProject.status}
                          onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="on-hold">On Hold</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="flex space-x-2 pt-4">
                        <Button
                          onClick={handleCreateProject}
                          disabled={createProjectMutation.isPending}
                          className="flex-1 bg-blueprint-600 hover:bg-blueprint-700"
                        >
                          {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

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
                    <Ruler className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Area measurement">
                    <Square className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Count items">
                    <Hash className="w-4 h-4" />
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
    </Layout>
  );
}
