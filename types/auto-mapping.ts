export interface Equipment {
  id: string;
  name: string;
  type: string;
  description?: string;
  filename?: string;
  totalPoints?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CxAlloyEquipment {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  serialNumber?: string;
  space?: string;
  location?: string;
  floor?: string;
  status?: string;
  type: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface EquipmentMapping {
  id: string;
  bacnetEquipmentId: string;
  bacnetEquipmentName: string;
  bacnetEquipmentType: string;
  cxalloyEquipmentId: number;
  cxalloyEquipmentName: string;
  cxalloyCategory: string;
  mappingType: 'exact' | 'automatic' | 'manual' | 'suggested';
  confidence: number;
  mappingReason?: string;
  totalBacnetPoints: number;
  mappedPointsCount: number;
  unmappedPointsCount: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  mappingMethod: 'auto' | 'manual' | 'bulk';
}

export interface AutoMappingStats {
  totalBacnet: number;
  totalCxAlloy: number;
  exactMatches: number;
  suggestedMatches: number;
  processingTimeMs: number;
  totalProcessingTimeMs: number;
}

export interface AutoMappingResult {
  exactMappings: EquipmentMapping[];
  suggestedMappings: EquipmentMapping[];
  unmatchedBacnet: Equipment[];
  unmatchedCxAlloy: CxAlloyEquipment[];
  stats: AutoMappingStats;
}