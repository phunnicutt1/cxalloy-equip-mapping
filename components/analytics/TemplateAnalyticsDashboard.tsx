'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target, 
  BarChart3, 
  Activity,
  Settings,
  RefreshCw,
  Filter,
  Download,
  Eye,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

// Types for analytics data
interface AnalyticsOverview {
  totalTemplates: number;
  activeTemplates: number;
  totalApplications: number;
  successfulApplications: number;
  averageSuccessRate: number;
  averageConfidence: number;
  topPerformingTemplate: any;
  equipmentTypeBreakdown: Record<string, number>;
  recentActivity: {
    last7Days: number;
    last30Days: number;
  };
}

interface TemplatePerformance {
  templateId: string;
  templateName: string;
  equipmentType: string;
  totalApplications: number;
  successRate: number;
  averageConfidence: number;
  lastUsed: Date | null;
  isDefault: boolean;
  performanceRating: 'excellent' | 'good' | 'fair' | 'poor';
}

interface OptimizationRecommendation {
  id: string;
  configId: string;
  templateName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedImpact: {
    successRateIncrease: number;
    coverageImprovement: number;
    userSatisfactionIncrease: number;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  createdAt: Date;
}

interface TimeSeriesData {
  date: string;
  totalApplications: number;
  successfulApplications: number;
  successRate: number;
  averageConfidence: number;
}

/**
 * Template Analytics Dashboard Component
 * Comprehensive analytics visualization for template effectiveness and optimization
 */
export default function TemplateAnalyticsDashboard() {
  // State management
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [performanceData, setPerformanceData] = useState<TemplatePerformance[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showRecommendationsOnly, setShowRecommendationsOnly] = useState(false);

  // Color schemes for charts
  const COLORS = {
    primary: '#2563eb',
    secondary: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
    info: '#3b82f6'
  };

  const PERFORMANCE_COLORS = {
    excellent: '#22c55e',
    good: '#3b82f6',
    fair: '#f59e0b',
    poor: '#ef4444'
  };

  const PRIORITY_COLORS = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280'
  };

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load overview data
      const overviewResponse = await fetch('/api/analytics?type=overview');
      const overviewResult = await overviewResponse.json();
      
      if (overviewResult.success) {
        setOverview(overviewResult.data);
      }

      // Load performance data
      const performanceResponse = await fetch('/api/analytics?type=template-performance');
      const performanceResult = await performanceResponse.json();
      
      if (performanceResult.success) {
        setPerformanceData(performanceResult.data);
      }

      // Load recommendations
      const recommendationsResponse = await fetch('/api/analytics?type=recommendations&limit=10');
      const recommendationsResult = await recommendationsResponse.json();
      
      if (recommendationsResult.success) {
        setRecommendations(recommendationsResult.data);
      }

      // Load time series data
      const timeSeriesResponse = await fetch(`/api/analytics?type=timeseries&days=${selectedTimeRange}`);
      const timeSeriesResult = await timeSeriesResponse.json();
      
      if (timeSeriesResult.success) {
        setTimeSeriesData(timeSeriesResult.data);
      }

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Handle recommendation actions
  const handleRecommendationAction = async (recommendationId: string, action: 'dismiss' | 'implement') => {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action === 'dismiss' ? 'dismiss-recommendation' : 'implement-recommendation',
          recommendationId
        })
      });

      if (response.ok) {
        // Refresh recommendations
        loadAnalyticsData();
      }
    } catch (err) {
      console.error('Error handling recommendation action:', err);
    }
  };

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + '%';
  };

  // Get performance rating color
  const getPerformanceColor = (rating: string) => {
    return PERFORMANCE_COLORS[rating as keyof typeof PERFORMANCE_COLORS] || COLORS.info;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || COLORS.info;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Loading Analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No analytics data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into template effectiveness and optimization opportunities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadAnalyticsData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              {overview.activeTemplates} active templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(overview.totalApplications)}</div>
            <p className="text-xs text-muted-foreground">
              {overview.recentActivity.last7Days} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(overview.averageSuccessRate)}</div>
            <Progress value={overview.averageSuccessRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(overview.averageConfidence)}</div>
            <Progress value={overview.averageConfidence * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Performance Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Template application success rates and confidence over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name.includes('Rate') ? formatPercentage(value) : value,
                  name
                ]}
              />
              <Area 
                type="monotone" 
                dataKey="successRate" 
                stackId="1" 
                stroke={COLORS.success} 
                fill={COLORS.success} 
                fillOpacity={0.6}
                name="Success Rate"
              />
              <Area 
                type="monotone" 
                dataKey="averageConfidence" 
                stackId="2" 
                stroke={COLORS.info} 
                fill={COLORS.info} 
                fillOpacity={0.6}
                name="Avg Confidence"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Template Performance and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
            <CardDescription>Success rates and usage statistics by template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.slice(0, 8).map((template) => (
                <div key={template.templateId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{template.templateName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.equipmentType}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        style={{ 
                          color: getPerformanceColor(template.performanceRating),
                          borderColor: getPerformanceColor(template.performanceRating)
                        }}
                      >
                        {template.performanceRating}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {template.totalApplications} applications • {formatPercentage(template.successRate)} success
                    </div>
                    <Progress value={template.successRate * 100} className="mt-2" />
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm font-medium">{formatPercentage(template.averageConfidence)}</div>
                    <div className="text-xs text-gray-500">confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Optimization Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
            <CardDescription>Actionable insights to improve template effectiveness</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.slice(0, 5).map((recommendation) => (
                <div key={recommendation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline"
                          style={{ 
                            color: getPriorityColor(recommendation.priority),
                            borderColor: getPriorityColor(recommendation.priority)
                          }}
                        >
                          {recommendation.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {recommendation.category}
                        </Badge>
                      </div>
                      <h4 className="font-medium mt-2">{recommendation.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                    </div>
                    <div className="ml-4 flex flex-col space-y-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRecommendationAction(recommendation.id, 'implement')}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleRecommendationAction(recommendation.id, 'dismiss')}
                      >
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span>+{recommendation.estimatedImpact.successRateIncrease}% success</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="w-3 h-3 text-blue-600" />
                        <span>+{recommendation.estimatedImpact.coverageImprovement}% coverage</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-3 h-3 text-purple-600" />
                        <span>+{recommendation.estimatedImpact.userSatisfactionIncrease}% satisfaction</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Type Distribution</CardTitle>
          <CardDescription>Template usage breakdown by equipment type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(overview.equipmentTypeBreakdown).map(([type, count]) => ({
                  name: type,
                  value: count
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Object.entries(overview.equipmentTypeBreakdown).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common analytics tasks and optimizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <RefreshCw className="w-6 h-6" />
              <span className="font-medium">Recalculate All</span>
              <span className="text-sm text-gray-500">Refresh all analytics data</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Download className="w-6 h-6" />
              <span className="font-medium">Export Report</span>
              <span className="text-sm text-gray-500">Download analytics report</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Settings className="w-6 h-6" />
              <span className="font-medium">Configure</span>
              <span className="text-sm text-gray-500">Analytics settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 