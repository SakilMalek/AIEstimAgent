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
  Package,
  MoreVertical,
  DollarSign,
  Tag,
  Search
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
import type { ProductSku, TradeClass } from "@shared/schema";

interface ProductSkuManagerProps {
  searchQuery: string;
}

const productSkuSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tradeClassId: z.string().min(1, "Trade class is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  unitSize: z.number().optional(),
  unitDescription: z.string().optional(),
  materialCost: z.number().min(0, "Material cost must be non-negative"),
  laborCost: z.number().min(0, "Labor cost must be non-negative"),
  markupPercentage: z.number().min(0, "Markup must be non-negative").max(100, "Markup cannot exceed 100%"),
  vendor: z.string().optional(),
  vendorSku: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProductSkuForm = z.infer<typeof productSkuSchema>;

export default function ProductSkuManager({ searchQuery }: ProductSkuManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<ProductSku | null>(null);
  const [selectedTradeClass, setSelectedTradeClass] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<ProductSkuForm>({
    resolver: zodResolver(productSkuSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      tradeClassId: "",
      category: "",
      subcategory: "",
      unit: "",
      unitSize: 0,
      unitDescription: "",
      materialCost: 0,
      laborCost: 0,
      markupPercentage: 20,
      vendor: "",
      vendorSku: "",
      isActive: true,
    },
  });

  // Fetch trade classes
  const { data: tradeClasses = [] } = useQuery({
    queryKey: ["/api/trade-classes"],
  });

  // Fetch product SKUs
  const { data: productSkus = [], isLoading } = useQuery({
    queryKey: ["/api/product-skus", selectedTradeClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTradeClass !== "all") {
        params.append("trade_class_id", selectedTradeClass);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      return apiRequest(`/api/product-skus?${params.toString()}`, "GET");
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductSkuForm) => {
      return apiRequest("/api/product-skus", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-skus"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "SKU created",
        description: "The product SKU has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product SKU.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductSkuForm> }) => {
      return apiRequest(`/api/product-skus/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-skus"] });
      setEditingSku(null);
      form.reset();
      toast({
        title: "SKU updated",
        description: "The product SKU has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product SKU.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/product-skus/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-skus"] });
      toast({
        title: "SKU deleted",
        description: "The product SKU has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product SKU.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductSkuForm) => {
    if (editingSku) {
      updateMutation.mutate({ id: editingSku.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (sku: ProductSku) => {
    setEditingSku(sku);
    form.reset({
      sku: sku.sku,
      name: sku.name,
      description: sku.description || "",
      tradeClassId: sku.tradeClassId,
      category: sku.category,
      subcategory: sku.subcategory || "",
      unit: sku.unit,
      unitSize: sku.unitSize || 0,
      unitDescription: sku.unitDescription || "",
      materialCost: sku.materialCost,
      laborCost: sku.laborCost,
      markupPercentage: sku.markupPercentage || 20,
      vendor: sku.vendor || "",
      vendorSku: sku.vendorSku || "",
      isActive: sku.isActive ?? true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this SKU?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTotalCost = (sku: ProductSku) => {
    const subtotal = sku.materialCost + sku.laborCost;
    const markup = subtotal * ((sku.markupPercentage || 0) / 100);
    return subtotal + markup;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product SKUs</h2>
          <p className="text-muted-foreground">Manage your product catalog and pricing</p>
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
                setEditingSku(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add SKU
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSku ? "Edit Product SKU" : "Create New Product SKU"}
                </DialogTitle>
                <DialogDescription>
                  {editingSku 
                    ? "Update the product SKU information and pricing."
                    : "Add a new product SKU to your catalog."
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., LUM-2X4-8" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2x4x8 Lumber" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed product description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Lumber" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., piece, sq ft, ft" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., per linear foot" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="materialCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="laborCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor Cost ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="markupPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Markup (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="20"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Home Depot" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vendorSku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor's product code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                      {editingSku ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
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
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Trade Class</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Material Cost</TableHead>
                <TableHead>Labor Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(productSkus as ProductSku[]).map((sku) => {
                const tradeClass = (tradeClasses as TradeClass[]).find((tc) => tc.id === sku.tradeClassId);
                return (
                  <TableRow key={sku.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{sku.sku}</Badge>
                        {!sku.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sku.name}</TableCell>
                    <TableCell>
                      {tradeClass && (
                        <Badge variant="secondary">{tradeClass.code}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{sku.category}</TableCell>
                    <TableCell>{sku.unit}</TableCell>
                    <TableCell>${sku.materialCost.toFixed(2)}</TableCell>
                    <TableCell>${sku.laborCost.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">
                      ${getTotalCost(sku).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sku)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(sku.id)}
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

          {productSkus.length === 0 && (
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No SKUs found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? `No SKUs match your search criteria`
                  : "Get started by adding your first product SKU."
                }
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add SKU
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}