/**
 * Database Service for Unified Templates
 */

import { getDb } from './db-service';
import {
  UnifiedTemplate,
  UnifiedTemplatePoint,
  UnifiedTemplateApplication,
  CreateUnifiedTemplateRequest,
  UpdateUnifiedTemplateRequest
} from '../types/unified-template';
import { nanoid } from 'nanoid';

export class TemplateDbService {
  /**
   * Get all templates
   */
  static async getAllTemplates(): Promise<UnifiedTemplate[]> {
    let db;
    try {
      db = await getDb();
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw new Error('Database connection failed');
    }
    
    try {
      // Get all templates
      const [templates] = await db.execute(
        `SELECT * FROM unified_templates ORDER BY created_at DESC`
      );
      
      // Get points for each template
      const templatesWithPoints = await Promise.all(
        (templates as any[]).map(async (template) => {
          const [points] = await db.execute(
            `SELECT * FROM template_points WHERE template_id = ? ORDER BY display_order, id`,
            [template.id]
          );
          
          return this.mapDbToTemplate(template, points as any[]);
        })
      );
      
      return templatesWithPoints;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    } finally {
      try {
        db.release();
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError);
      }
    }
  }
  
  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<UnifiedTemplate | null> {
    let db;
    try {
      db = await getDb();
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw new Error('Database connection failed');
    }
    
    try {
      const [templates] = await db.execute(
        `SELECT * FROM unified_templates WHERE id = ?`,
        [id]
      );
      
      if ((templates as any[]).length === 0) {
        return null;
      }
      
      const template = (templates as any[])[0];
      
      // Get points for template
      const [points] = await db.execute(
        `SELECT * FROM template_points WHERE template_id = ? ORDER BY display_order, id`,
        [id]
      );
      
      return this.mapDbToTemplate(template, points as any[]);
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    } finally {
      try {
        db.release();
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError);
      }
    }
  }
  
  /**
   * Get templates by equipment type
   */
  static async getTemplatesByEquipmentType(equipmentType: string): Promise<UnifiedTemplate[]> {
    const db = await getDb();
    
    try {
      const [templates] = await db.execute(
        `SELECT * FROM unified_templates WHERE equipment_type = ? ORDER BY is_default DESC, created_at DESC`,
        [equipmentType]
      );
      
      const templatesWithPoints = await Promise.all(
        (templates as any[]).map(async (template) => {
          const [points] = await db.execute(
            `SELECT * FROM template_points WHERE template_id = ? ORDER BY display_order, id`,
            [template.id]
          );
          
          return this.mapDbToTemplate(template, points as any[]);
        })
      );
      
      return templatesWithPoints;
    } catch (error) {
      console.error('Error fetching templates by type:', error);
      throw error;
    }
  }
  
  /**
   * Create a new template
   */
  static async createTemplate(request: CreateUnifiedTemplateRequest): Promise<UnifiedTemplate> {
    let db;
    try {
      db = await getDb();
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw new Error('Database connection failed');
    }
    
    const templateId = nanoid();
    
    try {
      await db.beginTransaction();
      
      // Insert template
      await db.execute(
        `INSERT INTO unified_templates (
          id, name, description, equipment_type, category, vendor, model,
          source_equipment_id, source_equipment_name, source_bacnet_id, source_bacnet_name,
          template_type, is_built_in, is_default, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          request.name,
          request.description || null,
          request.equipmentType,
          request.category || null,
          request.vendor || null,
          request.model || null,
          request.sourceEquipmentId || null,
          request.sourceEquipmentName || null,
          request.sourceBacnetId || null,
          request.sourceBacnetName || null,
          request.templateType,
          false, // is_built_in
          request.isDefault || false,
          'user'
        ]
      );
      
      // Insert points
      for (let i = 0; i < request.points.length; i++) {
        const point = request.points[i];
        const pointId = nanoid();
        const templatePointId = `${templateId}-point-${i}`;
        
        await db.execute(
          `INSERT INTO template_points (
            id, template_id, template_point_id, name, description,
            point_function, object_type, units, required,
            bacnet_cur, bacnet_dis, bacnet_desc, nav_name,
            matching_facet, confidence, haystack_tags, display_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pointId,
            templateId,
            templatePointId,
            point.name,
            point.description || null,
            point.pointFunction,
            point.objectType || null,
            point.units || null,
            point.required !== false, // default to true
            point.bacnetCur || null,
            point.bacnetDis || null,
            point.bacnetDesc || null,
            point.navName || null,
            point.matchingFacet || null,
            point.confidence || 0.8,
            JSON.stringify(point.haystackTags || []),
            i
          ]
        );
      }
      
      await db.commit();
      
      // Return the created template
      const result = await this.getTemplateById(templateId) as UnifiedTemplate;
      return result;
    } catch (error) {
      try {
        await db.rollback();
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      console.error('Error creating template:', error);
      throw error;
    } finally {
      try {
        db.release();
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError);
      }
    }
  }
  
  /**
   * Update an existing template
   */
  static async updateTemplate(id: string, request: UpdateUnifiedTemplateRequest): Promise<UnifiedTemplate> {
    const db = await getDb();
    
    try {
      await db.beginTransaction();
      
      // Update template fields if provided
      const updates: string[] = [];
      const values: any[] = [];
      
      if (request.name !== undefined) {
        updates.push('name = ?');
        values.push(request.name);
      }
      if (request.description !== undefined) {
        updates.push('description = ?');
        values.push(request.description);
      }
      if (request.category !== undefined) {
        updates.push('category = ?');
        values.push(request.category);
      }
      if (request.vendor !== undefined) {
        updates.push('vendor = ?');
        values.push(request.vendor);
      }
      if (request.model !== undefined) {
        updates.push('model = ?');
        values.push(request.model);
      }
      if (request.isDefault !== undefined) {
        updates.push('is_default = ?');
        values.push(request.isDefault);
      }
      
      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        updates.push('updated_by = ?');
        values.push('user');
        values.push(id); // for WHERE clause
        
        await db.execute(
          `UPDATE unified_templates SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
      
      // Update points if provided
      if (request.points) {
        // Delete existing points
        await db.execute(
          `DELETE FROM template_points WHERE template_id = ?`,
          [id]
        );
        
        // Insert new points
        for (let i = 0; i < request.points.length; i++) {
          const point = request.points[i];
          const pointId = nanoid();
          const templatePointId = `${id}-point-${i}`;
          
          await db.execute(
            `INSERT INTO template_points (
              id, template_id, template_point_id, name, description,
              point_function, object_type, units, required,
              bacnet_cur, bacnet_dis, bacnet_desc, nav_name,
              matching_facet, confidence, haystack_tags, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              pointId,
              id,
              templatePointId,
              point.name,
              point.description || null,
              point.pointFunction,
              point.objectType || null,
              point.units || null,
              point.required !== false,
              point.bacnetCur || null,
              point.bacnetDis || null,
              point.bacnetDesc || null,
              point.navName || null,
              point.matchingFacet || null,
              point.confidence || 0.8,
              JSON.stringify(point.haystackTags || []),
              i
            ]
          );
        }
      }
      
      await db.commit();
      
      // Return the updated template
      return await this.getTemplateById(id) as UnifiedTemplate;
    } catch (error) {
      await db.rollback();
      console.error('Error updating template:', error);
      throw error;
    }
  }
  
  /**
   * Delete a template
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    const db = await getDb();
    
    try {
      const [result] = await db.execute(
        `DELETE FROM unified_templates WHERE id = ? AND is_built_in = FALSE`,
        [id]
      );
      
      return (result as any).affectedRows > 0;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
  
  /**
   * Record a template application
   */
  static async recordTemplateApplication(application: UnifiedTemplateApplication): Promise<void> {
    const db = await getDb();
    
    try {
      await db.execute(
        `INSERT INTO template_applications (
          id, template_id, template_name,
          target_equipment_id, target_equipment_name, target_equipment_type,
          applied_points, matching_options, matching_results,
          application_type, is_successful, errors,
          applied_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          application.id || nanoid(),
          application.templateId,
          application.templateName,
          application.targetEquipmentId,
          application.targetEquipmentName,
          application.targetEquipmentType,
          JSON.stringify(application.appliedPoints),
          JSON.stringify(application.matchingOptions),
          JSON.stringify(application.matchingResults),
          application.applicationType,
          application.isSuccessful,
          JSON.stringify(application.errors || []),
          application.appliedBy
        ]
      );
      
      // Update template usage statistics
      await db.execute(
        `UPDATE unified_templates 
         SET usage_count = usage_count + 1,
             success_rate = (success_rate * usage_count + ?) / (usage_count + 1)
         WHERE id = ?`,
        [application.isSuccessful ? 1 : 0, application.templateId]
      );
    } catch (error) {
      console.error('Error recording template application:', error);
      throw error;
    }
  }
  
  /**
   * Get template applications
   */
  static async getTemplateApplications(templateId?: string): Promise<UnifiedTemplateApplication[]> {
    const db = await getDb();
    
    try {
      let query = `SELECT * FROM template_applications`;
      const params: any[] = [];
      
      if (templateId) {
        query += ` WHERE template_id = ?`;
        params.push(templateId);
      }
      
      query += ` ORDER BY applied_at DESC`;
      
      const [applications] = await db.execute(query, params);
      
      return (applications as any[]).map(app => ({
        ...app,
        appliedPoints: JSON.parse(app.applied_points || '[]'),
        matchingOptions: JSON.parse(app.matching_options || '{}'),
        matchingResults: JSON.parse(app.matching_results || '{}'),
        errors: JSON.parse(app.errors || '[]'),
        appliedAt: app.applied_at
      }));
    } catch (error) {
      console.error('Error fetching template applications:', error);
      throw error;
    }
  }
  
  /**
   * Map database row to UnifiedTemplate
   */
  private static mapDbToTemplate(dbTemplate: any, dbPoints: any[]): UnifiedTemplate {
    const points: UnifiedTemplatePoint[] = dbPoints.map(point => ({
      id: point.id,
      templatePointId: point.template_point_id,
      name: point.name,
      description: point.description,
      pointFunction: point.point_function,
      objectType: point.object_type,
      units: point.units,
      required: point.required === 1,
      bacnetCur: point.bacnet_cur,
      bacnetDis: point.bacnet_dis,
      bacnetDesc: point.bacnet_desc,
      navName: point.nav_name,
      matchingFacet: point.matching_facet,
      confidence: parseFloat(point.confidence || 0.8),
      haystackTags: Array.isArray(point.haystack_tags) ? point.haystack_tags : (point.haystack_tags ? JSON.parse(point.haystack_tags) : [])
    }));
    
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      equipmentType: dbTemplate.equipment_type,
      category: dbTemplate.category,
      vendor: dbTemplate.vendor,
      model: dbTemplate.model,
      sourceEquipmentId: dbTemplate.source_equipment_id,
      sourceEquipmentName: dbTemplate.source_equipment_name,
      sourceBacnetId: dbTemplate.source_bacnet_id,
      sourceBacnetName: dbTemplate.source_bacnet_name,
      points,
      templateType: dbTemplate.template_type,
      isBuiltIn: dbTemplate.is_built_in === 1,
      isDefault: dbTemplate.is_default === 1,
      usageCount: dbTemplate.usage_count,
      successRate: parseFloat(dbTemplate.success_rate || 0),
      effectiveness: parseFloat(dbTemplate.effectiveness || 0),
      createdAt: dbTemplate.created_at,
      updatedAt: dbTemplate.updated_at,
      createdBy: dbTemplate.created_by,
      updatedBy: dbTemplate.updated_by
    };
  }
}