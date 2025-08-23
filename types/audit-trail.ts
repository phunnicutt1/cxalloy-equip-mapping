/**
 * Audit Trail Types
 * Tracks changes to point configurations and mappings
 */

export interface PointEditRecord {
  id: string;
  pointId: string;
  equipmentId: string;
  equipmentName: string;
  changeType: 'navName' | 'units' | 'category' | 'mapping' | 'confidence';
  oldValue: string | number | null;
  newValue: string | number | null;
  editedAt: Date;
  editedBy: string;
  source: 'manual' | 'template' | 'auto-mapping' | 'bulk-operation';
  confidence?: number;
  notes?: string;
}

export interface EquipmentMappingRecord {
  id: string;
  bacnetEquipmentId: string;
  bacnetEquipmentName: string;
  cxalloyEquipmentId: number;
  cxalloyEquipmentName: string;
  actionType: 'created' | 'updated' | 'deleted';
  mappedAt: Date;
  mappedBy: string;
  source: 'manual' | 'template' | 'auto-mapping' | 'bulk-operation';
  confidence: number;
  pointMappingCount: number;
  templateId?: string;
  templateName?: string;
}

export interface AuditTrailSummary {
  totalEdits: number;
  totalMappings: number;
  editsBySource: Record<string, number>;
  mappingsBySource: Record<string, number>;
  recentActivity: (PointEditRecord | EquipmentMappingRecord)[];
  topEditedEquipment: Array<{
    equipmentId: string;
    equipmentName: string;
    editCount: number;
  }>;
}

export interface AuditTrailFilters {
  equipmentId?: string;
  changeType?: string;
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  editedBy?: string;
}

export interface PointEditHistory {
  pointId: string;
  pointName: string;
  equipmentName: string;
  edits: PointEditRecord[];
  totalEdits: number;
  lastEditedAt: Date;
  lastEditedBy: string;
}

// Enhanced point data structure with audit tracking
export interface AuditablePoint {
  id: string;
  originalName: string;
  normalizedName?: string;
  units?: string;
  category?: string;
  confidenceScore?: number;
  
  // Audit tracking fields
  editHistory: PointEditRecord[];
  lastEditedAt?: Date;
  lastEditedBy?: string;
  editCount: number;
  
  // Original point data
  objectType: string;
  objectInstance?: number;
  objectName?: string;
  originalDescription?: string;
  expandedDescription?: string;
  value?: any;
  priority?: number;
  reliability?: string;
  statusFlags?: string;
}