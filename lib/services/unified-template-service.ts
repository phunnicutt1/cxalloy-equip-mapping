/**
 * Unified Template Service
 * Handles creation, management, and application of templates using the database
 */

import { nanoid } from 'nanoid';
import {
  UnifiedTemplate,
  UnifiedTemplatePoint,
  UnifiedTemplateApplication,
  CreateUnifiedTemplateRequest,
  BulkMappingConfiguration
} from '../../types/unified-template';
import { Equipment, CxAlloyEquipment } from '../../types/equipment';
import { NormalizedPoint, PointFunction } from '../../types/normalized';
import { BulkMappingPair, TemplateMatchingOptions } from '../../types/template-mapping';

export class UnifiedTemplateService {
  
  /**
   * Get all templates from the API
   */
  static async getTemplates(): Promise<UnifiedTemplate[]> {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch templates');
      }
      
      return data.templates || [];
    } catch (error) {
      console.error('[UnifiedTemplateService] Error fetching templates:', error);
      throw error;
    }
  }
  
  /**
   * Get templates for a specific equipment type
   */
  static async getTemplatesForEquipmentType(equipmentType: string): Promise<UnifiedTemplate[]> {
    try {
      const response = await fetch(`/api/templates?type=${encodeURIComponent(equipmentType)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch templates');
      }
      
      return data.templates || [];
    } catch (error) {
      console.error('[UnifiedTemplateService] Error fetching templates by type:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific template by ID
   */
  static async getTemplateById(id: string): Promise<UnifiedTemplate | null> {
    try {
      const response = await fetch(`/api/templates?id=${encodeURIComponent(id)}`);
      const data = await response.json();
      
      if (!data.success) {
        return null;
      }
      
      return data.template || null;
    } catch (error) {
      console.error('[UnifiedTemplateService] Error fetching template:', error);
      return null;
    }
  }
  
  /**
   * Create a template from tracked points (Equipment Template)
   */
  static async createTemplateFromTrackedPoints(
    equipment: Equipment,
    trackedPoints: NormalizedPoint[],
    templateName: string,
    templateDescription?: string,
    category?: string
  ): Promise<UnifiedTemplate> {
    const request: CreateUnifiedTemplateRequest = {
      name: templateName,
      description: templateDescription,
      equipmentType: equipment.type as any,
      category: category || equipment.vendor,
      sourceBacnetId: equipment.id,
      sourceBacnetName: equipment.name,
      templateType: 'equipment',
      points: trackedPoints.map(point => ({
        name: point.normalizedName || point.originalName,
        description: point.expandedDescription || point.originalDescription || '',
        pointFunction: (point.pointFunction || PointFunction.Sensor) as any,
        objectType: point.objectType as any,
        units: point.units,
        required: true,
        bacnetDis: point.originalName,
        bacnetDesc: point.originalDescription,
        navName: point.normalizedName,
        haystackTags: point.haystackTags?.map(tag => typeof tag === 'string' ? tag : tag.name)
      }))
    };
    
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create template');
    }
    
    return data.template;
  }
  
  /**
   * Create a template from mapped equipment (Mapping Template)
   */
  static async createTemplateFromMappedEquipment(
    cxAlloyEquipment: CxAlloyEquipment,
    bacnetEquipment: Equipment,
    bacnetPoints: NormalizedPoint[],
    templateName?: string,
    templateDescription?: string,
    createdBy: string = 'user'
  ): Promise<UnifiedTemplate> {
    const request: CreateUnifiedTemplateRequest = {
      name: templateName || `${cxAlloyEquipment.name} Template`,
      description: templateDescription || `Template from ${cxAlloyEquipment.name} (${cxAlloyEquipment.type})`,
      equipmentType: cxAlloyEquipment.type as any,
      category: cxAlloyEquipment.vendor,
      sourceEquipmentId: cxAlloyEquipment.id.toString(),
      sourceEquipmentName: cxAlloyEquipment.name,
      sourceBacnetId: bacnetEquipment.id,
      sourceBacnetName: bacnetEquipment.name,
      templateType: 'mapping',
      points: bacnetPoints.map(point => ({
        name: point.normalizedName || point.originalName,
        description: point.expandedDescription || point.originalDescription || '',
        pointFunction: (point.pointFunction || PointFunction.Sensor) as any,
        objectType: point.objectType as any,
        units: point.units,
        required: true,
        bacnetCur: point.objectName || `${point.objectType}${point.objectInstance || ''}`,
        bacnetDis: point.originalName || '',
        bacnetDesc: point.originalDescription || point.expandedDescription || '',
        navName: point.normalizedName || point.originalName || '',
        matchingFacet: 'bacnetDis',
        confidence: point.confidenceScore || 0.8,
        haystackTags: point.haystackTags?.map(tag => typeof tag === 'string' ? tag : tag.name)
      }))
    };
    
    // Add a timeout guard to avoid hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({ success: false, error: 'Invalid JSON from server' }));
      if (!response.ok || !data.success) {
        const message = data?.error || `HTTP ${response.status}`;
        throw new Error(`Template creation failed: ${message}`);
      }
      return data.template;
    } catch (err) {
      // Surface a clearer error to the UI
      const message = err instanceof Error ? err.message : 'Unknown error creating template';
      console.error('[UnifiedTemplateService] createTemplateFromMappedEquipment error:', message);
      throw new Error(message);
    } finally {
      clearTimeout(timeout);
    }
  }
  
  /**
   * Apply a template to target equipment
   */
  static async applyTemplate(
    template: UnifiedTemplate,
    targetEquipment: Equipment,
    targetPoints: NormalizedPoint[],
    options: TemplateMatchingOptions,
    appliedBy: string = 'user'
  ): Promise<UnifiedTemplateApplication> {
    
    console.log(`[UnifiedTemplateService] Applying template "${template.name}" to equipment "${targetEquipment.name}"`);
    console.log(`[UnifiedTemplateService] Template has ${template.points.length} points, equipment has ${targetPoints.length} points`);
    console.log(`[UnifiedTemplateService] Matching options:`, options);
    
    const appliedPoints: any[] = [];
    let totalMatches = 0;
    let totalConfidence = 0;
    let requiredMatches = 0;
    let optionalMatches = 0;
    
    // Match template points to target points
    for (const templatePoint of template.points) {
      console.log(`[UnifiedTemplateService] Matching template point: "${templatePoint.name}" (${options.matchingFacet}: "${templatePoint[options.matchingFacet]}")`);
      const matchedPoint = this.findMatchingPoint(templatePoint, targetPoints, options);
      
      if (matchedPoint) {
        const appliedPoint = {
          pointId: matchedPoint.originalPointId || matchedPoint.originalName,
          templatePointId: templatePoint.templatePointId,
          matched: true,
          confidence: matchedPoint.confidenceScore || 0.7,
          navName: options.copyNavName ? templatePoint.navName : matchedPoint.normalizedName,
          units: options.copyUnits ? templatePoint.units : matchedPoint.units
        };
        
        console.log(`[UnifiedTemplateService] ✓ MATCHED: "${templatePoint.name}" -> "${matchedPoint.originalName}" (confidence: ${appliedPoint.confidence})`);
        
        appliedPoints.push(appliedPoint);
        totalMatches++;
        totalConfidence += appliedPoint.confidence;
        
        if (templatePoint.required) {
          requiredMatches++;
        } else {
          optionalMatches++;
        }
      } else {
        console.log(`[UnifiedTemplateService] ✗ NO MATCH: "${templatePoint.name}" (${options.matchingFacet}: "${templatePoint[options.matchingFacet]}")`);
        if (templatePoint.required) {
          // Add unmatched required point
          appliedPoints.push({
            pointId: '',
            templatePointId: templatePoint.templatePointId,
            matched: false,
            confidence: 0,
            navName: templatePoint.navName,
            units: templatePoint.units
          });
        }
      }
    }
    
    const averageConfidence = totalMatches > 0 ? totalConfidence / totalMatches : 0;
    const isSuccessful = averageConfidence >= options.confidenceThreshold && totalMatches > 0;
    
    console.log(`[UnifiedTemplateService] RESULTS: ${totalMatches} matches, average confidence ${Math.round(averageConfidence * 100)}%, threshold ${Math.round(options.confidenceThreshold * 100)}%, success: ${isSuccessful}`);
    
    const application: UnifiedTemplateApplication = {
      id: nanoid(),
      templateId: template.id,
      templateName: template.name,
      targetEquipmentId: targetEquipment.id,
      targetEquipmentName: targetEquipment.name,
      targetEquipmentType: targetEquipment.type,
      appliedPoints,
      matchingOptions: options,
      matchingResults: {
        totalPoints: targetPoints.length,
        matchedPoints: totalMatches,
        unmatchedPoints: targetPoints.length - totalMatches,
        averageConfidence,
        requiredPointsMatched: requiredMatches,
        optionalPointsMatched: optionalMatches
      },
      applicationType: 'bulk-mapping',
      isSuccessful,
      appliedAt: new Date().toISOString(),
      appliedBy
    };
    
    // Record the application
    await this.recordTemplateApplication(application);
    
    return application;
  }
  
  /**
   * Find matching point in target equipment
   */
  private static findMatchingPoint(
    templatePoint: UnifiedTemplatePoint,
    targetPoints: NormalizedPoint[],
    options: TemplateMatchingOptions
  ): NormalizedPoint | null {
    
    const facetMap = {
      bacnetCur: 'objectName',
      bacnetDis: 'originalName',
      bacnetDesc: 'originalDescription'
    };
    
    const templateValue = templatePoint[options.matchingFacet];
    if (!templateValue) return null;
    
    const searchValue = templateValue.toLowerCase();
    const targetField = facetMap[options.matchingFacet];
    
    // First try exact match
    let matchedPoint = targetPoints.find(point => {
      const pointValue = (point as any)[targetField];
      return pointValue && pointValue.toLowerCase() === searchValue;
    });
    
    // If no exact match and partial matches allowed, try fuzzy matching
    if (!matchedPoint && options.allowPartialMatches) {
      matchedPoint = targetPoints.find(point => {
        const pointValue = (point as any)[targetField];
        return pointValue && (
          pointValue.toLowerCase().includes(searchValue) ||
          searchValue.includes(pointValue.toLowerCase())
        );
      });
    }
    
    return matchedPoint || null;
  }
  
  /**
   * Record a template application
   */
  static async recordTemplateApplication(application: UnifiedTemplateApplication): Promise<void> {
    try {
      console.log('[UnifiedTemplateService] Recording template application:', {
        templateId: application.templateId,
        targetEquipmentId: application.targetEquipmentId
      });
      
      const response = await fetch('/api/templates/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UnifiedTemplateService] HTTP error recording application:', response.status, errorText);
        return; // Don't throw - make this non-blocking
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('[UnifiedTemplateService] Failed to record application:', data.error);
        return; // Don't throw - make this non-blocking
      }
      
      console.log('[UnifiedTemplateService] Successfully recorded template application');
    } catch (error) {
      console.error('[UnifiedTemplateService] Error recording application:', error);
      // Don't throw - make this non-blocking so bulk mapping doesn't hang
    }
  }
  
  /**
   * Get template applications
   */
  static async getTemplateApplications(templateId?: string): Promise<UnifiedTemplateApplication[]> {
    try {
      const url = templateId 
        ? `/api/templates/applications?templateId=${encodeURIComponent(templateId)}`
        : '/api/templates/applications';
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch applications');
      }
      
      return data.applications || [];
    } catch (error) {
      console.error('[UnifiedTemplateService] Error fetching applications:', error);
      return [];
    }
  }
  
  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`/api/templates?id=${encodeURIComponent(templateId)}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete template');
    }
  }
  
  /**
   * Suggest bulk mapping pairings
   */
  static suggestBulkPairings(
    dataSources: Equipment[],
    cxAlloyEquipment: CxAlloyEquipment[]
  ): BulkMappingPair[] {
    const pairs: BulkMappingPair[] = [];
    
    // Name-based matching without equipment type filtering
    dataSources.forEach(source => {
      const matches = cxAlloyEquipment.filter(cx => {
        // Match by name similarity only - don't filter by equipment type
        const sourceName = source.name.toLowerCase();
        const cxName = cx.name.toLowerCase();
        
        return sourceName.includes(cxName) || cxName.includes(sourceName) ||
               this.calculateSimilarity(sourceName, cxName) > 0.6;
      });
      
      matches.forEach(match => {
        pairs.push({
          id: nanoid(),
          sourceDataSourceId: source.id,
          sourceDataSourceName: source.name,
          targetCxAlloyId: parseInt(match.id),
          targetCxAlloyName: match.name,
          confidence: this.calculateSimilarity(source.name.toLowerCase(), match.name.toLowerCase()),
          isManual: false
        });
      });
    });
    
    // Sort by confidence
    return pairs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }
  
  /**
   * Calculate string similarity (simple implementation)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}