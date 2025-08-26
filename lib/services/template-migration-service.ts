/**
 * Template Migration Service
 * Migrates templates from the old localStorage system to the new unified database system
 */

import { UnifiedTemplateService } from './unified-template-service';
import { CreateUnifiedTemplateRequest } from '../../types/unified-template';
import { PointFunction } from '../../types/normalized';
import { EquipmentType } from '../../types/equipment';

export class TemplateMigrationService {
  
  /**
   * Migrate all templates from localStorage to database
   */
  static async migrateAllTemplates(): Promise<{ success: number; failed: number; errors: string[] }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        throw new Error('Migration can only run on client side');
      }
      
      // Migrate Equipment Templates (from old API system)
      await this.migrateEquipmentTemplates();
      
      // Migrate Mapping Templates (from localStorage)
      const mappingTemplatesResult = await this.migrateMappingTemplates();
      successCount += mappingTemplatesResult.success;
      failedCount += mappingTemplatesResult.failed;
      errors.push(...mappingTemplatesResult.errors);
      
      console.log(`[TemplateMigrationService] Migration completed: ${successCount} success, ${failedCount} failed`);
      
      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      console.error('[TemplateMigrationService] Migration error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return { success: successCount, failed: failedCount, errors };
    }
  }
  
  /**
   * Migrate Equipment Templates from old in-memory API system
   * These would be lost on server restart, so we migrate built-in ones
   */
  private static async migrateEquipmentTemplates(): Promise<void> {
    console.log('[TemplateMigrationService] Equipment templates migration not needed - handled by database schema');
  }
  
  /**
   * Migrate Mapping Templates from localStorage
   */
  private static async migrateMappingTemplates(): Promise<{ success: number; failed: number; errors: string[] }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    try {
      const storedMappingTemplates = localStorage.getItem('mapping-templates');
      if (!storedMappingTemplates) {
        console.log('[TemplateMigrationService] No mapping templates found in localStorage');
        return { success: 0, failed: 0, errors: [] };
      }
      
      const oldMappingTemplates = JSON.parse(storedMappingTemplates);
      console.log(`[TemplateMigrationService] Found ${oldMappingTemplates.length} mapping templates to migrate`);
      
      for (const oldTemplate of oldMappingTemplates) {
        try {
          const unifiedTemplate = this.convertMappingTemplateToUnified(oldTemplate);
          await UnifiedTemplateService.createTemplate(unifiedTemplate);
          successCount++;
          console.log(`[TemplateMigrationService] Migrated mapping template: ${oldTemplate.name}`);
        } catch (error) {
          failedCount++;
          const errorMsg = `Failed to migrate mapping template ${oldTemplate.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[TemplateMigrationService] ${errorMsg}`);
        }
      }
      
      // Backup old templates and clear localStorage
      if (successCount > 0) {
        const backupKey = `mapping-templates-backup-${Date.now()}`;
        localStorage.setItem(backupKey, storedMappingTemplates);
        localStorage.removeItem('mapping-templates');
        console.log(`[TemplateMigrationService] Backed up old templates to ${backupKey}`);
      }
      
      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      console.error('[TemplateMigrationService] Error migrating mapping templates:', error);
      errors.push(`Mapping template migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: successCount, failed: failedCount, errors };
    }
  }
  
  /**
   * Convert old MappingTemplate to UnifiedTemplate
   */
  private static convertMappingTemplateToUnified(oldTemplate: any): CreateUnifiedTemplateRequest {
    return {
      name: oldTemplate.name || 'Migrated Template',
      description: oldTemplate.description || `Migrated from mapping template: ${oldTemplate.name}`,
      equipmentType: this.normalizeEquipmentType(oldTemplate.equipmentType),
      sourceEquipmentId: oldTemplate.sourceEquipmentId?.toString(),
      sourceEquipmentName: oldTemplate.sourceEquipmentName,
      templateType: 'mapping',
      points: (oldTemplate.pointMappings || []).map((point: any, index: number) => ({
        name: point.navName || point.bacnetDis || `Point ${index + 1}`,
        description: point.bacnetDesc || '',
        pointFunction: this.normalizePointFunction(point.pointFunction),
        objectType: point.bacnetCur?.match(/^[A-Z]+/)?.[0] || undefined,
        units: point.units,
        required: true,
        bacnetCur: point.bacnetCur,
        bacnetDis: point.bacnetDis,
        bacnetDesc: point.bacnetDesc,
        navName: point.navName,
        matchingFacet: point.matchingFacet || 'bacnetDis',
        confidence: point.confidence || 0.8
      })),
      isDefault: oldTemplate.isDefault || false
    };
  }
  
  /**
   * Normalize equipment type to match new enum
   */
  private static normalizeEquipmentType(type: string): EquipmentType {
    if (!type) return EquipmentType.UNKNOWN;
    
    const typeMap: Record<string, EquipmentType> = {
      'VAV': EquipmentType.VAV_CONTROLLER,
      'AHU': EquipmentType.AIR_HANDLER_UNIT,
      'RTU': EquipmentType.RTU_CONTROLLER,
      'Chiller': EquipmentType.CHILLER,
      'Boiler': EquipmentType.BOILER
    };
    
    return typeMap[type] || EquipmentType.UNKNOWN;
  }
  
  /**
   * Normalize point function to match new enum
   */
  private static normalizePointFunction(func: string): PointFunction {
    if (!func) return PointFunction.Sensor;
    
    const funcMap: Record<string, PointFunction> = {
      'sensor': PointFunction.Sensor,
      'command': PointFunction.Command,
      'status': PointFunction.Status,
      'setpoint': PointFunction.Setpoint,
      'alarm': PointFunction.Alarm
    };
    
    return funcMap[func.toLowerCase()] || PointFunction.Sensor;
  }
  
  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    if (typeof window === 'undefined') return false;
    
    const hasMappingTemplates = !!localStorage.getItem('mapping-templates');
    return hasMappingTemplates;
  }
  
  /**
   * Get migration status
   */
  static getMigrationStatus(): {
    needsMigration: boolean;
    mappingTemplatesCount: number;
    hasBackups: boolean;
  } {
    if (typeof window === 'undefined') {
      return { needsMigration: false, mappingTemplatesCount: 0, hasBackups: false };
    }
    
    const mappingTemplates = localStorage.getItem('mapping-templates');
    const mappingTemplatesCount = mappingTemplates ? JSON.parse(mappingTemplates).length : 0;
    
    const hasBackups = Object.keys(localStorage).some(key => 
      key.startsWith('mapping-templates-backup-')
    );
    
    return {
      needsMigration: mappingTemplatesCount > 0,
      mappingTemplatesCount,
      hasBackups
    };
  }
}