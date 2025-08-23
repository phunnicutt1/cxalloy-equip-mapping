/**
 * Audit Trail Service
 * Manages tracking and persistence of point edits and equipment mappings
 */

import { nanoid } from 'nanoid';
import { 
  PointEditRecord, 
  EquipmentMappingRecord, 
  AuditTrailSummary, 
  AuditTrailFilters,
  PointEditHistory 
} from '../../types/audit-trail';

export class AuditTrailService {
  private static readonly POINT_EDITS_KEY = 'audit-point-edits';
  private static readonly MAPPING_RECORDS_KEY = 'audit-mapping-records';

  /**
   * Record a point edit
   */
  static async recordPointEdit(
    pointId: string,
    equipmentId: string,
    equipmentName: string,
    changeType: 'navName' | 'units' | 'category' | 'mapping' | 'confidence',
    oldValue: string | number | null,
    newValue: string | number | null,
    source: 'manual' | 'template' | 'auto-mapping' | 'bulk-operation',
    editedBy: string = 'user',
    confidence?: number,
    notes?: string
  ): Promise<PointEditRecord> {
    const editRecord: PointEditRecord = {
      id: nanoid(),
      pointId,
      equipmentId,
      equipmentName,
      changeType,
      oldValue,
      newValue,
      editedAt: new Date(),
      editedBy,
      source,
      confidence,
      notes
    };

    await this.savePointEdit(editRecord);
    return editRecord;
  }

  /**
   * Record an equipment mapping action
   */
  static async recordEquipmentMapping(
    bacnetEquipmentId: string,
    bacnetEquipmentName: string,
    cxalloyEquipmentId: number,
    cxalloyEquipmentName: string,
    actionType: 'created' | 'updated' | 'deleted',
    source: 'manual' | 'template' | 'auto-mapping' | 'bulk-operation',
    mappedBy: string = 'user',
    confidence: number = 0,
    pointMappingCount: number = 0,
    templateId?: string,
    templateName?: string
  ): Promise<EquipmentMappingRecord> {
    const mappingRecord: EquipmentMappingRecord = {
      id: nanoid(),
      bacnetEquipmentId,
      bacnetEquipmentName,
      cxalloyEquipmentId,
      cxalloyEquipmentName,
      actionType,
      mappedAt: new Date(),
      mappedBy,
      source,
      confidence,
      pointMappingCount,
      templateId,
      templateName
    };

    await this.saveMappingRecord(mappingRecord);
    return mappingRecord;
  }

  /**
   * Get point edit history for a specific point
   */
  static async getPointEditHistory(pointId: string): Promise<PointEditHistory | null> {
    try {
      const edits = await this.getPointEdits();
      const pointEdits = edits.filter(edit => edit.pointId === pointId);
      
      if (pointEdits.length === 0) return null;

      const sortedEdits = pointEdits.sort((a, b) => b.editedAt.getTime() - a.editedAt.getTime());
      const latestEdit = sortedEdits[0];

      return {
        pointId,
        pointName: latestEdit.equipmentName, // Use equipment name as fallback
        equipmentName: latestEdit.equipmentName,
        edits: sortedEdits,
        totalEdits: pointEdits.length,
        lastEditedAt: latestEdit.editedAt,
        lastEditedBy: latestEdit.editedBy
      };
    } catch (error) {
      console.error('Error getting point edit history:', error);
      return null;
    }
  }

  /**
   * Get audit trail summary
   */
  static async getAuditTrailSummary(filters?: AuditTrailFilters): Promise<AuditTrailSummary> {
    try {
      let pointEdits = await this.getPointEdits();
      let mappingRecords = await this.getMappingRecords();

      // Apply filters
      if (filters) {
        pointEdits = this.filterPointEdits(pointEdits, filters);
        mappingRecords = this.filterMappingRecords(mappingRecords, filters);
      }

      // Count edits by source
      const editsBySource: Record<string, number> = {};
      pointEdits.forEach(edit => {
        editsBySource[edit.source] = (editsBySource[edit.source] || 0) + 1;
      });

      // Count mappings by source
      const mappingsBySource: Record<string, number> = {};
      mappingRecords.forEach(record => {
        mappingsBySource[record.source] = (mappingsBySource[record.source] || 0) + 1;
      });

      // Get recent activity (last 20 items)
      const allActivity = [
        ...pointEdits.map(edit => ({ ...edit, type: 'edit' as const })),
        ...mappingRecords.map(record => ({ ...record, type: 'mapping' as const }))
      ].sort((a, b) => {
        const aDate = 'editedAt' in a ? a.editedAt : a.mappedAt;
        const bDate = 'editedAt' in b ? b.editedAt : b.mappedAt;
        return bDate.getTime() - aDate.getTime();
      }).slice(0, 20);

      // Get top edited equipment
      const equipmentEditCounts: Record<string, { name: string; count: number }> = {};
      pointEdits.forEach(edit => {
        if (!equipmentEditCounts[edit.equipmentId]) {
          equipmentEditCounts[edit.equipmentId] = {
            name: edit.equipmentName,
            count: 0
          };
        }
        equipmentEditCounts[edit.equipmentId].count++;
      });

      const topEditedEquipment = Object.entries(equipmentEditCounts)
        .map(([equipmentId, data]) => ({
          equipmentId,
          equipmentName: data.name,
          editCount: data.count
        }))
        .sort((a, b) => b.editCount - a.editCount)
        .slice(0, 10);

      return {
        totalEdits: pointEdits.length,
        totalMappings: mappingRecords.length,
        editsBySource,
        mappingsBySource,
        recentActivity: allActivity.map(item => {
          if (item.type === 'edit') {
            const { type, ...edit } = item;
            return edit;
          } else {
            const { type, ...mapping } = item;
            return mapping;
          }
        }),
        topEditedEquipment
      };
    } catch (error) {
      console.error('Error getting audit trail summary:', error);
      return {
        totalEdits: 0,
        totalMappings: 0,
        editsBySource: {},
        mappingsBySource: {},
        recentActivity: [],
        topEditedEquipment: []
      };
    }
  }

  /**
   * Get filtered point edits
   */
  static async getFilteredPointEdits(filters: AuditTrailFilters): Promise<PointEditRecord[]> {
    const edits = await this.getPointEdits();
    return this.filterPointEdits(edits, filters);
  }

  /**
   * Get filtered mapping records
   */
  static async getFilteredMappingRecords(filters: AuditTrailFilters): Promise<EquipmentMappingRecord[]> {
    const records = await this.getMappingRecords();
    return this.filterMappingRecords(records, filters);
  }

  /**
   * Clear all audit trail data
   */
  static async clearAuditTrail(): Promise<void> {
    try {
      localStorage.removeItem(this.POINT_EDITS_KEY);
      localStorage.removeItem(this.MAPPING_RECORDS_KEY);
    } catch (error) {
      console.error('Error clearing audit trail:', error);
      throw error;
    }
  }

  /**
   * Export audit trail data
   */
  static async exportAuditTrail(): Promise<{ pointEdits: PointEditRecord[]; mappingRecords: EquipmentMappingRecord[] }> {
    return {
      pointEdits: await this.getPointEdits(),
      mappingRecords: await this.getMappingRecords()
    };
  }

  // Private helper methods

  private static async savePointEdit(edit: PointEditRecord): Promise<void> {
    try {
      const edits = await this.getPointEdits();
      edits.push(edit);
      localStorage.setItem(this.POINT_EDITS_KEY, JSON.stringify(edits));
    } catch (error) {
      console.error('Error saving point edit:', error);
      throw error;
    }
  }

  private static async saveMappingRecord(record: EquipmentMappingRecord): Promise<void> {
    try {
      const records = await this.getMappingRecords();
      records.push(record);
      localStorage.setItem(this.MAPPING_RECORDS_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving mapping record:', error);
      throw error;
    }
  }

  private static async getPointEdits(): Promise<PointEditRecord[]> {
    try {
      const stored = localStorage.getItem(this.POINT_EDITS_KEY);
      if (!stored) return [];
      
      const edits = JSON.parse(stored);
      // Convert date strings back to Date objects
      return edits.map((edit: any) => ({
        ...edit,
        editedAt: new Date(edit.editedAt)
      }));
    } catch (error) {
      console.error('Error loading point edits:', error);
      return [];
    }
  }

  private static async getMappingRecords(): Promise<EquipmentMappingRecord[]> {
    try {
      const stored = localStorage.getItem(this.MAPPING_RECORDS_KEY);
      if (!stored) return [];
      
      const records = JSON.parse(stored);
      // Convert date strings back to Date objects
      return records.map((record: any) => ({
        ...record,
        mappedAt: new Date(record.mappedAt)
      }));
    } catch (error) {
      console.error('Error loading mapping records:', error);
      return [];
    }
  }

  private static filterPointEdits(edits: PointEditRecord[], filters: AuditTrailFilters): PointEditRecord[] {
    return edits.filter(edit => {
      if (filters.equipmentId && edit.equipmentId !== filters.equipmentId) return false;
      if (filters.changeType && edit.changeType !== filters.changeType) return false;
      if (filters.source && edit.source !== filters.source) return false;
      if (filters.editedBy && edit.editedBy !== filters.editedBy) return false;
      if (filters.dateFrom && edit.editedAt < filters.dateFrom) return false;
      if (filters.dateTo && edit.editedAt > filters.dateTo) return false;
      return true;
    });
  }

  private static filterMappingRecords(records: EquipmentMappingRecord[], filters: AuditTrailFilters): EquipmentMappingRecord[] {
    return records.filter(record => {
      if (filters.equipmentId && record.bacnetEquipmentId !== filters.equipmentId) return false;
      if (filters.source && record.source !== filters.source) return false;
      if (filters.editedBy && record.mappedBy !== filters.editedBy) return false;
      if (filters.dateFrom && record.mappedAt < filters.dateFrom) return false;
      if (filters.dateTo && record.mappedAt > filters.dateTo) return false;
      return true;
    });
  }
}