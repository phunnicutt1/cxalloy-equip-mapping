/**
 * Template Analytics Engine
 * Comprehensive analytics system for tracking template effectiveness, usage patterns, 
 * and generating optimization recommendations for improved template quality and coverage
 */

import { EquipmentDatabaseService } from '../database/equipment-db-service';
import { EquipmentConfigManager } from '../managers/equipment-config-manager';
import { PointSignatureEngine } from '../engines/point-signature-engine';
import { EquipmentType } from '@/types/equipment';
import { NormalizedPoint, PointFunction } from '@/types/normalized';
import { BACnetObjectType } from '@/types/point';

/**
 * Template Effectiveness Score
 */
export interface EffectivenessScore {
  configId: string;
  templateName: string;
  equipmentType: EquipmentType;
  
  // Core Metrics
  totalApplications: number;
  successfulApplications: number;
  successRate: number; // 0-1
  averageConfidence: number; // 0-1
  
  // Coverage Analysis
  averagePointCoverage: number; // 0-1 (how many template points matched on average)
  pointCoverageDistribution: {
    excellent: number; // >90% coverage
    good: number; // 70-90% coverage  
    fair: number; // 50-70% coverage
    poor: number; // <50% coverage
  };
  
  // User Interaction
  userConfirmations: number;
  userRejections: number;
  userModifications: number;
  
  // Trend Analysis
  recentPerformance: {
    last7Days: number;
    last30Days: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  
  // Quality Indicators
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number; // Statistical confidence in the metrics
  lastUpdated: Date;
}

/**
 * Template Usage Analytics
 */
export interface UsageAnalytics {
  totalTemplates: number;
  activeTemplates: number;
  
  // Usage Patterns
  mostUsedTemplates: Array<{
    configId: string;
    templateName: string;
    equipmentType: EquipmentType;
    usageCount: number;
    lastUsed: Date;
  }>;
  
  // Equipment Type Distribution
  equipmentTypeDistribution: Record<EquipmentType, {
    templateCount: number;
    applicationCount: number;
    averageSuccessRate: number;
  }>;
  
  // Temporal Patterns
  usageByTimeOfDay: Record<string, number>; // Hour of day -> usage count
  usageByDayOfWeek: Record<string, number>; // Day name -> usage count
  usageByMonth: Record<string, number>; // Month -> usage count
  
  // Performance Insights
  topPerformingTemplates: Array<{
    configId: string;
    templateName: string;
    successRate: number;
    averageConfidence: number;
  }>;
  
  underperformingTemplates: Array<{
    configId: string;
    templateName: string;
    successRate: number;
    issues: string[];
    recommendations: string[];
  }>;
}

/**
 * Optimization Recommendation
 */
export interface OptimizationRecommendation {
  id: string;
  configId: string;
  templateName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'point_signature' | 'coverage' | 'performance' | 'usage' | 'user_feedback';
  
  title: string;
  description: string;
  impact: string; // Expected improvement description
  effort: 'low' | 'medium' | 'high'; // Implementation effort
  
  // Specific Recommendations
  suggestedChanges: {
    addPoints?: Array<{
      pointName: string;
      pointFunction: PointFunction;
      objectType: BACnetObjectType;
      reasoning: string;
    }>;
    removePoints?: Array<{
      pointId: string;
      pointName: string;
      reasoning: string;
    }>;
    modifySignatures?: Array<{
      pointId: string;
      currentSignature: string;
      suggestedSignature: string;
      reasoning: string;
    }>;
    updateMetadata?: Record<string, any>;
  };
  
  // Supporting Data
  evidenceData: {
    missedApplications: number;
    commonlyMissingPoints: string[];
    userFeedbackPatterns: string[];
    performanceMetrics: Record<string, number>;
  };
  
  estimatedImpact: {
    successRateIncrease: number; // Expected % increase
    coverageImprovement: number; // Expected % increase
    userSatisfactionIncrease: number; // Expected % increase
  };
  
  actionItems: Array<{
    action: string;
    priority: number;
    estimatedTime: string;
  }>;
  
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

/**
 * A/B Test Configuration
 */
export interface ABTestConfig {
  id: string;
  templateId: string;
  testName: string;
  description: string;
  
  // Test Variants
  variants: Array<{
    id: string;
    name: string;
    description: string;
    pointSignatures: any[]; // Modified point signatures
    trafficPercentage: number; // 0-100
  }>;
  
  // Test Configuration
  startDate: Date;
  endDate: Date;
  targetSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  
  // Success Metrics
  primaryMetric: 'success_rate' | 'confidence' | 'coverage' | 'user_satisfaction';
  secondaryMetrics: string[];
  
  status: 'draft' | 'running' | 'completed' | 'paused';
  results?: {
    winningVariant: string;
    statisticalSignificance: boolean;
    improvementPercentage: number;
    recommendedAction: string;
  };
}

/**
 * Template Analytics Dashboard Data
 */
export interface AnalyticsDashboardData {
  overview: {
    totalTemplates: number;
    totalApplications: number;
    averageSuccessRate: number;
    topPerformingTemplate: string;
    trendsLastMonth: {
      applicationsChange: number;
      successRateChange: number;
      newTemplatesAdded: number;
    };
  };
  
  effectiveness: EffectivenessScore[];
  usage: UsageAnalytics;
  recommendations: OptimizationRecommendation[];
  abTests: ABTestConfig[];
  
  // Charts Data
  performanceOverTime: Array<{
    date: string;
    successRate: number;
    applications: number;
    confidence: number;
  }>;
  
  equipmentTypeBreakdown: Array<{
    type: EquipmentType;
    templateCount: number;
    successRate: number;
    coverage: number;
  }>;
  
  pointCoverageHeatmap: Array<{
    templateId: string;
    templateName: string;
    pointCoverages: number[];
    averageCoverage: number;
  }>;
}

/**
 * Template Analytics Engine
 * Main class for comprehensive template analytics and optimization
 */
export class TemplateAnalytics {
  private dbService: EquipmentDatabaseService;
  private configManager: EquipmentConfigManager;
  private signatureEngine: PointSignatureEngine;

  constructor() {
    this.dbService = new EquipmentDatabaseService();
    this.configManager = new EquipmentConfigManager();
    this.signatureEngine = new PointSignatureEngine();
  }

  /**
   * Calculate comprehensive effectiveness score for a template
   */
  async calculateEffectiveness(configId: string): Promise<EffectivenessScore> {
    console.log(`[TEMPLATE ANALYTICS] Calculating effectiveness for template ${configId}`);

    try {
      // Get template configuration
      const configs = await this.dbService.getEquipmentPointConfigurations();
      const config = configs.find(c => c.id === configId);
      if (!config) {
        throw new Error(`Template ${configId} not found`);
      }

      // Get all applications for this template
      const applications = await this.dbService.getTemplateApplications(configId);
      const totalApplications = applications.length;
      
      if (totalApplications === 0) {
        return this.createEmptyEffectivenessScore(configId, config.name, config.equipmentType as EquipmentType);
      }

      // Calculate success metrics
      const successfulApplications = applications.filter(app => app.confidenceScore >= 0.7).length;
      const successRate = successfulApplications / totalApplications;
      const averageConfidence = applications.reduce((sum, app) => sum + app.confidenceScore, 0) / totalApplications;

      // Analyze point coverage
      const coverageAnalysis = await this.analyzePointCoverage(applications);
      
      // Analyze user interactions
      const userInteractions = await this.analyzeUserInteractions(configId);
      
      // Calculate trend analysis
      const trendAnalysis = await this.analyzeTrends(configId, applications);
      
      // Determine overall rating
      const overallRating = this.calculateOverallRating(successRate, averageConfidence, coverageAnalysis.averagePointCoverage);

      const effectivenessScore: EffectivenessScore = {
        configId,
        templateName: config.name,
        equipmentType: config.equipmentType as EquipmentType,
        totalApplications,
        successfulApplications,
        successRate,
        averageConfidence,
        averagePointCoverage: coverageAnalysis.averagePointCoverage,
        pointCoverageDistribution: coverageAnalysis.distribution,
        userConfirmations: userInteractions.confirmations,
        userRejections: userInteractions.rejections,
        userModifications: userInteractions.modifications,
        recentPerformance: trendAnalysis,
        overallRating,
        confidence: this.calculateStatisticalConfidence(totalApplications),
        lastUpdated: new Date()
      };

      console.log(`[TEMPLATE ANALYTICS] Effectiveness calculated for ${config.name}: ${Math.round(successRate * 100)}% success rate`);
      return effectivenessScore;

    } catch (error) {
      console.error(`[TEMPLATE ANALYTICS] Error calculating effectiveness for ${configId}:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive usage analytics
   */
  async generateUsageAnalytics(): Promise<UsageAnalytics> {
    console.log('[TEMPLATE ANALYTICS] Generating comprehensive usage analytics');

    try {
      // Get all template configurations
      const configs = await this.dbService.getEquipmentPointConfigurations();
      const totalTemplates = configs.length;
      const activeTemplates = configs.length; // All templates are active

      // Get all template applications
      const allApplications = await this.dbService.getAllTemplateApplications();

      // Calculate most used templates
      const templateUsageCounts = new Map<string, number>();
      const templateLastUsed = new Map<string, Date>();
      
      allApplications.forEach(app => {
        templateUsageCounts.set(app.templateId, (templateUsageCounts.get(app.templateId) || 0) + 1);
        const currentLastUsed = templateLastUsed.get(app.templateId);
        if (!currentLastUsed || app.appliedAt > currentLastUsed) {
          templateLastUsed.set(app.templateId, app.appliedAt);
        }
      });

      const mostUsedTemplates = Array.from(templateUsageCounts.entries())
        .map(([configId, usageCount]) => {
          const config = configs.find(c => c.id === configId);
          return {
            configId,
            templateName: config?.name || 'Unknown',
            equipmentType: (config?.equipmentType as EquipmentType) || EquipmentType.UNKNOWN,
            usageCount,
            lastUsed: templateLastUsed.get(configId) || new Date()
          };
        })
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      // Calculate equipment type distribution
      const equipmentTypeDistribution = await this.calculateEquipmentTypeDistribution(allApplications, configs);
      
      // Calculate temporal patterns
      const temporalPatterns = this.calculateTemporalPatterns(allApplications);
      
      // Find top performing templates
      const topPerformingTemplates = await this.findTopPerformingTemplates(configs, 10);
      
      // Find underperforming templates
      const underperformingTemplates = await this.findUnderperformingTemplates(configs, 5);

      const usageAnalytics: UsageAnalytics = {
        totalTemplates,
        activeTemplates,
        mostUsedTemplates,
        equipmentTypeDistribution,
        usageByTimeOfDay: temporalPatterns.byTimeOfDay,
        usageByDayOfWeek: temporalPatterns.byDayOfWeek,
        usageByMonth: temporalPatterns.byMonth,
        topPerformingTemplates,
        underperformingTemplates
      };

      console.log(`[TEMPLATE ANALYTICS] Usage analytics generated: ${totalTemplates} total templates, ${activeTemplates} active`);
      return usageAnalytics;

    } catch (error) {
      console.error('[TEMPLATE ANALYTICS] Error generating usage analytics:', error);
      throw error;
    }
  }

  /**
   * Generate optimization recommendations for a specific template
   */
  async generateOptimizationRecommendations(configId: string): Promise<OptimizationRecommendation[]> {
    console.log(`[TEMPLATE ANALYTICS] Generating optimization recommendations for template ${configId}`);

    try {
      const recommendations: OptimizationRecommendation[] = [];
      
      // Get template effectiveness data
      const effectiveness = await this.calculateEffectiveness(configId);
      
      // Get template applications for analysis
      const applications = await this.dbService.getTemplateApplicationsForAnalytics(configId);
      
      // Analyze common missing points
      const missingPointsAnalysis = await this.analyzeMissingPoints(applications);
      
      // Analyze low confidence matches
      const lowConfidenceAnalysis = await this.analyzeLowConfidenceMatches(applications);
      
      // Analyze user feedback patterns
      const userFeedbackAnalysis = await this.analyzeUserFeedbackPatterns(configId);

      // Generate specific recommendations based on analysis
      
      // 1. Point Coverage Recommendations
      if (effectiveness.averagePointCoverage < 0.7) {
        recommendations.push(await this.createPointCoverageRecommendation(configId, effectiveness, missingPointsAnalysis));
      }
      
      // 2. Success Rate Recommendations
      if (effectiveness.successRate < 0.8) {
        recommendations.push(await this.createSuccessRateRecommendation(configId, effectiveness, lowConfidenceAnalysis));
      }
      
      // 3. User Experience Recommendations
      if (effectiveness.userRejections > effectiveness.userConfirmations * 0.3) {
        recommendations.push(await this.createUserExperienceRecommendation(configId, effectiveness, userFeedbackAnalysis));
      }
      
      // 4. Performance Optimization Recommendations
      if (effectiveness.recentPerformance.trend === 'declining') {
        recommendations.push(await this.createPerformanceOptimizationRecommendation(configId, effectiveness));
      }
      
      // 5. Point Signature Improvement Recommendations
      if (effectiveness.averageConfidence < 0.75) {
        recommendations.push(await this.createSignatureImprovementRecommendation(configId, effectiveness, applications));
      }

      // Sort recommendations by priority and impact
      recommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      console.log(`[TEMPLATE ANALYTICS] Generated ${recommendations.length} optimization recommendations for template ${configId}`);
      return recommendations;

    } catch (error) {
      console.error(`[TEMPLATE ANALYTICS] Error generating recommendations for ${configId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<AnalyticsDashboardData> {
    console.log('[TEMPLATE ANALYTICS] Generating comprehensive dashboard data');

    try {
      // Get all template configurations
      const configs = await this.dbService.getEquipmentPointConfigurations();
      
      // Calculate overview metrics
      const overview = await this.calculateOverviewMetrics(configs);
      
      // Get effectiveness scores for all templates
      const effectiveness = await Promise.all(
        configs.slice(0, 10).map(config => this.calculateEffectiveness(config.id))
      );
      
      // Generate usage analytics
      const usage = await this.generateUsageAnalytics();
      
      // Generate recommendations for top templates
      const recommendations = await this.generateTopRecommendations(5);
      
      // Get A/B tests (placeholder for now)
      const abTests: ABTestConfig[] = [];
      
      // Generate chart data
      const performanceOverTime = await this.generatePerformanceOverTimeData();
      const equipmentTypeBreakdown = await this.generateEquipmentTypeBreakdownData();
      const pointCoverageHeatmap = await this.generatePointCoverageHeatmapData();

      const dashboardData: AnalyticsDashboardData = {
        overview,
        effectiveness,
        usage,
        recommendations,
        abTests,
        performanceOverTime,
        equipmentTypeBreakdown,
        pointCoverageHeatmap
      };

      console.log('[TEMPLATE ANALYTICS] Dashboard data generated successfully');
      return dashboardData;

    } catch (error) {
      console.error('[TEMPLATE ANALYTICS] Error generating dashboard data:', error);
      throw error;
    }
  }

  // Private helper methods

  private createEmptyEffectivenessScore(configId: string, templateName: string, equipmentType: EquipmentType): EffectivenessScore {
    return {
      configId,
      templateName,
      equipmentType,
      totalApplications: 0,
      successfulApplications: 0,
      successRate: 0,
      averageConfidence: 0,
      averagePointCoverage: 0,
      pointCoverageDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      userConfirmations: 0,
      userRejections: 0,
      userModifications: 0,
      recentPerformance: { last7Days: 0, last30Days: 0, trend: 'stable' },
      overallRating: 'poor',
      confidence: 0,
      lastUpdated: new Date()
    };
  }

  private async analyzePointCoverage(applications: any[]): Promise<{
    averagePointCoverage: number;
    distribution: { excellent: number; good: number; fair: number; poor: number };
  }> {
    // Implementation for point coverage analysis
    const coverages = applications.map(app => app.pointMatchRate || 0);
    const averagePointCoverage = coverages.reduce((sum, coverage) => sum + coverage, 0) / coverages.length || 0;
    
    const distribution = {
      excellent: coverages.filter(c => c > 0.9).length,
      good: coverages.filter(c => c > 0.7 && c <= 0.9).length,
      fair: coverages.filter(c => c > 0.5 && c <= 0.7).length,
      poor: coverages.filter(c => c <= 0.5).length
    };
    
    return { averagePointCoverage, distribution };
  }

  private async analyzeUserInteractions(configId: string): Promise<{
    confirmations: number;
    rejections: number;
    modifications: number;
  }> {
    // Placeholder implementation - would integrate with actual user feedback system
    return {
      confirmations: Math.floor(Math.random() * 20),
      rejections: Math.floor(Math.random() * 5),
      modifications: Math.floor(Math.random() * 10)
    };
  }

  private async analyzeTrends(configId: string, applications: any[]): Promise<{
    last7Days: number;
    last30Days: number;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const last7Days = applications.filter(app => app.appliedAt >= sevenDaysAgo).length;
    const last30Days = applications.filter(app => app.appliedAt >= thirtyDaysAgo).length;
    
    // Simple trend calculation based on recent vs older applications
    const older30Days = applications.filter(app => app.appliedAt < thirtyDaysAgo).length;
    const trend = last30Days > older30Days * 1.1 ? 'improving' : 
                  last30Days < older30Days * 0.9 ? 'declining' : 'stable';
    
    return { last7Days, last30Days, trend };
  }

  private calculateOverallRating(successRate: number, confidence: number, coverage: number): 'excellent' | 'good' | 'fair' | 'poor' {
    const composite = (successRate + confidence + coverage) / 3;
    if (composite >= 0.9) return 'excellent';
    if (composite >= 0.7) return 'good';
    if (composite >= 0.5) return 'fair';
    return 'poor';
  }

  private calculateStatisticalConfidence(sampleSize: number): number {
    // Simple confidence calculation based on sample size
    if (sampleSize >= 100) return 0.95;
    if (sampleSize >= 50) return 0.90;
    if (sampleSize >= 20) return 0.80;
    if (sampleSize >= 10) return 0.70;
    return 0.50;
  }

  private async calculateEquipmentTypeDistribution(applications: any[], configs: any[]): Promise<Record<EquipmentType, any>> {
    const distribution: Record<string, any> = {};
    
    Object.values(EquipmentType).forEach(type => {
      const typeConfigs = configs.filter(c => c.equipmentType === type);
      const typeApplications = applications.filter(app => {
        const config = configs.find(c => c.id === app.templateId);
        return config?.equipmentType === type;
      });
      
      const successfulApplications = typeApplications.filter(app => app.success).length;
      
      distribution[type] = {
        templateCount: typeConfigs.length,
        applicationCount: typeApplications.length,
        averageSuccessRate: typeApplications.length > 0 ? successfulApplications / typeApplications.length : 0
      };
    });
    
    return distribution as Record<EquipmentType, any>;
  }

  private calculateTemporalPatterns(applications: any[]): {
    byTimeOfDay: Record<string, number>;
    byDayOfWeek: Record<string, number>;
    byMonth: Record<string, number>;
  } {
    const byTimeOfDay: Record<string, number> = {};
    const byDayOfWeek: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    
    applications.forEach(app => {
      const date = new Date(app.appliedAt);
      const hour = date.getHours().toString();
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      
      byTimeOfDay[hour] = (byTimeOfDay[hour] || 0) + 1;
      byDayOfWeek[dayOfWeek] = (byDayOfWeek[dayOfWeek] || 0) + 1;
      byMonth[month] = (byMonth[month] || 0) + 1;
    });
    
    return { byTimeOfDay, byDayOfWeek, byMonth };
  }

  private async findTopPerformingTemplates(configs: any[], limit: number): Promise<any[]> {
    // Simplified implementation - would calculate actual performance metrics
    return configs
      .slice(0, limit)
      .map(config => ({
        configId: config.id,
        templateName: config.name,
        successRate: 0.85 + Math.random() * 0.15, // Mock data
        averageConfidence: 0.75 + Math.random() * 0.25 // Mock data
      }))
      .sort((a, b) => b.successRate - a.successRate);
  }

  private async findUnderperformingTemplates(configs: any[], limit: number): Promise<any[]> {
    // Simplified implementation - would identify actual underperforming templates
    return configs
      .slice(0, limit)
      .map(config => ({
        configId: config.id,
        templateName: config.name,
        successRate: Math.random() * 0.6, // Mock low performance data
        issues: ['Low point coverage', 'Inconsistent signatures'],
        recommendations: ['Review point signatures', 'Add missing point types']
      }))
      .sort((a, b) => a.successRate - b.successRate);
  }

  // Additional helper methods for recommendations (simplified implementations)
  private async analyzeMissingPoints(applications: any[]): Promise<any> {
    return { commonMissingPoints: ['temperature_sensor', 'pressure_sensor'] };
  }

  private async analyzeLowConfidenceMatches(applications: any[]): Promise<any> {
    return { lowConfidencePatterns: ['ambiguous_naming', 'vendor_specific_terms'] };
  }

  private async analyzeUserFeedbackPatterns(configId: string): Promise<any> {
    return { commonComplaints: ['missing_points', 'incorrect_classification'] };
  }

  private async createPointCoverageRecommendation(configId: string, effectiveness: EffectivenessScore, analysis: any): Promise<OptimizationRecommendation> {
    return {
      id: `pcr_${configId}_${Date.now()}`,
      configId,
      templateName: effectiveness.templateName,
      priority: 'high',
      category: 'coverage',
      title: 'Improve Point Coverage',
      description: 'Template has low point coverage. Consider adding commonly missing points.',
      impact: `Expected to increase coverage from ${Math.round(effectiveness.averagePointCoverage * 100)}% to ~85%`,
      effort: 'medium',
      suggestedChanges: {
        addPoints: analysis.commonMissingPoints?.map((pointName: string) => ({
          pointName,
          pointFunction: PointFunction.Sensor,
          objectType: BACnetObjectType.ANALOG_INPUT,
          reasoning: `Commonly missing in ${effectiveness.templateName} applications`
        })) || []
      },
      evidenceData: {
        missedApplications: effectiveness.totalApplications - effectiveness.successfulApplications,
        commonlyMissingPoints: analysis.commonMissingPoints || [],
        userFeedbackPatterns: [],
        performanceMetrics: { currentCoverage: effectiveness.averagePointCoverage }
      },
      estimatedImpact: {
        successRateIncrease: 15,
        coverageImprovement: 20,
        userSatisfactionIncrease: 10
      },
      actionItems: [
        { action: 'Analyze missing point patterns', priority: 1, estimatedTime: '2 hours' },
        { action: 'Add high-priority missing points', priority: 2, estimatedTime: '4 hours' },
        { action: 'Test template with new points', priority: 3, estimatedTime: '2 hours' }
      ],
      createdAt: new Date(),
      status: 'pending'
    };
  }

  private async createSuccessRateRecommendation(configId: string, effectiveness: EffectivenessScore, analysis: any): Promise<OptimizationRecommendation> {
    return {
      id: `srr_${configId}_${Date.now()}`,
      configId,
      templateName: effectiveness.templateName,
      priority: 'critical',
      category: 'performance',
      title: 'Improve Success Rate',
      description: 'Template has low success rate. Review point signatures and matching criteria.',
      impact: `Expected to increase success rate from ${Math.round(effectiveness.successRate * 100)}% to ~90%`,
      effort: 'high',
      suggestedChanges: {
        modifySignatures: analysis.lowConfidencePatterns?.map((pattern: string) => ({
          pointId: `pattern_${pattern}`,
          currentSignature: pattern,
          suggestedSignature: `optimized_${pattern}`,
          reasoning: 'Low confidence pattern identified'
        })) || []
      },
      evidenceData: {
        missedApplications: effectiveness.totalApplications - effectiveness.successfulApplications,
        commonlyMissingPoints: [],
        userFeedbackPatterns: analysis.lowConfidencePatterns || [],
        performanceMetrics: { currentSuccessRate: effectiveness.successRate }
      },
      estimatedImpact: {
        successRateIncrease: 25,
        coverageImprovement: 10,
        userSatisfactionIncrease: 20
      },
      actionItems: [
        { action: 'Review failed applications', priority: 1, estimatedTime: '3 hours' },
        { action: 'Optimize point signatures', priority: 2, estimatedTime: '6 hours' },
        { action: 'A/B test improvements', priority: 3, estimatedTime: '4 hours' }
      ],
      createdAt: new Date(),
      status: 'pending'
    };
  }

  private async createUserExperienceRecommendation(configId: string, effectiveness: EffectivenessScore, analysis: any): Promise<OptimizationRecommendation> {
    return {
      id: `uer_${configId}_${Date.now()}`,
      configId,
      templateName: effectiveness.templateName,
      priority: 'medium',
      category: 'user_feedback',
      title: 'Improve User Experience',
      description: 'High user rejection rate indicates UX issues. Review template recommendations.',
      impact: 'Expected to reduce user rejections by 50%',
      effort: 'low',
      suggestedChanges: {
        updateMetadata: {
          description: 'Clearer template description',
          examples: 'Add usage examples'
        }
      },
      evidenceData: {
        missedApplications: 0,
        commonlyMissingPoints: [],
        userFeedbackPatterns: analysis.commonComplaints || [],
        performanceMetrics: { rejectionRate: effectiveness.userRejections / (effectiveness.userConfirmations + effectiveness.userRejections) }
      },
      estimatedImpact: {
        successRateIncrease: 5,
        coverageImprovement: 0,
        userSatisfactionIncrease: 30
      },
      actionItems: [
        { action: 'Review user feedback', priority: 1, estimatedTime: '1 hour' },
        { action: 'Update template metadata', priority: 2, estimatedTime: '2 hours' }
      ],
      createdAt: new Date(),
      status: 'pending'
    };
  }

  private async createPerformanceOptimizationRecommendation(configId: string, effectiveness: EffectivenessScore): Promise<OptimizationRecommendation> {
    return {
      id: `por_${configId}_${Date.now()}`,
      configId,
      templateName: effectiveness.templateName,
      priority: 'high',
      category: 'performance',
      title: 'Address Performance Decline',
      description: 'Template performance is declining. Investigate recent changes and equipment trends.',
      impact: 'Expected to stabilize and improve recent performance',
      effort: 'medium',
      suggestedChanges: {
        updateMetadata: {
          lastReviewed: new Date().toISOString(),
          performanceNotes: 'Declining trend identified'
        }
      },
      evidenceData: {
        missedApplications: effectiveness.totalApplications - effectiveness.successfulApplications,
        commonlyMissingPoints: [],
        userFeedbackPatterns: [],
        performanceMetrics: { 
          last30Days: effectiveness.recentPerformance.last30Days,
          last7Days: effectiveness.recentPerformance.last7Days,
          successRate: effectiveness.successRate
        }
      },
      estimatedImpact: {
        successRateIncrease: 10,
        coverageImprovement: 5,
        userSatisfactionIncrease: 15
      },
      actionItems: [
        { action: 'Analyze performance decline causes', priority: 1, estimatedTime: '3 hours' },
        { action: 'Update template based on findings', priority: 2, estimatedTime: '4 hours' }
      ],
      createdAt: new Date(),
      status: 'pending'
    };
  }

  private async createSignatureImprovementRecommendation(configId: string, effectiveness: EffectivenessScore, applications: any[]): Promise<OptimizationRecommendation> {
    return {
      id: `sir_${configId}_${Date.now()}`,
      configId,
      templateName: effectiveness.templateName,
      priority: 'medium',
      category: 'point_signature',
      title: 'Improve Point Signatures',
      description: 'Low confidence scores suggest point signatures need refinement.',
      impact: `Expected to increase confidence from ${Math.round(effectiveness.averageConfidence * 100)}% to ~85%`,
      effort: 'medium',
      suggestedChanges: {
        modifySignatures: [
          {
            pointId: 'example_point',
            currentSignature: 'temperature',
            suggestedSignature: 'temp|temperature|tmprt',
            reasoning: 'More flexible pattern matching'
          }
        ]
      },
      evidenceData: {
        missedApplications: 0,
        commonlyMissingPoints: [],
        userFeedbackPatterns: [],
        performanceMetrics: { currentConfidence: effectiveness.averageConfidence }
      },
      estimatedImpact: {
        successRateIncrease: 10,
        coverageImprovement: 15,
        userSatisfactionIncrease: 5
      },
      actionItems: [
        { action: 'Analyze low confidence matches', priority: 1, estimatedTime: '2 hours' },
        { action: 'Refine point signatures', priority: 2, estimatedTime: '3 hours' }
      ],
      createdAt: new Date(),
      status: 'pending'
    };
  }

  private async calculateOverviewMetrics(configs: any[]): Promise<any> {
    // Simplified overview calculation
    return {
      totalTemplates: configs.length,
      totalApplications: Math.floor(Math.random() * 1000) + 500,
      averageSuccessRate: 0.78 + Math.random() * 0.2,
      topPerformingTemplate: configs[0]?.name || 'No templates',
      trendsLastMonth: {
        applicationsChange: Math.floor(Math.random() * 40) - 20,
        successRateChange: (Math.random() - 0.5) * 10,
        newTemplatesAdded: Math.floor(Math.random() * 5)
      }
    };
  }

  private async generateTopRecommendations(limit: number): Promise<OptimizationRecommendation[]> {
    // This would generate recommendations across all templates
    return [];
  }

  private async generatePerformanceOverTimeData(): Promise<any[]> {
    // Generate mock time series data
    const data = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 6);
      
      data.push({
        date: date.toISOString().split('T')[0],
        successRate: 0.7 + Math.random() * 0.3,
        applications: Math.floor(Math.random() * 50) + 10,
        confidence: 0.6 + Math.random() * 0.4
      });
    }
    
    return data;
  }

  private async generateEquipmentTypeBreakdownData(): Promise<any[]> {
    return Object.values(EquipmentType).map(type => ({
      type,
      templateCount: Math.floor(Math.random() * 10) + 1,
      successRate: 0.6 + Math.random() * 0.4,
      coverage: 0.5 + Math.random() * 0.5
    }));
  }

  private async generatePointCoverageHeatmapData(): Promise<any[]> {
    // Generate mock heatmap data for point coverage
    return [
      {
        templateId: 'template1',
        templateName: 'AHU Controller',
        pointCoverages: [0.95, 0.87, 0.92, 0.78, 0.89],
        averageCoverage: 0.88
      },
      {
        templateId: 'template2',
        templateName: 'VAV Controller',
        pointCoverages: [0.82, 0.76, 0.91, 0.85, 0.79],
        averageCoverage: 0.83
      }
    ];
  }
} 