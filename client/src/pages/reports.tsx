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

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Get cost analysis for each project using our AI backend
  const projectAnalyses = useQuery({
    queryKey: ["/api/project-analyses", projects.map((p: Project) => p.id)],
    queryFn: async () => {
      const analyses = await Promise.all(
        projects.map(async (project: Project) => {
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
    totalCost: analysisData.reduce((sum: number, item: any) => sum + (item?.costAnalysis?.totalCost || 0), 0),
    avgEfficiencyScore: analysisData.length > 0 ? 
      analysisData.reduce((sum: number, item: any) => sum + (item?.costAnalysis?.overallScore || 0), 0) / analysisData.length : 0,
    highRiskProjects: analysisData.filter((item: any) => 
      item?.riskAssessment?.riskLevel === 'high' || item?.riskAssessment?.riskLevel === 'critical'
    ).length,
    costSavingsOpportunities: analysisData.reduce((sum: number, item: any) => {
      const savings = item?.costAnalysis?.insights?.filter((insight: string) => 
        insight.includes('savings') || insight.includes('bulk purchasing')
      ).length || 0;
      return sum + savings;
    }, 0)
  };

  // Category breakdown from cost analysis
  const categoryBreakdown = analysisData.reduce((acc: any[], item: any) => {
    if (item?.costAnalysis?.costByCategory) {
      item.costAnalysis.costByCategory.forEach((category: any) => {
        const existing = acc.find((c: any) => c.category === category.category);
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
    excellent: analysisData.filter((item: any) => item?.costAnalysis?.efficiency === 'excellent').length,
    good: analysisData.filter((item: any) => item?.costAnalysis?.efficiency === 'good').length,
    average: analysisData.filter((item: any) => item?.costAnalysis?.efficiency === 'average').length,
    poor: analysisData.filter((item: any) => item?.costAnalysis?.efficiency === 'poor').length,
  };

  // Risk level distribution
  const riskDistribution = {
    low: analysisData.filter((item: any) => item?.riskAssessment?.riskLevel === 'low').length,
    medium: analysisData.filter((item: any) => item?.riskAssessment?.riskLevel === 'medium').length,
    high: analysisData.filter((item: any) => item?.riskAssessment?.riskLevel === 'high').length,
    critical: analysisData.filter((item: any) => item?.riskAssessment?.riskLevel === 'critical').length,
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
                {projects.map((project: Project) => (
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
            {[1, 2, 3, 4].map((i: number) => (
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
              {/* Project Efficiency Distribution */}
              <Card data-testid="card-efficiency-distribution">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-600" />
                    AI Efficiency Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(efficiencyDistribution).map(([level, count]: [string, number]) => {
                      const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                      const colors = {
                        excellent: 'bg-green-500',
                        good: 'bg-blue-500', 
                        average: 'bg-yellow-500',
                        poor: 'bg-red-500'
                      };
                      
                      return (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${colors[level as keyof typeof colors]}`} />
                            <span className="text-sm font-medium text-slate-700 capitalize">{level}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-20 h-2 bg-slate-200 rounded">
                              <div 
                                className={`h-2 rounded ${colors[level as keyof typeof colors]}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-900 w-12 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment Distribution */}
              <Card data-testid="card-risk-distribution">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-red-600" />
                    AI Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(riskDistribution).map(([level, count]: [string, number]) => {
                      const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                      const colors = {
                        low: 'bg-green-500',
                        medium: 'bg-yellow-500',
                        high: 'bg-orange-500',
                        critical: 'bg-red-500'
                      };
                      
                      return (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${colors[level as keyof typeof colors]}`} />
                            <span className="text-sm font-medium text-slate-700 capitalize">{level} Risk</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-20 h-2 bg-slate-200 rounded">
                              <div 
                                className={`h-2 rounded ${colors[level as keyof typeof colors]}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-900 w-12 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Analysis Table */}
            <Card data-testid="card-project-analysis-table">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-slate-600" />
                    Project Performance Analysis
                  </span>
                  <Button variant="outline" size="sm" data-testid="button-export-analysis">
                    <Download className="w-4 h-4 mr-2" />
                    Export Analysis
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Project</th>
                            <th className="text-left py-2">Total Cost</th>
                            <th className="text-left py-2">Efficiency</th>
                            <th className="text-left py-2">Risk Level</th>
                            <th className="text-left py-2">Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((item: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-slate-50">
                              <td className="py-3">
                                <div>
                                  <p className="font-medium text-slate-900">{item?.project.name}</p>
                                  <p className="text-xs text-slate-500">{item?.project.client}</p>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className="font-medium">
                                  ${(item?.costAnalysis?.totalCost || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">
                                    {item?.costAnalysis?.overallScore || 0}/100
                                  </span>
                                  <Badge 
                                    variant={
                                      item?.costAnalysis?.efficiency === 'excellent' ? 'default' :
                                      item?.costAnalysis?.efficiency === 'good' ? 'secondary' : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {item?.costAnalysis?.efficiency}
                                  </Badge>
                                </div>
                              </td>
                              <td className="py-3">
                                <Badge 
                                  variant={
                                    item?.riskAssessment?.riskLevel === 'low' ? 'default' :
                                    item?.riskAssessment?.riskLevel === 'medium' ? 'secondary' :
                                    item?.riskAssessment?.riskLevel === 'high' ? 'destructive' : 'destructive'
                                  }
                                  className="text-xs capitalize"
                                >
                                  {item?.riskAssessment?.riskLevel}
                                </Badge>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center space-x-1">
                                  {item?.costTrends?.trendDirection === 'increasing' ? (
                                    <TrendingUp className="w-4 h-4 text-red-500" />
                                  ) : item?.costTrends?.trendDirection === 'decreasing' ? (
                                    <TrendingDown className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <div className="w-4 h-4" />
                                  )}
                                  <span className="text-xs text-slate-500 capitalize">
                                    {item?.costTrends?.trendDirection || 'stable'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No analysis data available</h3>
                    <p className="text-slate-600 mb-4">
                      Create projects with takeoff data to see AI-powered cost analysis and insights.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}