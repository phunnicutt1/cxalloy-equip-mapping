/**
 * Central Type Exports
 * Building Automation Equipment Mapping UI Types
 */

// Equipment Types (includes NormalizedPoint, EquipmentTemplate, CxAlloyEquipment, EquipmentMapping)
export * from "./equipment";

// Point Types  
export * from "./point";

// Trio File Types
export * from "./trio";

// Haystack Types
export * from "./haystack";

// Re-export specific types from other modules to avoid conflicts
export type { TrioFile, TrioMetadata } from "./trio";
export type { HaystackTag, HaystackTagSet } from "./haystack";

// ============================================================================
// UTILITY TYPES (using imported types)
// ============================================================================

import type { 
  Equipment, 
  EquipmentGroup, 
  EquipmentClassification,
  EquipmentType,
  EquipmentStatus,
  NormalizedPoint,
  EquipmentTemplate,
  CxAlloyEquipment,
  EquipmentMapping
} from "./equipment";

import type {
  BACnetPoint
} from "./point";

/**
 * Generic API Response Wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId?: string;
}

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * API Request Options
 */
export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

/**
 * Loading States
 */
export enum LoadingState {
  IDLE = "idle",
  LOADING = "loading", 
  SUCCESS = "success",
  ERROR = "error"
}

/**
 * Application State
 */
export interface AppState {
  // UI State
  currentView: "equipment" | "templates" | "settings";
  selectedEquipmentId?: string;
  selectedTemplateId?: string;
  
  // Loading States
  equipmentLoading: LoadingState;
  pointsLoading: LoadingState;
  templatesLoading: LoadingState;
  mappingLoading: LoadingState;
  
  // Error States
  errors: Record<string, string>;
  
  // User Preferences
  preferences: {
    autoApplyTemplates: boolean;
    confidenceThreshold: number;
    showAdvancedOptions: boolean;
    defaultView: "list" | "grid" | "tree";
  };
}

/**
 * Equipment State
 */
export interface EquipmentState {
  // Equipment Data
  equipment: Equipment[];
  selectedEquipment?: Equipment;
  equipmentGroups: EquipmentGroup[];
  
  // Points Data
  points: BACnetPoint[];
  normalizedPoints: NormalizedPoint[];
  selectedPoints: string[];
  
  // Filtering and Search
  filters: {
    equipmentType?: EquipmentType;
    status?: EquipmentStatus;
    searchQuery?: string;
    showMappedOnly?: boolean;
  };
  
  // Statistics
  stats: {
    totalEquipment: number;
    mappedEquipment: number;
    totalPoints: number;
    normalizedPoints: number;
    highConfidencePoints: number;
  };
}

/**
 * Template State
 */
export interface TemplateState {
  // Template Data
  templates: EquipmentTemplate[];
  selectedTemplate?: EquipmentTemplate;
  
  // Template Management
  isCreating: boolean;
  isEditing: boolean;
  editingTemplateId?: string;
}

/**
 * Mapping State
 */
export interface MappingState {
  // CxAlloy Data
  cxalloyEquipment: CxAlloyEquipment[];
  
  // Mappings
  equipmentMappings: EquipmentMapping[];
  
  // Filters
  filters: {
    showMappedOnly?: boolean;
    showUnmappedOnly?: boolean;
    projectFilter?: string;
  };
}

/**
 * File Upload State
 */
export interface FileUploadState {
  // Upload Progress
  uploadProgress: number;
  uploadStatus: "idle" | "uploading" | "processing" | "complete" | "error";
  uploadError?: string;
  
  // File Processing
  files: Array<{
    file: File;
    status: "pending" | "processing" | "complete" | "error";
    result?: any;
    error?: string;
  }>;
  
  // Processing Results
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  
  // Equipment Detection Results
  detectedEquipment: EquipmentClassification[];
  detectionConfidence: number;
}

/**
 * Notification State
 */
export interface NotificationState {
  notifications: Array<{
    id: string;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    autoClose?: boolean;
    duration?: number;
  }>;
}

/**
 * User Preferences
 */
export interface UserPreferences {
  // UI Preferences
  theme: "light" | "dark" | "auto";
  language: string;
  timezone: string;
  
  // Feature Preferences
  autoApplyTemplates: boolean;
  autoNormalizePoints: boolean;
  showConfidenceScores: boolean;
  enableAdvancedFeatures: boolean;
  
  // Default Values
  defaultConfidenceThreshold: number;
  defaultEquipmentView: "list" | "grid" | "tree";
  defaultPointView: "table" | "cards";
  
  // Integration Settings
  cxalloyIntegration: {
    enabled: boolean;
    autoSync: boolean;
    syncFrequency: number;
  };
  
  // Notification Preferences
  notifications: {
    enabled: boolean;
    emailNotifications: boolean;
    processComplete: boolean;
    errorAlerts: boolean;
    weeklyReports: boolean;
  };
}

/**
 * Search Filters
 */
export interface SearchFilters {
  query?: string;
  equipmentTypes?: EquipmentType[];
  statuses?: EquipmentStatus[];
  hasMappings?: boolean;
  confidence?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Export Options
 */
export interface ExportOptions {
  format: "json" | "csv" | "xlsx" | "pdf";
  includePoints: boolean;
  includeNormalization: boolean;
  includeHaystackTags: boolean;
  includeMappings: boolean;
  
  // Filtering
  equipmentIds?: string[];
  pointIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Import Result
 */
export interface ImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  
  warnings: string[];
  
  // Preview Data (for validation before import)
  preview?: {
    equipment: Equipment[];
    points: BACnetPoint[];
    mappings: EquipmentMapping[];
  };
} 