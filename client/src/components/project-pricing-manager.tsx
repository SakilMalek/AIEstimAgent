import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus,
  Edit,
  Trash2,
  Building2,
  MoreVertical,
  DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectPricing, Project, ProductSku } from "@shared/schema";

interface ProjectPricingManagerProps {
  searchQuery: string;
}

const projectPricingSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  productSkuId: z.string().min(1, "Product SKU is required"),
  quantity: z.number().min(0, "Quantity must be non-negative"),
  customMaterialCost: z.number().optional(),
  customLaborCost: z.number().optional(),
  customMarkupPercentage: z.number().optional(),
  notes: z.string().optional(),
});

type ProjectPricingForm = z.infer<typeof projectPricingSchema>;

export default function ProjectPricingManager({ searchQuery }: ProjectPricingManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<ProjectPricing | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<ProjectPricingForm>({
    resolver: zodResolver(projectPricingSchema),
    defaultValues: {
      projectId: "",
      productSkuId: "",
      quantity: 0,
      customMaterialCost: undefined,
      customLaborCost: undefined,
      customMarkupPercentage: undefined,
      notes: "",
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch product SKUs
  const { data: productSkus = [] } = useQuery({
    queryKey: ["/api/product-skus"],
  });

  // Fetch project pricing based on selected project
  const { data: projectPricing = [], isLoading } = useQuery({
    queryKey: ["/api/project-pricing", selectedProject],
    queryFn: async () => {
      if (selectedProject === "all") {
        // We'd need a different endpoint for all project pricing
        return [];
      }
      return apiRequest(`/api/projects/${selectedProject}/pricing`, "GET");
    },
    enabled: selectedProject !== "all"
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProjectPricingForm) => {
      return apiRequest(`/api/projects/${data.projectId}/pricing`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-pricing"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Project pricing created",
        description: "The project pricing has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project pricing.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectPricingForm> }) => {
      return apiRequest(`/api/project-pricing/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-pricing"] });
      setEditingPricing(null);
      form.reset();
      toast({
        title: "Project pricing updated",
        description: "The project pricing has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project pricing.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/project-pricing/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-pricing"] });
      toast({
        title: "Project pricing deleted",
        description: "The project pricing has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project pricing.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectPricingForm) => {
    if (editingPricing) {
      updateMutation.mutate({ id: editingPricing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pricing: ProjectPricing) => {
    setEditingPricing(pricing);
    form.reset({
      projectId: pricing.projectId,
      productSkuId: pricing.productSkuId,
      quantity: pricing.quantity,
      customMaterialCost: pricing.customMaterialCost || undefined,
      customLaborCost: pricing.customLaborCost || undefined,
      customMarkupPercentage: pricing.customMarkupPercentage || undefined,
      notes: pricing.notes || "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project pricing?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Project Pricing</h2>
          <p className="text-muted-foreground">Manage custom pricing for specific projects</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {(projects as Project[]).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog 
            open={isCreateDialogOpen} 
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingPricing(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={selectedProject === "all"}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Pricing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingPricing ? "Edit Project Pricing" : "Add Custom Project Pricing"}
                </DialogTitle>
                <DialogDescription>
                  {editingPricing 
                    ? "Update the custom pricing for this project."
                    : "Add custom pricing that overrides default SKU pricing for this project."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          defaultValue={selectedProject !== "all" ? selectedProject : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(projects as Project[]).map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productSkuId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product SKU</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product SKU" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(productSkus as ProductSku[]).map((sku) => (
                              <SelectItem key={sku.id} value={sku.id}>
                                {sku.sku} - {sku.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customMaterialCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Material Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Leave empty for default"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customLaborCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Labor Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Leave empty for default"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customMarkupPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Markup (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="Leave empty for default"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingPricing ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedProject === "all" ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a project</h3>
            <p className="text-muted-foreground">
              Choose a specific project to view and manage its custom pricing.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Material Cost</TableHead>
                <TableHead>Labor Cost</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(projectPricing as ProjectPricing[]).map((pricing) => {
                const sku = (productSkus as ProductSku[]).find(s => s.id === pricing.productSkuId);
                const materialCost = pricing.customMaterialCost ?? sku?.materialCost ?? 0;
                const laborCost = pricing.customLaborCost ?? sku?.laborCost ?? 0;
                const markup = pricing.customMarkupPercentage ?? sku?.markupPercentage ?? 0;
                const subtotal = (materialCost + laborCost) * pricing.quantity;
                const totalCost = subtotal * (1 + markup / 100);

                return (
                  <TableRow key={pricing.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sku?.sku}</Badge>
                        <span className="font-medium">{sku?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{pricing.quantity} {sku?.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span>${materialCost.toFixed(2)}</span>
                        {pricing.customMaterialCost && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span>${laborCost.toFixed(2)}</span>
                        {pricing.customLaborCost && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span>{markup.toFixed(1)}%</span>
                        {pricing.customMarkupPercentage && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">${totalCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(pricing)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(pricing.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {projectPricing.length === 0 && (
            <CardContent className="py-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No custom pricing found</h3>
              <p className="text-muted-foreground mb-4">
                This project is using default SKU pricing. Add custom pricing to override defaults.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Pricing
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}