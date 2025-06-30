/**
 * Trio File Format Interfaces
 * Based on Project Haystack trio format specification and sample data analysis
 */

/**
 * Trio Value Types
 * Represents the different data types that can appear in trio files
 */
export type TrioValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | null 
  | TrioRef
  | TrioCoord
  | TrioUnit;

/**
 * Trio Reference (e.g., @site1:equip1)
 */
export interface TrioRef {
  type: "ref";
  id: string;
  display?: string;
}

/**
 * Trio Coordinate (e.g., C(37.797,-122.392))
 */
export interface TrioCoord {
  type: "coord";
  latitude: number;
  longitude: number;
}

/**
 * Trio Unit Value (e.g., 72°F, 1000cfm)
 */
export interface TrioUnit {
  type: "unit";
  value: number;
  unit: string;
}

/**
 * Trio Record
 * Represents a single record in a trio file (separated by ---)
 */
export interface TrioRecord {
  // Core Properties
  id?: string;
  dis?: string; // Display name
  
  // Markers (boolean flags)
  point?: boolean;
  equip?: boolean;
  site?: boolean;
  cmd?: boolean;
  writable?: boolean;
  
  // BACnet Specific Properties  
  bacnetCur?: string; // BACnet current value object reference
  bacnetDesc?: string; // BACnet description
  bacnetWrite?: string; // BACnet write object reference
  bacnetWriteLevel?: number; // BACnet priority level
  
  // Data Properties
  kind?: string; // "Number", "Bool", "String", etc.
  unit?: string; // Units (°F, cfm, %, etc.)
  tz?: string; // Timezone
  
  // Hierarchical Properties
  siteRef?: TrioRef;
  equipRef?: TrioRef;
  pointRef?: TrioRef;
  
  // Additional Properties (flexible for unknown trio properties)
  [key: string]: TrioValue | undefined;
}

/**
 * Trio Section
 * Groups related records together with metadata
 */
export interface TrioSection {
  records: TrioRecord[];
  metadata?: {
    equipmentName?: string;
    equipmentType?: string;
    createdAt?: Date;
    source?: string;
  };
}

/**
 * Complete Trio File
 * Represents the entire parsed trio file structure
 */
export interface TrioFile {
  // File Metadata
  filename: string;
  filepath?: string;
  size: number;
  
  // Equipment Information (derived from filename)
  equipmentName: string;
  equipmentType?: string;
  
  // Parsed Content
  sections: TrioSection[];
  totalRecords: number;
  pointRecords: TrioRecord[]; // Records with point=true
  equipRecords: TrioRecord[]; // Records with equip=true
  
  // Parsing Metadata
  parseSuccess: boolean;
  parseErrors: string[];
  parseWarnings: string[];
  parsedAt: Date;
  parserVersion: string;
  
  // Statistics
  stats: {
    totalLines: number;
    recordCount: number;
    pointCount: number;
    equipmentCount: number;
    emptyLines: number;
    commentLines: number;
  };
}

/**
 * Trio Parse Options
 * Configuration for trio file parsing
 */
export interface TrioParseOptions {
  // Parser Behavior
  strictMode: boolean; // Fail on any parsing errors
  ignoreEmptyLines: boolean;
  ignoreComments: boolean;
  validateReferences: boolean; // Validate ref formats
  
  // Equipment Detection
  autoDetectEquipment: boolean;
  equipmentNameFromFilename: boolean;
  
  // Output Options
  includeRawContent: boolean;
  includeMetadata: boolean;
  generateStatistics: boolean;
  
  // Filtering
  includeOnlyPoints: boolean;
  excludeMarkers?: string[]; // Skip records with these markers
  includeMarkers?: string[]; // Only include records with these markers
}

/**
 * Trio Metadata
 * Metadata about a trio file
 */
export interface TrioMetadata {
  filename: string;
  size: number;
  equipmentName: string;
  equipmentType?: string;
  recordCount: number;
  pointCount: number;
  parsedAt: Date;
  errors: Array<{
    line: number;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
}

/**
 * Trio Parse Result
 * Result of parsing a trio file or content
 */
export interface TrioParseResult {
  success: boolean;
  file?: TrioFile;
  
  // Error Details
  errors: Array<{
    line: number;
    column?: number;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  
  // Performance Metrics
  parseTimeMs: number;
  memoryUsageMB?: number;
  
  // Raw Content (if requested)
  rawContent?: string;
  rawLines?: string[];
}

/**
 * Trio Writer Options
 * Configuration for writing trio files
 */
export interface TrioWriteOptions {
  // Format Options
  indentSize: number;
  useSpaces: boolean;
  recordSeparator: string; // Usually "---"
  lineEnding: string; // "\n" or "\r\n"
  
  // Content Options
  includeMetadata: boolean;
  sortProperties: boolean;
  includeTimestamps: boolean;
  
  // Validation
  validateBeforeWrite: boolean;
  removeEmptyProperties: boolean;
}

/**
 * Trio Batch Processing Status
 * Tracks progress of processing multiple trio files
 */
export interface TrioBatchStatus {
  batchId: string;
  
  // File Processing
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  
  // Content Statistics
  totalRecords: number;
  totalPoints: number;
  totalEquipment: number;
  
  // Progress Tracking
  startTime: Date;
  endTime?: Date;
  isComplete: boolean;
  
  // Results
  files: TrioFile[];
  errors: Array<{
    filename: string;
    error: string;
    timestamp: Date;
  }>;
} 