import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Upload, FileText, Calculator, Edit, Save, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertProjectSchema, type Project, type Drawing, type Takeoff } from "@shared/schema";

const editProjectSchema = insertProjectSchema.omit({ id: true });

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const projectId = params?.id;

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then(res => res.json()) as Promise<Project>,
    enabled: !!projectId,
  });

  // Fetch project drawings
  const { data: drawings = [], isLoading: drawingsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "drawings"],
    queryFn: () => fetch(`/api/projects/${projectId}/drawings`).then(res => res.json()) as Promise<Drawing[]>,
    enabled: !!projectId,
  });

  // Fetch takeoffs for all drawings
  const { data: allTakeoffs = [] } = useQuery({
    queryKey: ["/api/projects", projectId, "takeoffs"],
    queryFn: async () => {
      const takeoffsPromises = drawings.map(drawing =>
        fetch(`/api/drawings/${drawing.id}/takeoffs`).then(res => res.json())
      );
      const takeoffsArrays = await Promise.all(takeoffsPromises);
      return takeoffsArrays.flat() as Takeoff[];
    },
    enabled: drawings.length > 0,
  });

  // Form for editing project
  const form = useForm({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      location: project?.location || "",
      client: project?.client || "",
    },
  });

  // Update form when project data loads
  if (project && !form.getValues().name) {
    form.reset({
      name: project.name,
      description: project.description || "",
      location: project.location || "",
      client: project.client || "",
    });
  }

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${projectId}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditing(false);
      toast({
        title: "Project Updated",
        description: "Project details have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateProjectMutation.mutate(data);
  };

  if (!projectId) {
    return <div>Project not found</div>;
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalDrawings = drawings.length;
  const processedDrawings = drawings.filter(d => d.status === "processed").length;
  const totalEstimate = allTakeoffs.reduce((sum, takeoff) => sum + (takeoff.totalCost || 0), 0);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/projects")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">
              Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Project
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  form.reset();
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateProjectMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="client"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter client name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter project description" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">CLIENT</h3>
                    <p className="text-lg">{project.client || "Not specified"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">LOCATION</h3>
                    <p className="text-lg">{project.location || "Not specified"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">DESCRIPTION</h3>
                    <p className="text-lg">{project.description || "No description provided"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drawings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Drawings ({totalDrawings})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {drawingsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading drawings...</p>
                </div>
              ) : drawings.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No drawings uploaded yet</p>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload First Drawing
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drawings.map((drawing) => (
                    <div key={drawing.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{drawing.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded {drawing.uploadedAt ? new Date(drawing.uploadedAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={drawing.status === "processed" ? "default" : "secondary"}>
                        {drawing.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project Stats Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Project Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Drawings</span>
                <span className="font-semibold">{totalDrawings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Processed</span>
                <span className="font-semibold">{processedDrawings}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Estimate</span>
                <span className="font-bold text-lg text-green-600">
                  ${totalEstimate.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Takeoffs */}
          {allTakeoffs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Takeoffs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allTakeoffs.slice(0, 5).map((takeoff) => (
                    <div key={takeoff.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{takeoff.itemType}</p>
                        <p className="text-xs text-muted-foreground">
                          {takeoff.quantity} {takeoff.unit}
                        </p>
                      </div>
                      <span className="font-semibold text-sm">
                        ${(takeoff.totalCost || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}