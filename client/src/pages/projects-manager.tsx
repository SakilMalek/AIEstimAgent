import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import TradeClassManager from "@/components/trade-class-manager";
import ProductSkuManager from "@/components/product-sku-manager";
import ProjectPricingManager from "@/components/project-pricing-manager";
import EstimateTemplateManager from "@/components/estimate-template-manager";
import { 
  Search,
  Plus,
  Building2,
  Package,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  Calculator
} from "lucide-react";

export default function ProjectsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch overview stats
  const { data: stats } = useQuery({
    queryKey: ["/api/projects-manager/stats"],
    queryFn: async () => {
      // Mock stats for now - could be real API calls
      return {
        totalProjects: 12,
        activeProjects: 8,
        totalSkus: 156,
        tradeClasses: 8,
        templates: 5,
        monthlyRevenue: 247500,
        avgProjectValue: 18200
      };
    }
  });

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects Manager</h1>
              <p className="text-slate-600">Manage pricing, SKUs, and project configurations</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search SKUs, projects, templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Button className="bg-blueprint-600 hover:bg-blueprint-700">
                <Plus className="w-4 h-4 mr-2" />
                Quick Add
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.totalProjects ? stats.totalProjects - stats.activeProjects : 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Product SKUs</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSkus || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across {stats?.tradeClasses || 0} trade classes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats?.monthlyRevenue?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${stats?.avgProjectValue?.toLocaleString() || '0'} avg project
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.templates || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Estimate templates available
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trade-classes">Trade Classes</TabsTrigger>
              <TabsTrigger value="product-skus">Product SKUs</TabsTrigger>
              <TabsTrigger value="project-pricing">Project Pricing</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">New SKU added: 2x4x8 Lumber</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">Project pricing updated: Downtown Office</p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">New estimate template created: HVAC Installation</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calculator className="w-5 h-5 mr-2" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New SKU
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="w-4 h-4 mr-2" />
                      Create Trade Class
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      New Estimate Template
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Bulk Price Update
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Trade Classes Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade Classes Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: "General Construction", skus: 24, code: "GC" },
                      { name: "Electrical", skus: 18, code: "ELEC" },
                      { name: "Plumbing", skus: 15, code: "PLUMB" },
                      { name: "HVAC", skus: 12, code: "HVAC" },
                      { name: "Flooring", skus: 28, code: "FLOOR" },
                      { name: "Windows & Doors", skus: 22, code: "WD" },
                      { name: "Roofing", skus: 16, code: "ROOF" },
                      { name: "Insulation", skus: 8, code: "INSUL" },
                    ].map((trade, index) => (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{trade.code}</Badge>
                          <span className="text-sm text-muted-foreground">{trade.skus} SKUs</span>
                        </div>
                        <h3 className="font-medium text-sm">{trade.name}</h3>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trade-classes">
              <TradeClassManager searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="product-skus">
              <ProductSkuManager searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="project-pricing">
              <ProjectPricingManager searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="templates">
              <EstimateTemplateManager searchQuery={searchQuery} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}