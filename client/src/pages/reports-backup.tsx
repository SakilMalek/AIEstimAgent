import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  Download, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  Calendar,
  FileText,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Target,
  Shield,
  Activity,
  Filter
} from "lucide-react";
import type { Project } from "@shared/schema";

export default function Reports() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Get cost analysis for each project using our AI backend
  const projectAnalyses = useQuery({
    queryKey: ["/api/project-analyses", projects.map(p => p.id)],
    queryFn: async () => {
      const analyses = await Promise.all(
        projects.map(async (project) => {
          try {
            const [costAnalysis, riskAssessment, costTrends] = await Promise.all([
              fetch(`/api/projects/${project.id}/cost-analysis`).then(r => r.json()),
              fetch(`/api/projects/${project.id}/risk-assessment`).then(r => r.json()),
              fetch(`/api/projects/${project.id}/cost-trends?months=6`).then(r => r.json())
            ]);
            return {
              project,
              costAnalysis,
              riskAssessment,
              costTrends
            };
          } catch (error) {
            console.error(`Failed to get analysis for project ${project.id}:`, error);
            return null;
          }
        })
      );
      return analyses.filter(Boolean);
    },
    enabled: projects.length > 0,
  });

  const analysisData = projectAnalyses.data || [];

  // Calculate aggregate metrics from AI analysis
  const aggregateMetrics = {
    totalProjects: projects.length,
    totalCost: analysisData.reduce((sum, item) => sum + (item?.costAnalysis?.totalCost || 0), 0),
    avgEfficiencyScore: analysisData.length > 0 ? 
      analysisData.reduce((sum, item) => sum + (item?.costAnalysis?.overallScore || 0), 0) / analysisData.length : 0,
    highRiskProjects: analysisData.filter(item => 
      item?.riskAssessment?.riskLevel === 'high' || item?.riskAssessment?.riskLevel === 'critical'
    ).length,
    costSavingsOpportunities: analysisData.reduce((sum, item) => {
      const savings = item?.costAnalysis?.insights?.filter(insight => 
        insight.includes('savings') || insight.includes('bulk purchasing')
      ).length || 0;
      return sum + savings;
    }, 0)
  };

  // Category breakdown from cost analysis
  const categoryBreakdown = analysisData.reduce((acc, item) => {
    if (item?.costAnalysis?.costByCategory) {
      item.costAnalysis.costByCategory.forEach(category => {
        const existing = acc.find(c => c.category === category.category);
        if (existing) {
          existing.total += category.total;
          existing.percentage = ((existing.total / aggregateMetrics.totalCost) * 100);
        } else {
          acc.push({
            category: category.category,
            total: category.total,
            percentage: (category.total / aggregateMetrics.totalCost) * 100
          });
        }
      });
    }
    return acc;
  }, [] as Array<{category: string, total: number, percentage: number}>);

  // Efficiency distribution
  const efficiencyDistribution = {
    excellent: analysisData.filter(item => item?.costAnalysis?.efficiency === 'excellent').length,
    good: analysisData.filter(item => item?.costAnalysis?.efficiency === 'good').length,
    average: analysisData.filter(item => item?.costAnalysis?.efficiency === 'average').length,
    poor: analysisData.filter(item => item?.costAnalysis?.efficiency === 'poor').length,
  };

  // Risk level distribution
  const riskDistribution = {
    low: analysisData.filter(item => item?.riskAssessment?.riskLevel === 'low').length,
    medium: analysisData.filter(item => item?.riskAssessment?.riskLevel === 'medium').length,
    high: analysisData.filter(item => item?.riskAssessment?.riskLevel === 'high').length,
    critical: analysisData.filter(item => item?.riskAssessment?.riskLevel === 'critical').length,
  };

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI-Powered Reports & Analytics</h1>
            <p className="text-slate-600 mt-1">Intelligence-driven cost analysis and project insights</p>
          </div>
          
          <div className="flex space-x-3">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40" data-testid="select-time-range">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48" data-testid="select-project-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button className="bg-blueprint-600 hover:bg-blueprint-700" data-testid="button-export-reports">
              <Download className="w-4 h-4 mr-2" />
              Export Analytics
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {projectAnalyses.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* AI-Powered Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card data-testid="card-total-cost">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600">Total Project Cost</p>
                      <p className="text-2xl font-bold text-slate-900">
                        ${aggregateMetrics.totalCost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="card-efficiency-score">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="w-8 h-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600">Avg Efficiency Score</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {aggregateMetrics.avgEfficiencyScore.toFixed(1)}/100
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="card-high-risk">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600">High Risk Projects</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {aggregateMetrics.highRiskProjects}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="card-savings-opportunities">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-600">Cost Savings Opportunities</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {aggregateMetrics.costSavingsOpportunities}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{reportData.totalProjects}</p>
                </div>
                <div className="w-8 h-8 bg-blueprint-100 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-blueprint-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed Takeoffs</p>
                  <p className="text-2xl font-bold text-slate-900">{reportData.completedTakeoffs}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8% accuracy improvement</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Estimated Value</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${reportData.totalEstimatedValue.toLocaleString()}
                  </p>
                </div>
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+23% from last quarter</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Project Value</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${Math.round(reportData.avgProjectValue).toLocaleString()}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+5% from last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 text-blueprint-600 mr-2" />
                Monthly Estimating Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.monthlyTrend.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{item.month}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blueprint-600 h-2 rounded-full" 
                          style={{ width: `${(item.value / 700000) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-16 text-right">
                        ${Math.round(item.value / 1000)}K
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 text-blueprint-600 mr-2" />
                Project Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.categoryBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{category.category}</p>
                      <p className="text-sm text-slate-600">{category.count} projects</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        ${category.value.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-600">
                        {Math.round((category.value / reportData.totalEstimatedValue) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blueprint-600 mr-2" />
                Recent Reports
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blueprint-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blueprint-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{report.name}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-slate-600">{report.date}</span>
                        <Badge variant="outline" className="text-xs">
                          {report.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        ${report.value.toLocaleString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}