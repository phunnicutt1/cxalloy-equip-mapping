/**
 * Equipment Configuration Manager
 * Adapted from sophisticated template management system for CxAlloy architecture
 * Provides comprehensive template management, effectiveness tracking, and application workflows
 */

import { nanoid } from 'nanoid';
import { EquipmentType, Equipment } from '@/types/equipment';
import { NormalizedPoint, PointFunction } from '@/types/normalized';
import { BACnetObjectType, PointDataType, PointCategory } from '@/types/point';
import { EquipmentTemplate, PointTemplate, TemplateApplicationResult } from '@/types/template';
import { PointSignature, TemplateMatch, PointSignatureEngine } from '@/lib/engines/point-signature-engine';
import { EquipmentDatabaseService } from '@/lib/database/equipment-db-service';

/**
 * Template Match Result for Equipment
 */
export interface TemplateMatchResult {
  templateId: string;
  equipmentId: string;
  confidence: number;
  matchingPoints: string[];
  missingPoints: PointSignature[];
  extraPoints: string[];
  appliedAt?: Date;
}

/**
 * Template Effectiveness Metrics
 */
export interface TemplateEffectiveness {
  successfulApplications: number;
  failedApplications: number;
  userConfirmations: number;
  userRejections: number;
  averageConfidenceScore: number;
  successRate: number;
}

/**
 * Template User Feedback
 */
export interface TemplateUserFeedback {
  id: string;
  userId?: string;
  feedbackType: 'positive' | 'negative' | 'suggestion';
  message: string;
  timestamp: Date;
  equipmentId?: string;
  suggestedChanges?: Record<string, any>;
}

/**
 * Template Analytics
 */
export interface TemplateAnalytics {
  totalTemplates: number;
  activeTemplates: number;
  totalApplications: number;
  successfulApplications: number;
  averageSuccessRate: number;
  mostUsedTemplateId?: string;
  recentActivity: Array<{
    templateId: string;
    templateName: string;
    action: string;
    timestamp: Date;
    equipmentId?: string;
  }>;
}

/**
 * Equipment Configuration Manager
 * Comprehensive template management system with database persistence
 */
export class EquipmentConfigManager {
  private dbService: EquipmentDatabaseService;
  private signatureEngine: PointSignatureEngine;

  constructor() {
    this.dbService = new EquipmentDatabaseService();
    this.signatureEngine = new PointSignatureEngine();
  }

  /**
   * Create default point configurations for all equipment types
   */
  async createDefaultConfigurations(): Promise<void> {
    console.log('[CONFIG MANAGER] Creating default configurations for all equipment types');

    const defaultConfigs = this.getDefaultConfigurationTemplates();
    
    for (const config of defaultConfigs) {
      try {
        const configId = await this.dbService.createEquipmentPointConfiguration(
          config.equipmentType,
          config.name,
          config.description,
          config.pointSignatures,
          true, // isDefault
          'system',
          config.metadata
        );
        
        console.log(`[CONFIG MANAGER] Created default configuration ${config.name} (${configId}) for ${config.equipmentType}`);
      } catch (error) {
        console.error(`[CONFIG MANAGER] Failed to create default config for ${config.equipmentType}:`, error);
      }
    }
  }

  /**
   * Apply template to equipment with advanced matching
   */
  async applyTemplate(
    equipmentId: string, 
    configId: string, 
    options?: {
      threshold?: number;
      appliedBy?: string;
      isAutomatic?: boolean;
    }
  ): Promise<TemplateApplicationResult> {
    console.log('[CONFIG MANAGER] Applying template', { equipmentId, configId, options });

    try {
      // Get equipment and its points
      const equipment = await this.dbService.getEquipment(equipmentId);
      if (!equipment) {
        throw new Error(`Equipment ${equipmentId} not found`);
      }

      const points = await this.dbService.getPointsByEquipmentId(equipmentId);
      
      // Get template configuration
      const configs = await this.dbService.getEquipmentPointConfigurations();
      const config = configs.find(c => c.id === configId);
      if (!config) {
        throw new Error(`Configuration ${configId} not found`);
      }

      // Perform advanced point matching using signature engine
      const templateMatches = await this.performAdvancedMatching(
        config.pointSignatures,
        points,
        options?.threshold || 0.7
      );

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(templateMatches, config.pointSignatures);

      // Store template application in database
      const applicationId = await this.dbService.applyTemplateToEquipment(
        equipmentId,
        configId,
        templateMatches,
        confidence,
        options?.appliedBy,
        options?.isAutomatic ?? true,
        undefined, // effectivenessRating - will be updated later based on user feedback
        { appliedOptions: options }
      );

      // Update template effectiveness metrics
      await this.updateTemplateEffectiveness(configId, confidence >= (options?.threshold || 0.7), confidence);

      return {
        templateId: configId,
        equipmentId,
        variantUsed: undefined,
        success: confidence >= (options?.threshold || 0.7),
        confidence,
        requiredPointMatches: templateMatches.map(match => ({
          templatePointId: match.pointSignature.id,
          actualPointId: match.matchedPoint?.originalPointId,
          matched: match.exactMatch || match.partialMatch || false,
          confidence: match.confidence,
          reason: match.exactMatch ? 'Exact match' : match.partialMatch ? 'Partial match' : 'No match'
        })),
        optionalPointMatches: [],
        unmappedPoints: points
          .filter(p => !templateMatches.some(m => m.matchedPoint?.originalPointId === p.originalPointId))
          .map(p => ({
            pointId: p.originalPointId,
            pointName: p.originalName,
            reason: 'No matching template signature'
          })),
        requiredPointMatchRate: this.calculateMatchRate(templateMatches, config.pointSignatures, true),
        totalPointMatchRate: this.calculateMatchRate(templateMatches, config.pointSignatures, false),
        normalizationSuccessRate: templateMatches.length > 0 ? templateMatches.filter(m => m.confidence > 0.5).length / templateMatches.length : 0,
        warnings: [],
        errors: [],
        recommendations: this.generateRecommendations(templateMatches, points, config.pointSignatures),
        processingTimeMs: 0,
        rulesApplied: templateMatches.length,
        appliedAt: new Date(),
        appliedBy: options?.appliedBy || 'system',
        isAutomatic: options?.isAutomatic ?? true
      };

    } catch (error) {
      console.error('[CONFIG MANAGER] Failed to apply template:', error);
      throw error;
    }
  }

  /**
   * Create custom template from selected points
   */
  async createCustomTemplate(
    name: string,
    equipmentType: EquipmentType,
    selectedPoints: NormalizedPoint[],
    options?: {
      description?: string;
      createdBy?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    console.log('[CONFIG MANAGER] Creating custom template', { name, equipmentType, pointCount: selectedPoints.length });

    try {
      // Generate point signatures from selected points
      const pointSignatures = await this.generatePointSignaturesFromPoints(selectedPoints);

      // Create configuration in database
      const configId = await this.dbService.createEquipmentPointConfiguration(
        equipmentType,
        name,
        options?.description || `Custom template created from ${selectedPoints.length} points`,
        pointSignatures,
        false, // not default
        options?.createdBy,
        options?.metadata
      );

      console.log(`[CONFIG MANAGER] Created custom template ${name} (${configId})`);
      return configId;

    } catch (error) {
      console.error('[CONFIG MANAGER] Failed to create custom template:', error);
      throw error;
    }
  }

  /**
   * Track template effectiveness with analytics
   */
  async trackTemplateEffectiveness(configId?: string): Promise<TemplateAnalytics> {
    console.log('[CONFIG MANAGER] Tracking template effectiveness', { configId });

    try {
      const effectiveness = await this.dbService.getTemplateEffectiveness(configId);
      
      // Get additional analytics data
      const configurations = await this.dbService.getEquipmentPointConfigurations();
      const applications = await this.dbService.getTemplateApplications();

      const analytics: TemplateAnalytics = {
        totalTemplates: configurations.length,
        activeTemplates: configurations.filter(c => !c.metadata || (c.metadata as any).isActive !== false).length,
        totalApplications: effectiveness.totalApplications,
        successfulApplications: effectiveness.totalApplications * effectiveness.successRate,
        averageSuccessRate: effectiveness.averageEffectiveness,
        mostUsedTemplateId: this.findMostUsedTemplate(configurations),
        recentActivity: effectiveness.recentApplications.map(app => ({
          templateId: configId || '',
          templateName: configurations.find(c => c.id === configId)?.name || 'Unknown',
          action: 'applied',
          timestamp: new Date(app.date),
          equipmentId: undefined
        }))
      };

      return analytics;

    } catch (error) {
      console.error('[CONFIG MANAGER] Failed to track template effectiveness:', error);
      throw error;
    }
  }

  /**
   * Find similar equipment that could use a template
   */
  async findSimilarEquipment(
    templateId: string, 
    threshold: number = 0.8
  ): Promise<Array<{
    equipmentId: string;
    equipmentName: string;
    similarityScore: number;
    matchingPoints: string[];
    confidence: number;
  }>> {
    console.log('[CONFIG MANAGER] Finding similar equipment for template', { templateId, threshold });

    try {
      // Get template configuration
      const configs = await this.dbService.getEquipmentPointConfigurations();
      const config = configs.find(c => c.id === templateId);
      if (!config) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Get all equipment of the same type
      const { equipment } = await this.dbService.getAllEquipment(1000, 0, {
        equipmentType: config.equipmentType
      });

      const similarEquipment = [];

      for (const eq of equipment) {
        const points = await this.dbService.getPointsByEquipmentId(eq.id);
        const matches = await this.performAdvancedMatching(config.pointSignatures, points, threshold);
        
        const similarity = this.calculateSimilarityScore(matches, config.pointSignatures);
        
        if (similarity >= threshold) {
          similarEquipment.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            similarityScore: similarity,
            matchingPoints: matches.filter(m => m.exactMatch || m.partialMatch).map(m => m.matchedPoint?.originalName || ''),
            confidence: this.calculateOverallConfidence(matches, config.pointSignatures)
          });
        }
      }

      return similarEquipment.sort((a, b) => b.similarityScore - a.similarityScore);

    } catch (error) {
      console.error('[CONFIG MANAGER] Failed to find similar equipment:', error);
      throw error;
    }
  }

  /**
   * Get template recommendations for equipment
   */
  async getTemplateRecommendations(
    equipmentId: string,
    threshold: number = 0.7
  ): Promise<Array<{
    templateId: string;
    templateName: string;
    confidence: number;
    reasoning: string;
    expectedMatches: number;
    actualMatches: number;
    matchRate: number;
  }>> {
    console.log('[CONFIG MANAGER] Getting template recommendations', { equipmentId, threshold });

    try {
      const equipment = await this.dbService.getEquipment(equipmentId);
      if (!equipment) {
        throw new Error(`Equipment ${equipmentId} not found`);
      }

      const points = await this.dbService.getPointsByEquipmentId(equipmentId);
      const configs = await this.dbService.getEquipmentPointConfigurations(equipment.type as EquipmentType);

      const recommendations = [];

      for (const config of configs) {
        const matches = await this.performAdvancedMatching(config.pointSignatures, points, threshold);
        const confidence = this.calculateOverallConfidence(matches, config.pointSignatures);
        
        if (confidence >= threshold) {
          const actualMatches = matches.filter(m => m.exactMatch || m.partialMatch).length;
          
          recommendations.push({
            templateId: config.id,
            templateName: config.name,
            confidence,
            reasoning: this.generateRecommendationReasoning(matches, config),
            expectedMatches: config.pointSignatures.filter(sig => sig.isRequired).length,
            actualMatches,
            matchRate: actualMatches / config.pointSignatures.length
          });
        }
      }

      return recommendations.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('[CONFIG MANAGER] Failed to get template recommendations:', error);
      throw error;
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Perform advanced point matching using signature engine
   */
  private async performAdvancedMatching(
    templateSignatures: PointSignature[],
    points: NormalizedPoint[],
    threshold: number
  ): Promise<TemplateMatch[]> {
    const pointSignatures = points.map(p => PointSignatureEngine.generateSignature(p));
    
    // Create a mock template for matching (we'll need to enhance this)
    const mockTemplate: any = {
      id: 'temp',
      name: 'Template',
      equipmentType: 'UNKNOWN',
      requiredPoints: templateSignatures.filter(sig => sig.isRequired),
      optionalPoints: templateSignatures.filter(sig => !sig.isRequired)
    };
    
    return PointSignatureEngine.matchTemplate(points, mockTemplate);
  }

  /**
   * Calculate overall confidence from template matches
   */
  private calculateOverallConfidence(matches: TemplateMatch[], templateSignatures: PointSignature[]): number {
    if (matches.length === 0) return 0;

    const requiredMatches = matches.filter(m => 
      templateSignatures.find(sig => sig.id === m.pointSignature.id)?.isRequired
    );
    
    const requiredCount = templateSignatures.filter(sig => sig.isRequired).length;
    const successfulRequired = requiredMatches.filter(m => m.confidence > 0.7).length;
    
    const requiredScore = requiredCount > 0 ? successfulRequired / requiredCount : 1;
    const overallScore = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    
    return (requiredScore * 0.7) + (overallScore * 0.3);
  }

  /**
   * Calculate match rate for required/all points
   */
  private calculateMatchRate(matches: TemplateMatch[], signatures: PointSignature[], requiredOnly: boolean): number {
    const targetSignatures = requiredOnly ? signatures.filter(sig => sig.isRequired) : signatures;
    if (targetSignatures.length === 0) return 1;

    const successfulMatches = matches.filter(m => {
      const signature = signatures.find(sig => sig.id === m.pointSignature.id);
      const isTarget = requiredOnly ? signature?.isRequired : true;
      return isTarget && (m.exactMatch || m.partialMatch) && m.confidence > 0.5;
    });

    return successfulMatches.length / targetSignatures.length;
  }

  /**
   * Generate recommendations based on matching results
   */
  private generateRecommendations(
    matches: TemplateMatch[],
    points: NormalizedPoint[],
    signatures: PointSignature[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing required points
    const missingRequired = signatures.filter(sig => 
      sig.isRequired && !matches.some(m => m.pointSignature.id === sig.id && (m.exactMatch || m.partialMatch))
    );

    if (missingRequired.length > 0) {
      recommendations.push(`Missing ${missingRequired.length} required points: ${missingRequired.map(s => s.pattern).join(', ')}`);
    }

    // Check for low confidence matches
    const lowConfidenceMatches = matches.filter(m => m.confidence < 0.5 && m.confidence > 0);
    if (lowConfidenceMatches.length > 0) {
      recommendations.push(`${lowConfidenceMatches.length} points have low confidence matches - consider manual review`);
    }

    // Check for unmatched points
    const unmatchedCount = points.length - matches.filter(m => m.exactMatch || m.partialMatch).length;
    if (unmatchedCount > 0) {
      recommendations.push(`${unmatchedCount} points could not be matched to template - consider extending template`);
    }

    return recommendations;
  }

  /**
   * Generate point signatures from normalized points
   */
  private async generatePointSignaturesFromPoints(points: NormalizedPoint[]): Promise<PointSignature[]> {
    return points.map(point => PointSignatureEngine.generateSignature(point));
  }

  /**
   * Update template effectiveness metrics
   */
  private async updateTemplateEffectiveness(configId: string, success: boolean, confidence: number): Promise<void> {
    const updates: any = {};
    
    if (success) {
      updates.successRate = confidence; // This would need more sophisticated calculation in real system
    }
    
    await this.dbService.updateEquipmentPointConfiguration(configId, updates);
  }

  /**
   * Calculate similarity score between matches and signatures
   */
  private calculateSimilarityScore(matches: TemplateMatch[], signatures: PointSignature[]): number {
    if (signatures.length === 0) return 0;

    const successfulMatches = matches.filter(m => (m.exactMatch || m.partialMatch) && m.confidence > 0.5);
    return successfulMatches.length / signatures.length;
  }

  /**
   * Generate reasoning for template recommendation
   */
  private generateRecommendationReasoning(matches: TemplateMatch[], config: any): string {
    const exactMatches = matches.filter(m => m.exactMatch).length;
    const partialMatches = matches.filter(m => m.partialMatch && !m.exactMatch).length;
    
    return `Found ${exactMatches} exact matches and ${partialMatches} partial matches out of ${config.pointSignatures.length} template points`;
  }

  /**
   * Find most used template from configurations
   */
  private findMostUsedTemplate(configurations: any[]): string | undefined {
    if (configurations.length === 0) return undefined;
    
    const mostUsed = configurations.reduce((max, config) => 
      config.usageCount > max.usageCount ? config : max
    );
    
    return mostUsed.id;
  }

  /**
   * Get default configuration templates for all equipment types
   */
  private getDefaultConfigurationTemplates() {
    return [
      {
        equipmentType: EquipmentType.VAV_CONTROLLER,
        name: 'Standard VAV Controller Configuration',
        description: 'Default point configuration for VAV controllers with common control points',
        pointSignatures: [
          {
            id: nanoid(),
            pattern: '*ROOM*TEMP*',
            normalizedPattern: 'room_temp',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['room', 'temperature'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          },
          {
            id: nanoid(),
            pattern: '*DAMPER*POS*',
            normalizedPattern: 'damper_position',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.ANALOG_OUTPUT,
            units: '%',
            keywords: ['damper', 'position'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          },
          {
            id: nanoid(),
            pattern: '*SETPOINT*',
            normalizedPattern: 'temp_setpoint',
            confidence: 0.8,
            specificity: 0.7,
            pointFunction: PointFunction.Setpoint,
            objectType: BACnetObjectType.ANALOG_VALUE,
            units: 'degF',
            keywords: ['setpoint'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          }
        ],
        metadata: { category: 'hvac', isDefault: true }
      },
      {
        equipmentType: EquipmentType.AIR_HANDLER_UNIT,
        name: 'Standard AHU Configuration',
        description: 'Default point configuration for Air Handler Units with fan and temperature control',
        pointSignatures: [
          {
            id: nanoid(),
            pattern: '*SUPPLY*TEMP*',
            normalizedPattern: 'supply_air_temp',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['supply', 'temperature'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          },
          {
            id: nanoid(),
            pattern: '*RETURN*TEMP*',
            normalizedPattern: 'return_air_temp',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['return', 'temperature'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          },
          {
            id: nanoid(),
            pattern: '*FAN*STATUS*',
            normalizedPattern: 'fan_status',
            confidence: 0.8,
            specificity: 0.7,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.BINARY_INPUT,
            keywords: ['fan', 'status'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          }
        ],
        metadata: { category: 'hvac', isDefault: true }
      },
      {
        equipmentType: EquipmentType.EXHAUST_FAN,
        name: 'Standard Exhaust Fan Configuration',
        description: 'Default point configuration for Exhaust Fans with speed and status control',
        pointSignatures: [
          {
            id: nanoid(),
            pattern: '*FAN*STATUS*',
            normalizedPattern: 'fan_status',
            confidence: 0.9,
            specificity: 0.8,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.BINARY_INPUT,
            keywords: ['fan', 'status'],
            isRequired: true,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          },
          {
            id: nanoid(),
            pattern: '*SPEED*',
            normalizedPattern: 'fan_speed',
            confidence: 0.8,
            specificity: 0.7,
            pointFunction: PointFunction.Command,
            objectType: BACnetObjectType.ANALOG_OUTPUT,
            units: '%',
            keywords: ['speed'],
            isRequired: false,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          }
        ],
        metadata: { category: 'hvac', isDefault: true }
      },
      // Generic fallback templates
      {
        equipmentType: EquipmentType.UNKNOWN,
        name: 'Generic Equipment Configuration',
        description: 'Fallback configuration for unclassified equipment with common points',
        pointSignatures: [
          {
            id: nanoid(),
            pattern: '*TEMP*',
            normalizedPattern: 'temperature',
            confidence: 0.6,
            specificity: 0.5,
            pointFunction: PointFunction.Sensor,
            objectType: BACnetObjectType.ANALOG_INPUT,
            units: 'degF',
            keywords: ['temperature'],
            isRequired: false,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          },
          {
            id: nanoid(),
            pattern: '*STATUS*',
            normalizedPattern: 'status',
            confidence: 0.6,
            specificity: 0.5,
            pointFunction: PointFunction.Status,
            objectType: BACnetObjectType.BINARY_INPUT,
            keywords: ['status'],
            isRequired: false,
            matchCount: 0,
            successfulMatches: 0,
            avgConfidence: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'manual' as const
          }
        ],
        metadata: { category: 'generic', isDefault: true }
      }
    ];
  }
} 