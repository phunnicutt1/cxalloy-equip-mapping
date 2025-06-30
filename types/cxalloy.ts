/**
 * CxAlloy Integration Interfaces
 * For mapping BACnet equipment to CxAlloy project equipment
 */

/**
 * CxAlloy Equipment Status
 */
export enum CxAlloyEquipmentStatus {
  ACTIVE = "active",
  INACTIVE = "inactive", 
  UNDER_CONSTRUCTION = "under_construction",
  COMMISSIONED = "commissioned",
  TESTING = "testing",
  DEFICIENT = "deficient",
  COMPLETE = "complete"
}

/**
 * CxAlloy Project Phase
 */
export enum CxAlloyProjectPhase {
  DESIGN = "design",
  CONSTRUCTION = "construction", 
  COMMISSIONING = "commissioning",
  STARTUP = "startup",
  WARRANTY = "warranty",
  OPERATIONS = "operations"
}

/**
 * CxAlloy Equipment Category
 */
export enum CxAlloyEquipmentCategory {
  HVAC = "hvac",
  ELECTRICAL = "electrical",
  PLUMBING = "plumbing", 
  FIRE_SAFETY = "fire_safety",
  SECURITY = "security",
  BUILDING_AUTOMATION = "building_automation",
  OTHER = "other"
}

/**
 * CxAlloy Equipment
 * Represents equipment in the CxAlloy commissioning platform
 */
export interface CxAlloyEquipment {
  // CxAlloy Identifiers
  id: string;
  equipmentId: string; // CxAlloy equipment ID
  systemId?: string; // Parent system ID
  
  // Equipment Information
  name: string;
  description: string;
  category: CxAlloyEquipmentCategory;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  
  // Project Context
  projectId: string;
  projectName: string;
  phase: CxAlloyProjectPhase;
  
  // Location
  building?: string;
  floor?: string;
  room?: string;
  zone?: string;
  coordinates?: {
    x: number;
    y: number;
    z?: number;
  };
  
  // Status
  status: CxAlloyEquipmentStatus;
  commissioningStatus?: string;
  testingStatus?: string;
  
  // Specifications
  specifications?: Record<string, any>;
  capacity?: string;
  powerRating?: string;
  serviceArea?: string;
  
  // Commissioning Data
  submittals?: CxAlloySubmittal[];
  testResults?: CxAlloyTestResult[];
  issues?: CxAlloyIssue[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  assignedTo?: string;
}

/**
 * Equipment Mapping
 * Links BACnet equipment to CxAlloy equipment
 */
export interface EquipmentMapping {
  id: string;
  
  // Source Equipment (BACnet)
  bacnetEquipmentId: string;
  bacnetEquipmentName: string;
  bacnetEquipmentType: string;
  
  // Target Equipment (CxAlloy)
  cxalloyEquipmentId: string;
  cxalloyEquipmentName: string;
  cxalloyCategory: CxAlloyEquipmentCategory;
  
  // Mapping Details
  mappingType: "exact" | "partial" | "approximate" | "manual";
  confidence: number; // 0-1 confidence score
  mappingReason: string; // Explanation of why this mapping was made
  
  // Point Mapping Summary
  totalBacnetPoints: number;
  mappedPointsCount: number;
  unmappedPointsCount: number;
  
  // Status
  isActive: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User who created the mapping
  mappingMethod: "auto" | "semi_auto" | "manual";
}

/**
 * Point Mapping
 * Maps individual BACnet points to CxAlloy data points
 */
export interface PointMapping {
  id: string;
  equipmentMappingId: string; // Parent equipment mapping
  
  // Source Point (BACnet)
  bacnetPointId: string;
  bacnetPointName: string;
  bacnetObjectType: string;
  
  // Target (CxAlloy - may not have equivalent points)
  cxalloyDataPointId?: string;
  cxalloyParameterName?: string;
  
  // Mapping Classification
  mappingType: "direct" | "calculated" | "reference" | "unmapped";
  purpose: "monitoring" | "control" | "trending" | "alarming" | "commissioning";
  
  // Transformation Rules
  transformationRules?: Array<{
    rule: string;
    description: string;
    formula?: string;
  }>;
  
  // Status
  isActive: boolean;
  confidence: number;
  
  // Metadata
  createdAt: Date;
  mappedBy: string;
}

/**
 * CxAlloy Submittal
 */
export interface CxAlloySubmittal {
  id: string;
  title: string;
  type: string;
  status: "pending" | "approved" | "rejected" | "revision_required";
  submittedAt: Date;
  reviewedAt?: Date;
  approvedBy?: string;
  documents: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

/**
 * CxAlloy Test Result
 */
export interface CxAlloyTestResult {
  id: string;
  testName: string;
  testType: string;
  status: "pass" | "fail" | "incomplete" | "not_applicable";
  executedAt: Date;
  executedBy: string;
  results: Record<string, any>;
  comments?: string;
  attachments?: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * CxAlloy Issue
 */
export interface CxAlloyIssue {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string;
  createdAt: Date;
  dueDate?: Date;
  resolvedAt?: Date;
  category: string;
}

/**
 * CxAlloy Project
 */
export interface CxAlloyProject {
  id: string;
  name: string;
  description: string;
  phase: CxAlloyProjectPhase;
  
  // Project Details
  client: string;
  contractor: string;
  startDate: Date;
  endDate?: Date;
  
  // Location
  address: string;
  city: string;
  state: string;
  country: string;
  
  // Statistics
  totalEquipment: number;
  commissionedEquipment: number;
  pendingEquipment: number;
  
  // Access
  members: Array<{
    userId: string;
    role: string;
    permissions: string[];
  }>;
}

/**
 * Mapping Batch Operation
 * For processing multiple equipment mappings
 */
export interface MappingBatchOperation {
  batchId: string;
  projectId: string;
  
  // Processing Details
  totalEquipment: number;
  processedEquipment: number;
  successfulMappings: number;
  failedMappings: number;
  
  // Configuration
  mappingRules: Array<{
    name: string;
    pattern: string;
    action: string;
  }>;
  
  autoMappingEnabled: boolean;
  confidenceThreshold: number; // Minimum confidence for auto-mapping
  
  // Progress
  startTime: Date;
  endTime?: Date;
  isComplete: boolean;
  
  // Results
  mappings: EquipmentMapping[];
  errors: Array<{
    equipmentId: string;
    error: string;
    timestamp: Date;
  }>;
}

/**
 * CxAlloy API Response
 * Standard response format for CxAlloy API calls
 */
export interface CxAlloyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * CxAlloy Integration Settings
 */
export interface CxAlloyIntegrationSettings {
  // API Configuration
  apiUrl: string;
  apiKey: string;
  apiVersion: string;
  
  // Authentication
  authType: "api_key" | "oauth" | "bearer_token";
  credentials: Record<string, string>;
  
  // Sync Settings
  syncEnabled: boolean;
  syncFrequency: number; // minutes
  lastSyncAt?: Date;
  
  // Mapping Preferences
  autoMappingEnabled: boolean;
  confidenceThreshold: number;
  reviewRequiredThreshold: number;
  
  // Project Settings
  defaultProjectId?: string;
  projectFilters?: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
} 