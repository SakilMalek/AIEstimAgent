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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus,
  Edit,
  Trash2,
  FileText,
  MoreVertical,
  Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EstimateTemplate, TradeClass } from "@shared/schema";

interface EstimateTemplateManagerProps {
  searchQuery: string;
}

const estimateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tradeClassId: z.string().min(1, "Trade class is required"),
  templateData: z.any(), // JSON data for template configuration
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

type EstimateTemplateForm = z.infer<typeof estimateTemplateSchema>;

export default function EstimateTemplateManager({ searchQuery }: EstimateTemplateManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EstimateTemplate | null>(null);
  const [selectedTradeClass, setSelectedTradeClass] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<EstimateTemplateForm>({
    resolver: zodResolver(estimateTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      tradeClassId: "",
      templateData: {},
      tags: [],
      isActive: true,
    },
  });

  // Fetch trade classes
  const { data: tradeClasses = [] } = useQuery({
    queryKey: ["/api/trade-classes"],
  });

  // Fetch estimate templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/estimate-templates", selectedTradeClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTradeClass !== "all") {
        params.append("trade_class_id", selectedTradeClass);
      }
      return apiRequest(`/api/estimate-templates?${params.toString()}`, "GET");
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: EstimateTemplateForm) => {
      return apiRequest("/api/estimate-templates", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-templates"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Template created",
        description: "The estimate template has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create estimate template.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EstimateTemplateForm> }) => {
      return apiRequest(`/api/estimate-templates/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-templates"] });
      setEditingTemplate(null);
      form.reset();
      toast({
        title: "Template updated",
        description: "The estimate template has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update estimate template.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/estimate-templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-templates"] });
      toast({
        title: "Template deleted",
        description: "The estimate template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete estimate template.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EstimateTemplateForm) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: EstimateTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      tradeClassId: template.tradeClassId,
      templateData: template.templateData,
      tags: template.tags || [],
      isActive: template.isActive ?? true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleClone = (template: EstimateTemplate) => {
    form.reset({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      tradeClassId: template.tradeClassId,
      templateData: template.templateData,
      tags: template.tags || [],
      isActive: true,
    });
    setIsCreateDialogOpen(true);
  };

  const filteredTemplates = (templates as EstimateTemplate[]).filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Estimate Templates</h2>
          <p className="text-muted-foreground">Create reusable templates for common estimates</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedTradeClass} onValueChange={setSelectedTradeClass}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by trade class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trade Classes</SelectItem>
              {(tradeClasses as TradeClass[]).map((tc) => (
                <SelectItem key={tc.id} value={tc.id}>
                  {tc.code} - {tc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog 
            open={isCreateDialogOpen} 
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingTemplate(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Estimate Template" : "Create New Estimate Template"}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate 
                    ? "Update the estimate template information."
                    : "Create a reusable template for common estimate configurations."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Standard Office Fit-out" {...field} />
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
                            placeholder="Describe what this template is used for..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tradeClassId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select trade class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(tradeClasses as TradeClass[]).map((tc) => (
                              <SelectItem key={tc.id} value={tc.id}>
                                {tc.code} - {tc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      {editingTemplate ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const tradeClass = (tradeClasses as TradeClass[]).find(tc => tc.id === template.tradeClassId);
            return (
              <Card key={template.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {tradeClass && <Badge variant="secondary">{tradeClass.code}</Badge>}
                      {!template.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClone(template)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.description && (
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {tradeClass?.name}
                      </div>
                      <Button variant="outline" size="sm">
                        Use Template
                      </Button>
                    </div>
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredTemplates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No templates match "${searchQuery}"`
                : "Get started by creating your first estimate template."
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}