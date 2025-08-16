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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus,
  Edit,
  Trash2,
  Package,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TradeClass } from "@shared/schema";

interface TradeClassManagerProps {
  searchQuery: string;
}

const tradeClassSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type TradeClassForm = z.infer<typeof tradeClassSchema>;

export default function TradeClassManager({ searchQuery }: TradeClassManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTradeClass, setEditingTradeClass] = useState<TradeClass | null>(null);
  const { toast } = useToast();

  const form = useForm<TradeClassForm>({
    resolver: zodResolver(tradeClassSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      parentId: "",
    },
  });

  // Fetch trade classes
  const { data: tradeClasses = [], isLoading } = useQuery({
    queryKey: ["/api/trade-classes"],
  });

  // Fetch product SKUs count for each trade class
  const { data: skuCounts = {} } = useQuery({
    queryKey: ["/api/product-skus", "counts"],
    queryFn: async () => {
      const skus = await apiRequest("/api/product-skus", "GET");
      const counts: Record<string, number> = {};
      skus.forEach((sku: any) => {
        counts[sku.tradeClassId] = (counts[sku.tradeClassId] || 0) + 1;
      });
      return counts;
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TradeClassForm) => {
      return apiRequest("/api/trade-classes", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade-classes"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Trade class created",
        description: "The trade class has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create trade class.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TradeClassForm> }) => {
      return apiRequest(`/api/trade-classes/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade-classes"] });
      setEditingTradeClass(null);
      form.reset();
      toast({
        title: "Trade class updated",
        description: "The trade class has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trade class.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/trade-classes/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade-classes"] });
      toast({
        title: "Trade class deleted",
        description: "The trade class has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trade class.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TradeClassForm) => {
    if (editingTradeClass) {
      updateMutation.mutate({ id: editingTradeClass.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tradeClass: TradeClass) => {
    setEditingTradeClass(tradeClass);
    form.reset({
      name: tradeClass.name,
      code: tradeClass.code,
      description: tradeClass.description || "",
      parentId: tradeClass.parentId || "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this trade class?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredTradeClasses = (tradeClasses as TradeClass[]).filter((tc) =>
    tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tc.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Trade Classes</h2>
          <p className="text-muted-foreground">Organize products by trade specialization</p>
        </div>
        <Dialog 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingTradeClass(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Trade Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingTradeClass ? "Edit Trade Class" : "Create New Trade Class"}
              </DialogTitle>
              <DialogDescription>
                {editingTradeClass 
                  ? "Update the trade class information."
                  : "Add a new trade class to organize your product SKUs."
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
                        <Input placeholder="e.g., Electrical" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ELEC" {...field} />
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
                          placeholder="Describe this trade class..."
                          {...field}
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
                    {editingTradeClass ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
          {filteredTradeClasses.map((tradeClass) => (
            <Card key={tradeClass.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{tradeClass.code}</Badge>
                    <CardTitle className="text-lg">{tradeClass.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(tradeClass)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(tradeClass.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tradeClass.description && (
                    <p className="text-sm text-muted-foreground">
                      {tradeClass.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {skuCounts[tradeClass.id] || 0} SKUs
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      View SKUs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTradeClasses.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No trade classes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No trade classes match "${searchQuery}"`
                : "Get started by creating your first trade class."
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Trade Class
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}