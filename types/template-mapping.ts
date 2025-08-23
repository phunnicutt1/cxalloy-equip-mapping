// Template-based mapping system types

export interface PointMapping {
  id: string;
  templatePointId: string;
  bacnetCur: string;        // BACnet object reference (e.g., "AV23", "BI7")
  bacnetDis: string;        // Display name from contractor
  bacnetDesc: string;       // Description from contractor
  navName: string;          // User-defined alias/navigation name
  units?: string;           // Engineering units
  pointFunction: string;    // Point function/category
  confidence: number;       // Matching confidence (0-1)
  matchingFacet: 'bacnetCur' | 'bacnetDis' | 'bacnetDesc'; // Which field was used for matching
}

export interface MappingTemplate {
  id: string;
  name: string;
  description?: string;
  sourceEquipmentId: string;    // CxAlloy equipment ID used as template source
  sourceEquipmentName: string;  // CxAlloy equipment name
  equipmentType: string;        // Equipment type this template applies to
  pointMappings: PointMapping[];
  createdAt: Date;
  createdBy: string;
  usageCount: number;           // How many times this template has been applied
  successRate: number;          // Average success rate of applications (0-1)
  isDefault: boolean;           // Whether this is a default template for the equipment type
}

export interface TemplateApplication {
  id: string;
  templateId: string;
  targetEquipmentId: string;    // BACnet equipment ID where template was applied
  targetEquipmentName: string;  // BACnet equipment name
  appliedMappings: PointMapping[];
  matchingFacet: 'bacnetCur' | 'bacnetDis' | 'bacnetDesc';
  matchingResults: {
    totalPoints: number;
    matchedPoints: number;
    unmatchedPoints: number;
    averageConfidence: number;
  };
  appliedAt: Date;
  appliedBy: string;
  isSuccessful: boolean;
}

export interface TemplateMatchingOptions {
  matchingFacet: 'bacnetCur' | 'bacnetDis' | 'bacnetDesc';
  copyNavName: boolean;         // Whether to copy navName/alias from template
  copyUnits: boolean;           // Whether to copy units from template
  confidenceThreshold: number;  // Minimum confidence required for auto-matching (0-1)
  allowPartialMatches: boolean; // Whether to allow fuzzy/partial matches
}

export interface BulkMappingPair {
  id: string;
  sourceDataSourceId: string;   // BACnet equipment ID
  sourceDataSourceName: string; // BACnet equipment name
  targetCxAlloyId: number;       // CxAlloy equipment ID
  targetCxAlloyName: string;     // CxAlloy equipment name
  confidence?: number;           // Auto-pairing confidence if suggested
  isManual: boolean;            // Whether pairing was manually selected
}

export interface BulkMappingOperation {
  id: string;
  templateId: string;
  templateName: string;
  pairs: BulkMappingPair[];
  options: TemplateMatchingOptions;
  preview?: {
    totalPairs: number;
    expectedMatches: number;
    averageConfidence: number;
  };
  status: 'draft' | 'previewing' | 'applying' | 'completed' | 'failed';
  results?: {
    successfulPairs: number;
    failedPairs: number;
    totalPointsMapped: number;
    errors: string[];
  };
  createdAt: Date;
  createdBy: string;
}