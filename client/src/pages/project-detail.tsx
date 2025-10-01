import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ReportGeneratorComponent } from "@/components/report-generator";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { 
  ArrowLeft,
  Building, 
  Calendar,
  MapPin,
  FileImage,
  Activity,
  Edit,
  Trash2,
  MoreVertical,
  Save,
  Download,
  Plus,
  RotateCcw,
  CheckSquare,
  Square,
  Copy,
  Eye,
  Calculator,
  FileText,
  DollarSign,
  Check,
  X
} from "lucide-react";
import type { Project, SavedAnalysis, Takeoff, Drawing } from "@shared/schema";

export default function ProjectDetail() {
  const [match, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const [, setLocation] = useLocation();
  const [isEditingTakeoff, setIsEditingTakeoff] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ 
    quantity: number; 
    costPerUnit: number; 
    notes: string; 
    area: number | null; 
    length: number | null; 
  }>({
    quantity: 0,
    costPerUnit: 0,
    notes: "",
    area: null,
    length: null
  });
  const [isSaveAnalysisOpen, setIsSaveAnalysisOpen] = useState(false);
  const [analysisName, setAnalysisName] = useState("");
  const [analysisDescription, setAnalysisDescription] = useState("");
  const [isDeleteAnalysisOpen, setIsDeleteAnalysisOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const [selectedTakeoffs, setSelectedTakeoffs] = useState<Set<string>>(new Set());
  const [batchEditMode, setBatchEditMode] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Fetch project drawings
  const { data: drawings = [], isLoading: drawingsLoading } = useQuery<Drawing[]>({
    queryKey: ["/api/projects", projectId, "drawings"],
    enabled: !!projectId,
  });

  // Fetch takeoffs for all drawings
  const { data: takeoffs = [], isLoading: takeoffsLoading } = useQuery<Takeoff[]>({
    queryKey: ["/api/projects", projectId, "takeoffs"],
    enabled: !!projectId,
  });

  // Fetch saved analyses
  const { data: savedAnalyses = [] } = useQuery<SavedAnalysis[]>({
    queryKey: ["/api/projects", projectId, "saved-analyses"],
    enabled: !!projectId,
  });

  // Update takeoff mutation
  const updateTakeoffMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/takeoffs/${id}`, "PATCH", data),
    onSuccess: () => {
      toast({
        title: "Takeoff updated",
        description: "Takeoff has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "takeoffs"] });
      setIsEditingTakeoff(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update takeoff",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save analysis mutation
  const saveAnalysisMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/projects/${projectId}/save-analysis`, "POST", data),
    onSuccess: () => {
      toast({
        title: "Analysis saved",
        description: "Analysis has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "saved-analyses"] });
      setIsSaveAnalysisOpen(false);
      setAnalysisName("");
      setAnalysisDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save analysis",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete analysis mutation
  const deleteAnalysisMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/saved-analyses/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Analysis deleted",
        description: "Analysis has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "saved-analyses"] });
      setIsDeleteAnalysisOpen(false);
      setSelectedAnalysis(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete analysis",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditTakeoff = (takeoff: Takeoff) => {
    setIsEditingTakeoff(takeoff.id);
    setEditValues({
      quantity: takeoff.quantity || 0,
      costPerUnit: takeoff.costPerUnit || 0,
      notes: takeoff.notes || "",
      area: takeoff.area,
      length: takeoff.length
    });
  };

  const handleSaveTakeoff = (takeoffId: string) => {
    const totalCost = editValues.quantity * editValues.costPerUnit;
    updateTakeoffMutation.mutate({
      id: takeoffId,
      data: {
        quantity: editValues.quantity,
        costPerUnit: editValues.costPerUnit,
        area: editValues.area,
        length: editValues.length,
        totalCost,
        notes: editValues.notes,
        verified: true,
        manuallyEdited: true
      }
    });
  };

  const handleSaveAnalysis = () => {
    if (!analysisName.trim()) {
      toast({
        title: "Analysis name required",
        description: "Please enter a name for the analysis.",
        variant: "destructive",
      });
      return;
    }

    const totalItems = takeoffs.length;
    const totalCost = takeoffs.reduce((sum: number, takeoff: Takeoff) => sum + (takeoff.totalCost || 0), 0);
    const elementTypes = Array.from(new Set(takeoffs.map((t: Takeoff) => t.elementType)));

    saveAnalysisMutation.mutate({
      name: analysisName,
      description: analysisDescription,
      analysisData: {
        takeoffs,
        drawings,
        timestamp: new Date().toISOString()
      },
      totalItems,
      totalCost,
      elementTypes
    });
  };

  const handleDeleteAnalysis = (analysis: SavedAnalysis) => {
    setSelectedAnalysis(analysis);
    setIsDeleteAnalysisOpen(true);
  };

  const confirmDeleteAnalysis = () => {
    if (selectedAnalysis) {
      deleteAnalysisMutation.mutate(selectedAnalysis.id);
    }
  };

  // Batch operations
  const toggleTakeoffSelection = (takeoffId: string) => {
    const newSelected = new Set(selectedTakeoffs);
    if (newSelected.has(takeoffId)) {
      newSelected.delete(takeoffId);
    } else {
      newSelected.add(takeoffId);
    }
    setSelectedTakeoffs(newSelected);
  };

  const selectAllTakeoffs = () => {
    setSelectedTakeoffs(new Set(takeoffs.map(t => t.id)));
  };

  const clearTakeoffSelection = () => {
    setSelectedTakeoffs(new Set());
  };

  // Batch operations using the batch API endpoint
  const batchUpdateMutation = useMutation({
    mutationFn: ({ takeoffIds, updates }: { takeoffIds: string[]; updates: any }) =>
      apiRequest("/api/takeoffs/batch", "PATCH", { takeoffIds, updates }),
    onSuccess: () => {
      toast({
        title: "Batch update completed",
        description: "Selected takeoffs have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "takeoffs"] });
      clearTakeoffSelection();
    },
    onError: (error: Error) => {
      toast({
        title: "Batch update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const batchMarkAsVerified = () => {
    batchUpdateMutation.mutate({
      takeoffIds: Array.from(selectedTakeoffs),
      updates: { verified: true }
    });
  };

  const batchApplyPricing = (costPerUnit: number) => {
    const updates: any = { 
      costPerUnit,
      manuallyEdited: true
    };
    
    // Calculate totalCost for each takeoff individually would require individual updates
    // For now, we'll use individual mutations to handle quantity-specific calculations
    selectedTakeoffs.forEach(takeoffId => {
      const takeoff = takeoffs.find(t => t.id === takeoffId);
      if (takeoff) {
        updateTakeoffMutation.mutate({
          id: takeoffId,
          data: { 
            costPerUnit,
            totalCost: (takeoff.quantity || 0) * costPerUnit,
            manuallyEdited: true
          }
        });
      }
    });
    clearTakeoffSelection();
  };

  const exportTakeoffs = () => {
    // Enhanced CSV with material/labor separation and additional details
    const headers = [
      "Element Type", 
      "Item Name", 
      "Quantity", 
      "Unit", 
      "Area (sq ft)", 
      "Length (ft)",
      "Material Cost/Unit", 
      "Labor Cost/Unit", 
      "Total Cost/Unit",
      "Total Material Cost",
      "Total Labor Cost", 
      "Total Cost", 
      "AI Detected",
      "Manually Edited",
      "Original Quantity",
      "Verified", 
      "Notes"
    ];
    
    const rows = takeoffs.map((takeoff: Takeoff) => {
      // Estimate material/labor split (typically 60/40 for construction)
      const totalCostPerUnit = takeoff.costPerUnit || 0;
      const materialCostPerUnit = totalCostPerUnit * 0.6;
      const laborCostPerUnit = totalCostPerUnit * 0.4;
      const quantity = takeoff.quantity || 0;
      
      return [
        takeoff.elementType,
        takeoff.elementName,
        quantity.toString(),
        takeoff.unit,
        takeoff.area?.toString() || "",
        takeoff.length?.toString() || "",
        materialCostPerUnit.toFixed(2),
        laborCostPerUnit.toFixed(2),
        totalCostPerUnit.toString(),
        (materialCostPerUnit * quantity).toFixed(2),
        (laborCostPerUnit * quantity).toFixed(2),
        takeoff.totalCost?.toString() || "0",
        takeoff.detectedByAi ? "Yes" : "No",
        takeoff.manuallyEdited ? "Yes" : "No",
        takeoff.originalQuantity?.toString() || "",
        takeoff.verified ? "Yes" : "No",
        takeoff.notes || ""
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: string) => `"${cell}"`).join(","))
      .join("\n");

    // Download enhanced CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "project"}-detailed-takeoffs.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Detailed takeoff report with material/labor breakdown has been downloaded.",
    });
  };

  if (!match || !projectId) {
    return null;
  }

  if (projectLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blueprint-600"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Project Not Found</h3>
          <p className="text-slate-600 mb-6">The requested project could not be found.</p>
          <Button onClick={() => setLocation("/projects")}>
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const totalCost = takeoffs.reduce((sum: number, takeoff: Takeoff) => sum + (takeoff.totalCost || 0), 0);
  const totalItems = takeoffs.length;
  const verifiedItems = takeoffs.filter((t: Takeoff) => t.verified).length;

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/projects")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project?.name}</h1>
              <p className="text-slate-600 mt-1">{project?.description || "No description provided"}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Dialog open={isSaveAnalysisOpen} onOpenChange={setIsSaveAnalysisOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save Analysis
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Analysis</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="analysis-name">Analysis Name</Label>
                    <Input
                      id="analysis-name"
                      value={analysisName}
                      onChange={(e) => setAnalysisName(e.target.value)}
                      placeholder="Enter analysis name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="analysis-description">Description (Optional)</Label>
                    <Textarea
                      id="analysis-description"
                      value={analysisDescription}
                      onChange={(e) => setAnalysisDescription(e.target.value)}
                      placeholder="Enter analysis description"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={handleSaveAnalysis}
                      disabled={saveAnalysisMutation.isPending}
                      className="flex-1 bg-blueprint-600 hover:bg-blueprint-700"
                    >
                      {saveAnalysisMutation.isPending ? "Saving..." : "Save Analysis"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsSaveAnalysisOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <ReportGeneratorComponent
              project={project}
              takeoffs={takeoffs}
              drawings={drawings}
              analyses={savedAnalyses}
            />

            <Button onClick={exportTakeoffs} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4" />
            <span>{project?.location || "No location specified"}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Building className="w-4 h-4" />
            <span>{project?.client || "No client specified"}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Created {project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className={
                project?.status === "active" 
                  ? "bg-green-100 text-green-700"
                  : project?.status === "on-hold"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-slate-100 text-slate-700"
              }
            >
              {project?.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileImage className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{drawings.length}</p>
                  <p className="text-xs text-slate-500">Drawings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calculator className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{totalItems}</p>
                  <p className="text-xs text-slate-500">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Check className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{verifiedItems}/{totalItems}</p>
                  <p className="text-xs text-slate-500">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">${totalCost.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Total Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="takeoffs" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="takeoffs">Takeoffs</TabsTrigger>
            <TabsTrigger value="saved-analyses">Saved Analyses</TabsTrigger>
            <TabsTrigger value="drawings">Drawings</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="skus">SKUs</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="takeoffs" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Takeoff Items</h3>
                    <p className="text-sm text-slate-600">Review and edit extracted quantities and costs</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBatchEditMode(!batchEditMode)}
                      className={batchEditMode ? "bg-blue-50 border-blue-200" : ""}
                    >
                      {batchEditMode ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                      Batch Mode
                    </Button>
                  </div>
                </div>

                {/* Batch Operations Toolbar */}
                {batchEditMode && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-slate-600">
                        {selectedTakeoffs.size} of {takeoffs.length} selected
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllTakeoffs}
                        disabled={selectedTakeoffs.size === takeoffs.length}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearTakeoffSelection}
                        disabled={selectedTakeoffs.size === 0}
                      >
                        Clear
                      </Button>
                    </div>

                    {selectedTakeoffs.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={batchMarkAsVerified}
                          disabled={updateTakeoffMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Mark Verified
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <DollarSign className="w-4 h-4 mr-1" />
                              Apply Pricing
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => batchApplyPricing(10)}>
                              $10.00 per unit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => batchApplyPricing(25)}>
                              $25.00 per unit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => batchApplyPricing(50)}>
                              $50.00 per unit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => batchApplyPricing(100)}>
                              $100.00 per unit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {takeoffsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blueprint-600 mx-auto"></div>
                  <p className="text-slate-600 mt-2">Loading takeoffs...</p>
                </div>
              ) : takeoffs.length === 0 ? (
                <div className="p-8 text-center">
                  <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Takeoffs Yet</h4>
                  <p className="text-slate-600">Upload drawings and run AI analysis to see takeoff items here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {takeoffs.map((takeoff) => (
                    <div key={takeoff.id} className="p-4">
                      {isEditingTakeoff === takeoff.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900">{takeoff.elementName}</h4>
                              <p className="text-sm text-slate-600">{takeoff.elementType}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveTakeoff(takeoff.id)}
                                disabled={updateTakeoffMutation.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsEditingTakeoff(null)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                          
                          {/* Core Measurements */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor={`quantity-${takeoff.id}`}>
                                Quantity
                                {takeoff.originalQuantity && takeoff.originalQuantity !== editValues.quantity && (
                                  <span className="text-xs text-slate-500 ml-1">(AI: {takeoff.originalQuantity})</span>
                                )}
                              </Label>
                              <Input
                                id={`quantity-${takeoff.id}`}
                                type="number"
                                value={editValues.quantity}
                                onChange={(e) => setEditValues({
                                  ...editValues,
                                  quantity: parseInt(e.target.value) || 0
                                })}
                                className={takeoff.originalQuantity && takeoff.originalQuantity !== editValues.quantity ? 
                                  "border-yellow-300 bg-yellow-50" : ""}
                              />
                            </div>
                            
                            {takeoff.area !== null && (
                              <div>
                                <Label htmlFor={`area-${takeoff.id}`}>
                                  Area (sq ft)
                                  {takeoff.originalArea && takeoff.originalArea !== editValues.area && (
                                    <span className="text-xs text-slate-500 ml-1">(AI: {takeoff.originalArea})</span>
                                  )}
                                </Label>
                                <Input
                                  id={`area-${takeoff.id}`}
                                  type="number"
                                  step="0.1"
                                  value={editValues.area || ''}
                                  onChange={(e) => setEditValues({
                                    ...editValues,
                                    area: parseFloat(e.target.value) || null
                                  })}
                                  className={takeoff.originalArea && takeoff.originalArea !== editValues.area ? 
                                    "border-yellow-300 bg-yellow-50" : ""}
                                />
                              </div>
                            )}
                            
                            {takeoff.length !== null && (
                              <div>
                                <Label htmlFor={`length-${takeoff.id}`}>
                                  Length (ft)
                                  {takeoff.originalLength && takeoff.originalLength !== editValues.length && (
                                    <span className="text-xs text-slate-500 ml-1">(AI: {takeoff.originalLength})</span>
                                  )}
                                </Label>
                                <Input
                                  id={`length-${takeoff.id}`}
                                  type="number"
                                  step="0.1"
                                  value={editValues.length || ''}
                                  onChange={(e) => setEditValues({
                                    ...editValues,
                                    length: parseFloat(e.target.value) || null
                                  })}
                                  className={takeoff.originalLength && takeoff.originalLength !== editValues.length ? 
                                    "border-yellow-300 bg-yellow-50" : ""}
                                />
                              </div>
                            )}
                            
                            <div>
                              <Label htmlFor={`cost-${takeoff.id}`}>
                                Cost Per Unit ($)
                                {takeoff.originalCostPerUnit && takeoff.originalCostPerUnit !== editValues.costPerUnit && (
                                  <span className="text-xs text-slate-500 ml-1">(Original: ${takeoff.originalCostPerUnit})</span>
                                )}
                              </Label>
                              <Input
                                id={`cost-${takeoff.id}`}
                                type="number"
                                step="0.01"
                                value={editValues.costPerUnit}
                                onChange={(e) => setEditValues({
                                  ...editValues,
                                  costPerUnit: parseFloat(e.target.value) || 0
                                })}
                                className={takeoff.originalCostPerUnit && takeoff.originalCostPerUnit !== editValues.costPerUnit ? 
                                  "border-yellow-300 bg-yellow-50" : ""}
                              />
                            </div>
                          </div>

                          {/* Calculated Values */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg">
                            <div>
                              <Label className="text-xs text-slate-600">Unit</Label>
                              <p className="font-medium">{takeoff.unit}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Calculated Total Cost</Label>
                              <p className="font-medium text-lg text-slate-900">
                                ${(editValues.quantity * editValues.costPerUnit).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (takeoff.originalQuantity) setEditValues({...editValues, quantity: takeoff.originalQuantity});
                                  if (takeoff.originalArea) setEditValues({...editValues, area: takeoff.originalArea});
                                  if (takeoff.originalLength) setEditValues({...editValues, length: takeoff.originalLength});
                                  if (takeoff.originalCostPerUnit) setEditValues({...editValues, costPerUnit: takeoff.originalCostPerUnit});
                                }}
                                disabled={!takeoff.originalQuantity && !takeoff.originalCostPerUnit}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Reset to AI
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`notes-${takeoff.id}`}>Notes (Optional)</Label>
                            <Textarea
                              id={`notes-${takeoff.id}`}
                              value={editValues.notes}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                notes: e.target.value
                              })}
                              placeholder="Add any notes about this item..."
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          {batchEditMode && (
                            <div className="mr-4">
                              <input
                                type="checkbox"
                                checked={selectedTakeoffs.has(takeoff.id)}
                                onChange={() => toggleTakeoffSelection(takeoff.id)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-900">{takeoff.elementName}</h4>
                              <div className="flex items-center space-x-2">
                                {takeoff.verified && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    <Check className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                                {takeoff.manuallyEdited && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    <Edit className="w-3 h-3 mr-1" />
                                    Modified
                                  </Badge>
                                )}
                                {takeoff.detectedByAi && !takeoff.manuallyEdited && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                                    AI Detected
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Type</p>
                                <p className="font-medium">{takeoff.elementType}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">
                                  Quantity
                                  {takeoff.originalQuantity && takeoff.originalQuantity !== takeoff.quantity && (
                                    <span className="text-xs text-yellow-600 ml-1">(was {takeoff.originalQuantity})</span>
                                  )}
                                </p>
                                <p className="font-medium">{takeoff.quantity} {takeoff.unit}</p>
                              </div>
                              {takeoff.area && (
                                <div>
                                  <p className="text-slate-500">
                                    Area
                                    {takeoff.originalArea && takeoff.originalArea !== takeoff.area && (
                                      <span className="text-xs text-yellow-600 ml-1">(was {takeoff.originalArea})</span>
                                    )}
                                  </p>
                                  <p className="font-medium">{takeoff.area} sq ft</p>
                                </div>
                              )}
                              <div>
                                <p className="text-slate-500">
                                  Cost/Unit
                                  {takeoff.originalCostPerUnit && takeoff.originalCostPerUnit !== takeoff.costPerUnit && (
                                    <span className="text-xs text-yellow-600 ml-1">(was ${takeoff.originalCostPerUnit})</span>
                                  )}
                                </p>
                                <p className="font-medium">${takeoff.costPerUnit?.toLocaleString() || "0"}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Total Cost</p>
                                <p className="font-medium text-slate-900">${takeoff.totalCost?.toLocaleString() || "0"}</p>
                              </div>
                              <div className="flex items-center justify-end space-x-2">
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const newQuantity = (takeoff.quantity || 0) - 1;
                                      if (newQuantity >= 0) {
                                        updateTakeoffMutation.mutate({
                                          id: takeoff.id,
                                          data: { 
                                            quantity: newQuantity,
                                            totalCost: newQuantity * (takeoff.costPerUnit || 0),
                                            manuallyEdited: true
                                          }
                                        });
                                      }
                                    }}
                                    className="w-6 h-6 p-0"
                                    disabled={!takeoff.quantity || takeoff.quantity <= 0}
                                  >
                                    -
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const newQuantity = (takeoff.quantity || 0) + 1;
                                      updateTakeoffMutation.mutate({
                                        id: takeoff.id,
                                        data: { 
                                          quantity: newQuantity,
                                          totalCost: newQuantity * (takeoff.costPerUnit || 0),
                                          manuallyEdited: true
                                        }
                                      });
                                    }}
                                    className="w-6 h-6 p-0"
                                  >
                                    +
                                  </Button>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditTakeoff(takeoff)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                            
                            {takeoff.notes && (
                              <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                                <p className="text-slate-600">{takeoff.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saved-analyses" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Saved Analyses</h3>
                <p className="text-sm text-slate-600">Previous analysis results and snapshots</p>
              </div>
              
              {savedAnalyses.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Saved Analyses</h4>
                  <p className="text-slate-600">Save your current analysis to create a snapshot of takeoff results.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {savedAnalyses.map((analysis) => (
                    <div key={analysis.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-900">{analysis.name}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Export
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAnalysis(analysis)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {analysis.description && (
                            <p className="text-sm text-slate-600 mb-2">{analysis.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Items</p>
                              <p className="font-medium">{analysis.totalItems}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Total Cost</p>
                              <p className="font-medium">${analysis.totalCost?.toLocaleString() || "0"}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Elements</p>
                              <p className="font-medium">{Array.isArray(analysis.elementTypes) ? analysis.elementTypes.length : 0} types</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Created</p>
                              <p className="font-medium">{analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'Unknown'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="drawings" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Project Drawings</h3>
                <p className="text-sm text-slate-600">Uploaded blueprints and floor plans</p>
              </div>
              
              {drawingsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blueprint-600 mx-auto"></div>
                  <p className="text-slate-600 mt-2">Loading drawings...</p>
                </div>
              ) : drawings.length === 0 ? (
                <div className="p-8 text-center">
                  <FileImage className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Drawings</h4>
                  <p className="text-slate-600">Upload drawings to this project to get started with AI analysis.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {drawings.map((drawing) => (
                    <Card key={drawing.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{drawing.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Type:</span>
                          <span className="font-medium">{drawing.fileType}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Status:</span>
                          <Badge 
                            variant="secondary"
                            className={
                              drawing.status === "complete"
                                ? "bg-green-100 text-green-700"
                                : drawing.status === "processing"
                                ? "bg-yellow-100 text-yellow-700"
                                : drawing.status === "error"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }
                          >
                            {drawing.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">AI Processed:</span>
                          <Badge variant={drawing.aiProcessed ? "default" : "outline"}>
                            {drawing.aiProcessed ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500">
                          Uploaded {drawing.uploadedAt ? new Date(drawing.uploadedAt).toLocaleDateString() : 'Unknown'}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Project Pricing</h3>
                    <p className="text-sm text-slate-600">Manage custom pricing for this project</p>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Pricing
                  </Button>
                </div>
              </div>
              
              <div className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-slate-900 mb-2">Custom Project Pricing</h4>
                <p className="text-slate-600 mb-4">
                  Override default SKU pricing for this specific project. Custom pricing will be used in all calculations and reports for this project.
                </p>
                <p className="text-sm text-slate-500">
                  No custom pricing configured yet. This project uses default SKU pricing.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="skus" className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Available SKUs</h3>
                    <p className="text-sm text-slate-600">Browse and manage product catalog</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Import SKUs
                    </Button>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add SKU
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-8 text-center">
                <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-slate-900 mb-2">Product SKU Catalog</h4>
                <p className="text-slate-600 mb-4">
                  Manage your product catalog with pricing, trade classes, and vendor information. SKUs are used throughout the system for accurate cost estimation.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">General Construction</p>
                    <p className="text-slate-500">24 SKUs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">Electrical</p>
                    <p className="text-slate-500">18 SKUs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">Plumbing</p>
                    <p className="text-slate-500">15 SKUs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">HVAC</p>
                    <p className="text-slate-500">12 SKUs</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsDashboard
              project={project}
              takeoffs={takeoffs}
              drawings={drawings}
              analyses={savedAnalyses}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Analysis Dialog */}
      <AlertDialog open={isDeleteAnalysisOpen} onOpenChange={setIsDeleteAnalysisOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAnalysis?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAnalysis}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Analysis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}