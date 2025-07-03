import { NextRequest, NextResponse } from 'next/server';
import { TemplateAnalytics } from '@/lib/analytics/template-analytics';
import { EquipmentDatabaseService } from '@/lib/database/equipment-db-service';

// Initialize services
const templateAnalytics = new TemplateAnalytics();
const dbService = new EquipmentDatabaseService();

/**
 * GET /api/analytics - Get comprehensive analytics dashboard data
 * 
 * Query parameters:
 * - type: 'dashboard' | 'effectiveness' | 'usage' | 'recommendations' | 'timeseries'
 * - templateId: string (optional, for template-specific analytics)
 * - days: number (optional, for time-series data, default 30)
 * - limit: number (optional, for limiting results)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[ANALYTICS API] Processing analytics request');
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const templateId = searchParams.get('templateId');
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`[ANALYTICS API] Request type: ${type}, templateId: ${templateId}, days: ${days}, limit: ${limit}`);

    switch (type) {
      case 'dashboard':
        // Get comprehensive dashboard data
        const dashboardData = await templateAnalytics.getDashboardData();
        console.log('[ANALYTICS API] Dashboard data generated successfully');
        return NextResponse.json({
          success: true,
          data: dashboardData
        });

      case 'effectiveness':
        if (templateId) {
          // Get effectiveness for specific template
          const effectiveness = await templateAnalytics.calculateEffectiveness(templateId);
          console.log(`[ANALYTICS API] Effectiveness calculated for template ${templateId}`);
          return NextResponse.json({
            success: true,
            data: effectiveness
          });
        } else {
          // Get effectiveness for all templates
          const configs = await dbService.getEquipmentPointConfigurations();
          const allEffectiveness = await Promise.all(
            configs.slice(0, limit).map(config => 
              templateAnalytics.calculateEffectiveness(config.id)
            )
          );
          console.log(`[ANALYTICS API] Effectiveness calculated for ${allEffectiveness.length} templates`);
          return NextResponse.json({
            success: true,
            data: allEffectiveness
          });
        }

      case 'usage':
        // Get usage analytics
        const usageAnalytics = await templateAnalytics.generateUsageAnalytics();
        console.log('[ANALYTICS API] Usage analytics generated successfully');
        return NextResponse.json({
          success: true,
          data: usageAnalytics
        });

      case 'recommendations':
        if (templateId) {
          // Get recommendations for specific template
          const recommendations = await templateAnalytics.generateOptimizationRecommendations(templateId);
          console.log(`[ANALYTICS API] Generated ${recommendations.length} recommendations for template ${templateId}`);
          return NextResponse.json({
            success: true,
            data: recommendations
          });
        } else {
          // Get top recommendations across all templates
          const configs = await dbService.getEquipmentPointConfigurations();
          const allRecommendations = [];
          
          for (const config of configs.slice(0, 5)) { // Limit to top 5 templates
            const recommendations = await templateAnalytics.generateOptimizationRecommendations(config.id);
            allRecommendations.push(...recommendations);
          }
          
          // Sort by priority and take top recommendations
          allRecommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });
          
          console.log(`[ANALYTICS API] Generated ${allRecommendations.length} total recommendations`);
          return NextResponse.json({
            success: true,
            data: allRecommendations.slice(0, limit)
          });
        }

      case 'timeseries':
        // Get time series analytics data
        const timeSeriesData = await dbService.getAnalyticsTimeSeries(days);
        console.log(`[ANALYTICS API] Time series data generated for ${days} days`);
        return NextResponse.json({
          success: true,
          data: timeSeriesData
        });

      case 'overview':
        // Get high-level overview metrics
        const configs = await dbService.getEquipmentPointConfigurations();
        const usageStats = await dbService.getTemplateUsageStats();
        const allApplications = await dbService.getAllTemplateApplications();
        
        const overview = {
          totalTemplates: configs.length,
          activeTemplates: configs.length,
          totalApplications: allApplications.length,
          successfulApplications: allApplications.filter(app => app.success).length,
          averageSuccessRate: allApplications.length > 0 
            ? allApplications.filter(app => app.success).length / allApplications.length 
            : 0,
          averageConfidence: allApplications.length > 0
            ? allApplications.reduce((sum, app) => sum + app.confidence, 0) / allApplications.length
            : 0,
          topPerformingTemplate: usageStats.length > 0 ? usageStats[0] : null,
          equipmentTypeBreakdown: usageStats.reduce((acc, stat) => {
            acc[stat.equipmentType] = (acc[stat.equipmentType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          recentActivity: {
            last7Days: allApplications.filter(app => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(app.appliedAt) >= weekAgo;
            }).length,
            last30Days: allApplications.filter(app => {
              const monthAgo = new Date();
              monthAgo.setDate(monthAgo.getDate() - 30);
              return new Date(app.appliedAt) >= monthAgo;
            }).length
          }
        };
        
        console.log('[ANALYTICS API] Overview metrics generated successfully');
        return NextResponse.json({
          success: true,
          data: overview
        });

      case 'template-performance':
        // Get detailed template performance metrics
        const templateStats = await dbService.getTemplateUsageStats();
        const performanceMetrics = templateStats.map(stat => ({
          templateId: stat.templateId,
          templateName: stat.templateName,
          equipmentType: stat.equipmentType,
          totalApplications: stat.totalApplications,
          successRate: stat.successRate,
          averageConfidence: stat.averageConfidence,
          lastUsed: stat.lastUsed,
          isDefault: stat.isDefault,
          performanceRating: stat.successRate >= 0.9 ? 'excellent' : 
                           stat.successRate >= 0.7 ? 'good' : 
                           stat.successRate >= 0.5 ? 'fair' : 'poor'
        }));
        
        console.log(`[ANALYTICS API] Template performance metrics generated for ${performanceMetrics.length} templates`);
        return NextResponse.json({
          success: true,
          data: performanceMetrics
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid analytics type requested'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[ANALYTICS API] Error processing analytics request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/analytics - Update analytics data or trigger recalculation
 * 
 * Body parameters:
 * - action: 'recalculate' | 'update-effectiveness' | 'dismiss-recommendation'
 * - templateId: string (required for template-specific actions)
 * - effectivenessRating: number (for update-effectiveness)
 * - recommendationId: string (for dismiss-recommendation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, templateId, effectivenessRating, recommendationId } = body;

    console.log(`[ANALYTICS API] Processing POST request - Action: ${action}, Template: ${templateId}`);

    switch (action) {
      case 'recalculate':
        if (templateId) {
          // Recalculate effectiveness for specific template
          const effectiveness = await templateAnalytics.calculateEffectiveness(templateId);
          console.log(`[ANALYTICS API] Recalculated effectiveness for template ${templateId}`);
          return NextResponse.json({
            success: true,
            data: effectiveness
          });
        } else {
          // Recalculate for all templates
          const configs = await dbService.getEquipmentPointConfigurations();
          const results = await Promise.all(
            configs.map(config => templateAnalytics.calculateEffectiveness(config.id))
          );
          console.log(`[ANALYTICS API] Recalculated effectiveness for ${results.length} templates`);
          return NextResponse.json({
            success: true,
            data: results
          });
        }

      case 'update-effectiveness':
        if (!templateId || effectivenessRating === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Template ID and effectiveness rating are required'
          }, { status: 400 });
        }

        // Update effectiveness rating (this would integrate with user feedback system)
        await dbService.updateEquipmentPointConfiguration(templateId, {
          effectivenessScore: effectivenessRating
        });

        console.log(`[ANALYTICS API] Updated effectiveness rating for template ${templateId} to ${effectivenessRating}`);
        return NextResponse.json({
          success: true,
          message: 'Effectiveness rating updated successfully'
        });

      case 'dismiss-recommendation':
        if (!recommendationId) {
          return NextResponse.json({
            success: false,
            error: 'Recommendation ID is required'
          }, { status: 400 });
        }

        // This would update the recommendation status in the database
        // For now, we'll just return success
        console.log(`[ANALYTICS API] Dismissed recommendation ${recommendationId}`);
        return NextResponse.json({
          success: true,
          message: 'Recommendation dismissed successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[ANALYTICS API] Error processing POST request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process analytics request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/analytics - Update analytics configuration or settings
 * 
 * Body parameters:
 * - templateId: string (required)
 * - metadata: Record<string, any> (optional)
 * - settings: Record<string, any> (optional)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, metadata, settings } = body;

    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'Template ID is required'
      }, { status: 400 });
    }

    console.log(`[ANALYTICS API] Updating analytics configuration for template ${templateId}`);

    // Update template metadata with analytics settings
    const updateData: any = {};
    if (metadata) {
      updateData.metadata = metadata;
    }

    await dbService.updateEquipmentPointConfiguration(templateId, updateData);

    console.log(`[ANALYTICS API] Analytics configuration updated for template ${templateId}`);
    return NextResponse.json({
      success: true,
      message: 'Analytics configuration updated successfully'
    });

  } catch (error) {
    console.error('[ANALYTICS API] Error updating analytics configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update analytics configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 