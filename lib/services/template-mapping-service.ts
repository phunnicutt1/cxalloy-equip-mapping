/**
 * Template-based Mapping Service
 * Handles creation, management, and application of mapping templates
 */

import { nanoid } from 'nanoid';
import { MappingTemplate, PointMapping, TemplateApplication, TemplateMatchingOptions, BulkMappingPair } from '../../types/template-mapping';
import { Equipment, CxAlloyEquipment } from '../../types/equipment';
import { NormalizedPoint } from '../../types/normalized';

export class TemplateMappingService {
  
  /**
   * Create a mapping template from an already mapped CxAlloy equipment
   */
  static async createTemplateFromMappedEquipment(
    cxAlloyEquipment: CxAlloyEquipment,
    bacnetEquipment: Equipment,
    bacnetPoints: NormalizedPoint[],
    templateName?: string,
    templateDescription?: string,
    createdBy: string = 'user'
  ): Promise<MappingTemplate> {
    
    // Extract point mappings from the current state
    const pointMappings: PointMapping[] = bacnetPoints.map(point => ({
      id: nanoid(),
      templatePointId: point.originalPointId || point.originalName,
      bacnetCur: point.objectName || `${point.objectType}${point.objectInstance || ''}`,
      bacnetDis: point.originalName || '',
      bacnetDesc: point.originalDescription || point.expandedDescription || '',
      navName: point.normalizedName || point.originalName || '',
      units: point.units,
      pointFunction: point.category || 'unknown',
      confidence: point.confidenceScore || 0.8,
      matchingFacet: 'bacnetDis' as const // Default to display name matching
    }));

    const template: MappingTemplate = {
      id: nanoid(),
      name: templateName || `${cxAlloyEquipment.name} Template`,
      description: templateDescription || `Auto-generated template from ${cxAlloyEquipment.name} (${cxAlloyEquipment.type})`,
      sourceEquipmentId: cxAlloyEquipment.id.toString(),
      sourceEquipmentName: cxAlloyEquipment.name,
      equipmentType: cxAlloyEquipment.type,
      pointMappings,
      createdAt: new Date(),
      createdBy,
      usageCount: 0,
      successRate: 0,
      isDefault: false
    };

    // Store template (for now, store in localStorage, later can be database)
    await this.saveTemplate(template);
    return template;
  }

  /**
   * Apply a template to target BACnet equipment
   */
  static async applyTemplate(
    template: MappingTemplate,
    targetEquipment: Equipment,
    targetPoints: NormalizedPoint[],
    options: TemplateMatchingOptions,
    appliedBy: string = 'user'
  ): Promise<TemplateApplication> {
    
    const appliedMappings: PointMapping[] = [];
    let totalMatches = 0;
    let totalConfidence = 0;

    // Match template points to target points based on selected facet
    for (const templatePoint of template.pointMappings) {
      const matchedPoint = this.findMatchingPoint(templatePoint, targetPoints, options);
      
      if (matchedPoint) {
        const appliedMapping: PointMapping = {
          ...templatePoint,
          id: nanoid(),
          templatePointId: templatePoint.id,
          // Update with target point data
          bacnetCur: matchedPoint.objectName || `${matchedPoint.objectType}${matchedPoint.objectInstance || ''}`,
          bacnetDis: matchedPoint.originalName || '',
          bacnetDesc: matchedPoint.originalDescription || matchedPoint.expandedDescription || '',
          // Optionally copy template values
          navName: options.copyNavName ? templatePoint.navName : (matchedPoint.normalizedName || matchedPoint.originalName || ''),
          units: options.copyUnits ? templatePoint.units : matchedPoint.units,
          confidence: matchedPoint.confidenceScore || 0.7,
          matchingFacet: options.matchingFacet
        };

        appliedMappings.push(appliedMapping);
        totalMatches++;
        totalConfidence += appliedMapping.confidence;
      }
    }

    const averageConfidence = totalMatches > 0 ? totalConfidence / totalMatches : 0;
    const isSuccessful = averageConfidence >= options.confidenceThreshold && totalMatches > 0;

    const application: TemplateApplication = {
      id: nanoid(),
      templateId: template.id,
      targetEquipmentId: targetEquipment.id,
      targetEquipmentName: targetEquipment.name,
      appliedMappings,
      matchingFacet: options.matchingFacet,
      matchingResults: {
        totalPoints: targetPoints.length,
        matchedPoints: totalMatches,
        unmatchedPoints: targetPoints.length - totalMatches,
        averageConfidence
      },
      appliedAt: new Date(),
      appliedBy,
      isSuccessful
    };

    // Update template usage statistics
    template.usageCount++;
    template.successRate = (template.successRate * (template.usageCount - 1) + (isSuccessful ? 1 : 0)) / template.usageCount;
    await this.saveTemplate(template);

    // Store application record
    await this.saveTemplateApplication(application);

    return application;
  }

  /**
   * Find matching point in target equipment based on selected facet
   */
  private static findMatchingPoint(
    templatePoint: PointMapping,
    targetPoints: NormalizedPoint[],
    options: TemplateMatchingOptions
  ): NormalizedPoint | null {
    
    const searchValue = templatePoint[options.matchingFacet].toLowerCase();
    
    // First, try exact match
    for (const point of targetPoints) {
      let compareValue = '';
      switch (options.matchingFacet) {
        case 'bacnetCur':
          compareValue = (point.objectName || `${point.objectType}${point.objectInstance || ''}`).toLowerCase();
          break;
        case 'bacnetDis':
          compareValue = (point.originalName || '').toLowerCase();
          break;
        case 'bacnetDesc':
          compareValue = (point.originalDescription || point.expandedDescription || '').toLowerCase();
          break;
      }

      if (compareValue === searchValue) {
        return point;
      }
    }

    // If no exact match and partial matches allowed, try fuzzy matching
    if (options.allowPartialMatches) {
      let bestMatch: NormalizedPoint | null = null;
      let bestScore = 0;

      for (const point of targetPoints) {
        let compareValue = '';
        switch (options.matchingFacet) {
          case 'bacnetCur':
            compareValue = (point.objectName || `${point.objectType}${point.objectInstance || ''}`).toLowerCase();
            break;
          case 'bacnetDis':
            compareValue = (point.originalName || '').toLowerCase();
            break;
          case 'bacnetDesc':
            compareValue = (point.originalDescription || point.expandedDescription || '').toLowerCase();
            break;
        }

        const similarity = this.calculateSimilarity(searchValue, compareValue);
        if (similarity > bestScore && similarity >= options.confidenceThreshold) {
          bestScore = similarity;
          bestMatch = point;
        }
      }

      return bestMatch;
    }

    return null;
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple similarity based on common characters and length
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Count common characters
    let common = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        common++;
      }
    }

    return common / longer.length;
  }

  /**
   * Get all available templates
   */
  static async getTemplates(): Promise<MappingTemplate[]> {
    try {
      const stored = localStorage.getItem('mapping-templates');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  /**
   * Get templates for specific equipment type
   */
  static async getTemplatesForEquipmentType(equipmentType: string): Promise<MappingTemplate[]> {
    const allTemplates = await this.getTemplates();
    return allTemplates.filter(template => 
      template.equipmentType.toLowerCase() === equipmentType.toLowerCase()
    );
  }

  /**
   * Save template to storage
   */
  static async saveTemplate(template: MappingTemplate): Promise<void> {
    try {
      const templates = await this.getTemplates();
      const existingIndex = templates.findIndex(t => t.id === template.id);
      
      if (existingIndex >= 0) {
        templates[existingIndex] = template;
      } else {
        templates.push(template);
      }

      localStorage.setItem('mapping-templates', JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      const templates = await this.getTemplates();
      const filtered = templates.filter(t => t.id !== templateId);
      localStorage.setItem('mapping-templates', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Save template application record
   */
  private static async saveTemplateApplication(application: TemplateApplication): Promise<void> {
    try {
      const applications = await this.getTemplateApplications();
      applications.push(application);
      localStorage.setItem('template-applications', JSON.stringify(applications));
    } catch (error) {
      console.error('Error saving template application:', error);
      throw error;
    }
  }

  /**
   * Get template application history
   */
  static async getTemplateApplications(): Promise<TemplateApplication[]> {
    try {
      const stored = localStorage.getItem('template-applications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading template applications:', error);
      return [];
    }
  }

  /**
   * Auto-suggest data source to CxAlloy equipment pairings for bulk operations
   */
  static suggestBulkPairings(
    unmappedDataSources: Equipment[],
    unmappedCxAlloyEquipment: CxAlloyEquipment[]
  ): BulkMappingPair[] {
    const pairs: BulkMappingPair[] = [];

    for (const dataSource of unmappedDataSources) {
      // Find best matching CxAlloy equipment
      let bestMatch: CxAlloyEquipment | null = null;
      let bestScore = 0;

      for (const cxAlloyEq of unmappedCxAlloyEquipment) {
        const nameScore = this.calculateSimilarity(
          dataSource.name.toLowerCase(),
          cxAlloyEq.name.toLowerCase()
        );
        
        // Bonus for matching equipment types
        const typeBonus = dataSource.type.toLowerCase() === cxAlloyEq.type.toLowerCase() ? 0.2 : 0;
        const totalScore = Math.min(1.0, nameScore + typeBonus);

        if (totalScore > bestScore && totalScore >= 0.6) {
          bestScore = totalScore;
          bestMatch = cxAlloyEq;
        }
      }

      if (bestMatch) {
        pairs.push({
          id: nanoid(),
          sourceDataSourceId: dataSource.id,
          sourceDataSourceName: dataSource.name,
          targetCxAlloyId: bestMatch.id,
          targetCxAlloyName: bestMatch.name,
          confidence: bestScore,
          isManual: false
        });
      }
    }

    return pairs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }
}