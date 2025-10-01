import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  MoreVertical,
  Search,
  Filter,
  SortAsc,
  CheckSquare,
  Square,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import type { Project, InsertProject } from "@shared/schema";

// Create a more specific type for form state
type ProjectFormData = {
  name: string;
  description: string | null;
  location: string | null;
  client: string | null;
  status: string;
};

export default function Projects() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [newProject, setNewProject] = useState<ProjectFormData>({
    name: "",
    description: null,
    location: null,
    client: null,
    status: "active",
  });
  const [editProject, setEditProject] = useState<ProjectFormData>({
    name: "",
    description: null,
    location: null,
    client: null,
    status: "active",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Project health status based on AI analysis (simulated)
  const getProjectHealth = (project: Project) => {
    const createdDate = project.createdAt ? new Date(project.createdAt) : new Date();
    const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 7) return { status: 'excellent', color: 'bg-green-500', icon: CheckCircle2 };
    if (daysSinceCreated < 30) return { status: 'good', color: 'bg-blue-500', icon: TrendingUp };
    if (daysSinceCreated < 90) return { status: 'warning', color: 'bg-yellow-500', icon: Clock };
    return { status: 'critical', color: 'bg-red-500', icon: AlertTriangle };
  };

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "client":
          return (a.client || "").localeCompare(b.client || "");
        case "created":
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, searchTerm, statusFilter, sortBy]);

  // Bulk selection handlers
  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const selectAllVisible = () => {
    setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedProjects(new Set());
  };

  const isAllSelected = filteredProjects.length > 0 && filteredProjects.every(p => selectedProjects.has(p.id));

  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("/api/projects", "POST", data),
    onSuccess: () => {
      toast({
        title: "Project created",
        description: "Project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      setNewProject({
        name: "",
        description: null,
        location: null,
        client: null,
        status: "active",
      });
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
    createProjectMutation.mutate(newProject as InsertProject);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setEditProject({
      name: project.name,
      description: project.description,
      location: project.location, 
      client: project.client,
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
      updateProjectMutation.mutate({ id: selectedProject.id, data: editProject as InsertProject });
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
          
          <div className="flex space-x-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blueprint-600 hover:bg-blueprint-700" data-testid="button-create-project">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mt-6 flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search projects by name, client, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-projects"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32" data-testid="select-sort-by">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProjects.size > 0 && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">
                {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled data-testid="button-bulk-export">
                Export Selected
              </Button>
              <Button variant="outline" size="sm" disabled data-testid="button-bulk-archive">
                Archive Selected
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building className="w-8 h-8 text-blueprint-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Total Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Active Projects</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {projects.filter(p => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {projects.filter(p => p.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-600">Healthy Projects</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {projects.filter(p => getProjectHealth(p).status === 'excellent' || getProjectHealth(p).status === 'good').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Selection Controls */}
        {filteredProjects.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={isAllSelected ? clearSelection : selectAllVisible}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm text-slate-600">
                Select all visible ({filteredProjects.length})
              </span>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No projects found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm || statusFilter !== "all" ? 
                "No projects match your current filters." :
                "Get started by creating your first project."
              }
            </p>
            {(!searchTerm && statusFilter === "all") && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blueprint-600 hover:bg-blueprint-700"
                data-testid="button-create-first-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const health = getProjectHealth(project);
              const HealthIcon = health.icon;
              
              return (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow border border-slate-200"
                  onClick={(e) => {
                    // Only navigate if not clicking on interactive elements
                    if (!(e.target as Element).closest('[data-interactive]')) {
                      setLocation(`/projects/${project.id}`);
                    }
                  }}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                          onClick={(e) => e.stopPropagation()}
                          data-interactive="true"
                          data-testid={`checkbox-project-${project.id}`}
                        />
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-1">
                            {project.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${health.color}`}></div>
                            <HealthIcon className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-500 capitalize">{health.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-interactive="true"
                            data-testid={`button-menu-${project.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setLocation(`/projects/${project.id}`)}
                            data-testid={`menu-view-${project.id}`}
                          >
                            <FileImage className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEditProject(project)}
                            data-testid={`menu-edit-${project.id}`}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project)}
                            className="text-red-600"
                            data-testid={`menu-delete-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {project.client && (
                        <div className="flex items-center text-sm text-slate-600">
                          <Building className="w-4 h-4 mr-2" />
                          {project.client}
                        </div>
                      )}
                      
                      {project.location && (
                        <div className="flex items-center text-sm text-slate-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {project.location}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'No date'}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={project.status === "active" ? "default" : 
                                 project.status === "completed" ? "secondary" : "outline"}
                          className="capitalize"
                        >
                          {project.status}
                        </Badge>
                        
                        <div className="flex items-center text-sm text-slate-500">
                          <Activity className="w-4 h-4 mr-1" />
                          Active
                        </div>
                      </div>
                      
                      {project.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                data-testid="input-new-project-name"
              />
            </div>
            <div>
              <Label htmlFor="project-location">Location</Label>
              <Input
                id="project-location"
                value={newProject.location || ""}
                onChange={(e) => setNewProject({ ...newProject, location: e.target.value || null })}
                placeholder="Enter project location"
                data-testid="input-new-project-location"
              />
            </div>
            <div>
              <Label htmlFor="project-client">Client</Label>
              <Input
                id="project-client"
                value={newProject.client || ""}
                onChange={(e) => setNewProject({ ...newProject, client: e.target.value || null })}
                placeholder="Enter client name"
                data-testid="input-new-project-client"
              />
            </div>
            <div>
              <Label htmlFor="project-description">Description</Label>
              <Input
                id="project-description"
                value={newProject.description || ""}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value || null })}
                placeholder="Enter project description"
                data-testid="input-new-project-description"
              />
            </div>
            <div>
              <Label htmlFor="project-status">Status</Label>
              <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                <SelectTrigger data-testid="select-new-project-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending}
                className="flex-1 bg-blueprint-600 hover:bg-blueprint-700"
                data-testid="button-confirm-create-project"
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create-project"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                data-testid="input-edit-project-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-location">Location</Label>
              <Input
                id="edit-project-location"
                value={editProject.location || ""}
                onChange={(e) => setEditProject({ ...editProject, location: e.target.value || null })}
                placeholder="Enter project location"
                data-testid="input-edit-project-location"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-client">Client</Label>
              <Input
                id="edit-project-client"
                value={editProject.client || ""}
                onChange={(e) => setEditProject({ ...editProject, client: e.target.value || null })}
                placeholder="Enter client name"
                data-testid="input-edit-project-client"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-description">Description</Label>
              <Input
                id="edit-project-description"
                value={editProject.description || ""}
                onChange={(e) => setEditProject({ ...editProject, description: e.target.value || null })}
                placeholder="Enter project description"
                data-testid="input-edit-project-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-project-status">Status</Label>
              <Select value={editProject.status} onValueChange={(value) => setEditProject({ ...editProject, status: value })}>
                <SelectTrigger data-testid="select-edit-project-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleUpdateProject}
                disabled={updateProjectMutation.isPending}
                className="flex-1 bg-blueprint-600 hover:bg-blueprint-700"
                data-testid="button-confirm-update-project"
              >
                {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-update-project"
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
              Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-project">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              disabled={deleteProjectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-project"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}