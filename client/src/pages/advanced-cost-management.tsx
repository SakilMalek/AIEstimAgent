import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, TrendingUp, DollarSign, Users, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface RegionalCost {
  id: string;
  region: string;
  state: string;
  city: string;
  zipCode: string;
  costIndex: number;
  laborRate: number;
  materialMarkup: number;
  lastUpdated: string;
}

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  specialties: string[];
  paymentTerms: string;
  leadTimeDays: number;
  isActive: boolean;
  rating?: number;
}

interface MaterialPricing {
  id: string;
  skuId: string;
  supplierId: string;
  currentPrice: number;
  previousPrice?: number;
  priceChange?: number;
  lastUpdated: string;
}

interface ChangeOrder {
  id: string;
  projectId: string;
  changeOrderNumber: string;
  title: string;
  description: string;
  status: string;
  costImpact: number;
  scheduleImpactDays: number;
  createdAt: string;
}

interface ProfitMarginSettings {
  id: string;
  scope: string;
  materialMarkup: number;
  laborMarkup: number;
  generalConditions: number;
  profit: number;
  isActive: boolean;
}

interface CostHistory {
  id: string;
  skuId: string;
  recordDate: string;
  currentPrice: number;
  dataSource: string;
}

interface CostEscalation {
  id: string;
  projectId: string;
  escalationType: string;
  factorPercentage: number;
  effectiveDate: string;
  reason: string;
  isActive: boolean;
}

export default function AdvancedCostManagement() {
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");

  // Fetch all advanced cost management data
  const { data: regionalCosts = [] } = useQuery<RegionalCost[]>({
    queryKey: ["/api/regional-costs"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: materialPricing = [] } = useQuery<MaterialPricing[]>({
    queryKey: ["/api/material-pricing"],
  });

  const { data: changeOrders = [] } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/change-orders"],
  });

  const { data: profitMargins = [] } = useQuery<ProfitMarginSettings[]>({
    queryKey: ["/api/profit-margins"],
  });

  const { data: costHistory = [] } = useQuery<CostHistory[]>({
    queryKey: ["/api/cost-history"],
  });

  const { data: costEscalation = [] } = useQuery<CostEscalation[]>({
    queryKey: ["/api/cost-escalation"],
  });

  // Calculate summary statistics
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.isActive).length;
  const pendingChangeOrders = changeOrders.filter(co => co.status === 'pending').length;
  const totalChangeOrderValue = changeOrders.reduce((sum, co) => sum + co.costImpact, 0);
  const avgCostIndex = regionalCosts.reduce((sum, rc) => sum + rc.costIndex, 0) / regionalCosts.length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="advanced-cost-management">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Cost Management</h1>
          <p className="text-muted-foreground">
            Comprehensive cost analysis, supplier management, and pricing optimization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-sync-pricing">
            <TrendingUp className="h-4 w-4 mr-2" />
            Sync Pricing
          </Button>
          <Button data-testid="button-generate-report">
            <DollarSign className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-suppliers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {activeSuppliers} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-change-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Change Orders</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{changeOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingChangeOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-change-order-value">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Change Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalChangeOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total impact
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-cost-index">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost Index</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCostIndex.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Regional average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="regional-costs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="regional-costs" data-testid="tab-regional-costs">Regional Costs</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">Material Pricing</TabsTrigger>
          <TabsTrigger value="change-orders" data-testid="tab-change-orders">Change Orders</TabsTrigger>
          <TabsTrigger value="profit-margins" data-testid="tab-profit-margins">Profit Margins</TabsTrigger>
          <TabsTrigger value="escalation" data-testid="tab-escalation">Cost Escalation</TabsTrigger>
        </TabsList>

        <TabsContent value="regional-costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Cost Database</CardTitle>
              <CardDescription>
                Location-based cost indices and labor rates for accurate regional pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="region-filter">Filter by Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger data-testid="select-region-filter">
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All regions</SelectItem>
                    {Array.from(new Set(regionalCosts.map(rc => rc.region))).map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Cost Index</TableHead>
                    <TableHead>Labor Rate</TableHead>
                    <TableHead>Material Markup</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionalCosts
                    .filter(rc => !selectedRegion || selectedRegion === "all" || rc.region === selectedRegion)
                    .map((cost) => (
                    <TableRow key={cost.id} data-testid={`row-regional-cost-${cost.id}`}>
                      <TableCell className="font-medium">{cost.region}</TableCell>
                      <TableCell>{cost.state}</TableCell>
                      <TableCell>{cost.city}</TableCell>
                      <TableCell>
                        <Badge variant={cost.costIndex > 1.5 ? "destructive" : "secondary"}>
                          {cost.costIndex.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>${cost.laborRate.toFixed(2)}/hr</TableCell>
                      <TableCell>{cost.materialMarkup.toFixed(1)}%</TableCell>
                      <TableCell>{new Date(cost.lastUpdated).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Management</CardTitle>
              <CardDescription>
                Manage your supplier network and track performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">{supplier.address}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.contactName}</div>
                          <div className="text-sm text-muted-foreground">{supplier.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {supplier.specialties.slice(0, 2).map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {supplier.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{supplier.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.paymentTerms}</TableCell>
                      <TableCell>{supplier.leadTimeDays} days</TableCell>
                      <TableCell>
                        <Badge variant={supplier.isActive ? "default" : "secondary"}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {supplier.rating ? (
                          <div className="flex items-center">
                            <span className="font-medium">{supplier.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground ml-1">/5</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No rating</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Pricing Analysis</CardTitle>
              <CardDescription>
                Real-time material pricing and supplier comparisons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Previous Price</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialPricing.map((pricing) => (
                    <TableRow key={pricing.id} data-testid={`row-pricing-${pricing.id}`}>
                      <TableCell className="font-medium">{pricing.skuId}</TableCell>
                      <TableCell>{pricing.supplierId}</TableCell>
                      <TableCell>${pricing.currentPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        {pricing.previousPrice ? `$${pricing.previousPrice.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {pricing.priceChange && (
                          <Badge variant={pricing.priceChange > 0 ? "destructive" : "default"}>
                            {pricing.priceChange > 0 ? "+" : ""}{pricing.priceChange.toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(pricing.lastUpdated).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Order Management</CardTitle>
              <CardDescription>
                Track project changes and their cost impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost Impact</TableHead>
                    <TableHead>Schedule Impact</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeOrders.map((changeOrder) => (
                    <TableRow key={changeOrder.id} data-testid={`row-change-order-${changeOrder.id}`}>
                      <TableCell className="font-medium">{changeOrder.changeOrderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{changeOrder.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {changeOrder.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          changeOrder.status === "approved" ? "default" :
                          changeOrder.status === "pending" ? "secondary" :
                          "destructive"
                        }>
                          {changeOrder.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={changeOrder.costImpact > 0 ? "text-red-600" : "text-green-600"}>
                          ${changeOrder.costImpact.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {changeOrder.scheduleImpactDays > 0 ? 
                          `+${changeOrder.scheduleImpactDays} days` : 
                          "No impact"
                        }
                      </TableCell>
                      <TableCell>{new Date(changeOrder.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit-margins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Configuration</CardTitle>
              <CardDescription>
                Configure profit margins by scope and trade type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Material Markup</TableHead>
                    <TableHead>Labor Markup</TableHead>
                    <TableHead>General Conditions</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitMargins.map((margin) => (
                    <TableRow key={margin.id} data-testid={`row-profit-margin-${margin.id}`}>
                      <TableCell>
                        <Badge variant="outline">{margin.scope}</Badge>
                      </TableCell>
                      <TableCell>{margin.materialMarkup.toFixed(1)}%</TableCell>
                      <TableCell>{margin.laborMarkup.toFixed(1)}%</TableCell>
                      <TableCell>{margin.generalConditions.toFixed(1)}%</TableCell>
                      <TableCell>{margin.profit.toFixed(1)}%</TableCell>
                      <TableCell>
                        {margin.isActive ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Escalation Factors</CardTitle>
              <CardDescription>
                Track and apply cost escalation factors for accurate forecasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costEscalation.map((escalation) => (
                    <TableRow key={escalation.id} data-testid={`row-escalation-${escalation.id}`}>
                      <TableCell>{escalation.projectId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{escalation.escalationType}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">
                          +{escalation.factorPercentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{new Date(escalation.effectiveDate).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{escalation.reason}</TableCell>
                      <TableCell>
                        <Badge variant={escalation.isActive ? "default" : "secondary"}>
                          {escalation.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}