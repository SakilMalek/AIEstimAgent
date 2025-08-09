import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Building, 
  Calendar,
  MapPin,
  FileImage,
  Activity,
  Edit,
  Trash2,
  MoreVertical
} from "lucide-react";
import type { Project, InsertProject } from "@shared/schema";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState<InsertProject>({
    name: "",
    description: "",
    location: "",
    client: "",
    status: "active",
  });
  const [editProject, setEditProject] = useState<InsertProject>({
    name: "",
    description: "",
    location: "",
    client: "",
    status: "active",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: (projectData: InsertProject) =>
      apiRequest("/api/projects", "POST", projectData),
    onSuccess: () => {
      toast({
        title: "Project created",
        description: "New project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      setNewProject({ name: "", description: "", location: "", client: "", status: "active" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertProject }) =>
      apiRequest(`/api/projects/${id}`, "PATCH", data),
    onSuccess: () => {
      toast({
        title: "Project updated",
        description: "Project has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditDialogOpen(false);
      setSelectedProject(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/projects/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete project",
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

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setEditProject({
      name: project.name,
      description: project.description || "",
      location: project.location || "", 
      client: project.client || "",
      status: project.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProject = () => {
    if (!editProject.name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }
    if (selectedProject) {
      updateProjectMutation.mutate({ id: selectedProject.id, data: editProject });
    }
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (selectedProject) {
      deleteProjectMutation.mutate(selectedProject.id);
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-600 mt-1">Manage your construction projects and takeoffs</p>
          </div>
          
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
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="project-location">Location</Label>
                  <Input
                    id="project-location"
                    value={newProject.location || ""}
                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                    placeholder="Enter project location"
                  />
                </div>
                <div>
                  <Label htmlFor="project-client">Client</Label>
                  <Input
                    id="project-client"
                    value={newProject.client || ""}
                    onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <Label htmlFor="project-description">Description</Label>
                  <Input
                    id="project-description"
                    value={newProject.description || ""}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Enter project description"
                  />
                </div>
                <div>
                  <Label htmlFor="project-status">Status</Label>
                  <select
                    id="project-status"
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
        </div>
      </div>

      {/* Projects Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-slate-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  console.log('Navigating to project:', project.id);
                  setLocation(`/projects/${project.id}`);
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="w-5 h-5 text-blueprint-600" />
                      <span className="text-lg">{project.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={
                          project.status === "active" 
                            ? "bg-green-100 text-green-700"
                            : project.status === "on-hold"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {project.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.location && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{project.location}</span>
                    </div>
                  )}
                  
                  {project.client && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Building className="w-4 h-4" />
                      <span>{project.client}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <FileImage className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">3</div>
                      <div className="text-xs text-slate-500">Drawings</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Activity className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">85%</div>
                      <div className="text-xs text-slate-500">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Building className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">$247K</div>
                      <div className="text-xs text-slate-500">Estimated</div>
                    </div>
                  </div>


                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Projects Yet</h3>
            <p className="text-slate-600 mb-6">Create your first construction project to get started with AI takeoffs.</p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-blueprint-600 hover:bg-blueprint-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </div>
        )}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-location">Location</Label>
              <Input
                id="edit-project-location"
                value={editProject.location || ""}
                onChange={(e) => setEditProject({ ...editProject, location: e.target.value })}
                placeholder="Enter project location"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-client">Client</Label>
              <Input
                id="edit-project-client"
                value={editProject.client || ""}
                onChange={(e) => setEditProject({ ...editProject, client: e.target.value })}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-description">Description</Label>
              <Input
                id="edit-project-description"
                value={editProject.description || ""}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                placeholder="Enter project description"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-status">Status</Label>
              <select
                id="edit-project-status"
                value={editProject.status}
                onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleUpdateProject}
                disabled={updateProjectMutation.isPending}
                className="flex-1 bg-blueprint-600 hover:bg-blueprint-700"
              >
                {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? 
              This action cannot be undone and will permanently delete all project data, 
              drawings, and takeoffs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}