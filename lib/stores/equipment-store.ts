import { Equipment } from '../../types/equipment';
import { NormalizedPoint } from '../../types/normalized';
import { equipmentDbService } from '../database/equipment-db-service';

// Legacy in-memory store for backward compatibility and temporary processing
const processingResults = new Map<string, { equipment: Equipment; points: NormalizedPoint[] }>();

/**
 * Store processing results in database
 * This replaces the previous in-memory storage with persistent MySQL storage
 */
export async function storeProcessingResult(
  fileId: string,
  equipment: Equipment,
  points: NormalizedPoint[]
): Promise<void> {
  console.log('[EQUIPMENT STORE] Storing processing result to database', {
    fileId,
    equipmentId: equipment.id,
    pointCount: points.length
  });

  try {
    // Store in database
    await equipmentDbService.storeEquipmentWithPoints(fileId, equipment, points);
    
    // Also store in memory for immediate access during processing
    processingResults.set(fileId, { equipment, points });
    
    console.log('[EQUIPMENT STORE] Processing result stored successfully');
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to store processing result:', error);
    
    // Fallback to in-memory storage if database fails
    processingResults.set(fileId, { equipment, points });
    
    // Re-throw to let caller handle the error
    throw error;
  }
}

/**
 * Get equipment by ID from database
 */
export async function getEquipment(equipmentId: string): Promise<Equipment | null> {
  console.log('[EQUIPMENT STORE] Retrieving equipment from database', { equipmentId });
  
  try {
    return await equipmentDbService.getEquipment(equipmentId);
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to retrieve equipment:', error);
    return null;
  }
}

/**
 * Get all equipment with pagination and filters
 */
export async function getAllEquipment(
  limit = 50,
  offset = 0,
  filters?: {
    equipmentType?: string;
    status?: string;
    searchTerm?: string;
  }
): Promise<{ equipment: Equipment[]; total: number }> {
  console.log('[EQUIPMENT STORE] Retrieving all equipment from database', { limit, offset, filters });
  
  try {
    return await equipmentDbService.getAllEquipment(limit, offset, filters);
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to retrieve equipment list:', error);
    return { equipment: [], total: 0 };
  }
}

/**
 * Get points for specific equipment
 */
export async function getEquipmentPoints(equipmentId: string): Promise<NormalizedPoint[]> {
  console.log('[EQUIPMENT STORE] Retrieving points for equipment', { equipmentId });
  
  try {
    return await equipmentDbService.getPointsByEquipmentId(equipmentId);
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to retrieve equipment points:', error);
    return [];
  }
}

/**
 * Delete equipment and its points
 */
export async function deleteEquipment(equipmentId: string): Promise<void> {
  console.log('[EQUIPMENT STORE] Deleting equipment from database', { equipmentId });
  
  try {
    await equipmentDbService.deleteEquipment(equipmentId);
    
    // Also remove from in-memory cache if exists
    for (const [fileId, result] of processingResults.entries()) {
      if (result.equipment.id === equipmentId) {
        processingResults.delete(fileId);
        break;
      }
    }
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to delete equipment:', error);
    throw error;
  }
}

/**
 * Get processing result by file ID (checks memory first, then database)
 * This is useful for immediate access during file processing
 */
export async function getProcessingResult(fileId: string): Promise<{ equipment: Equipment; points: NormalizedPoint[] } | null> {
  console.log('[EQUIPMENT STORE] Getting processing result', { fileId });
  
  // Check in-memory cache first (for active processing)
  const memoryResult = processingResults.get(fileId);
  if (memoryResult) {
    console.log('[EQUIPMENT STORE] Found result in memory cache');
    return memoryResult;
  }
  
  // Search database for equipment by file ID
  try {
    const { equipment } = await equipmentDbService.getAllEquipment(1, 0, { searchTerm: fileId });
    
    if (equipment.length > 0) {
      const equipmentItem = equipment[0];
      const points = await equipmentDbService.getPointsByEquipmentId(equipmentItem.id);
      
      console.log('[EQUIPMENT STORE] Found result in database');
      return { equipment: equipmentItem, points };
    }
    
    console.log('[EQUIPMENT STORE] No result found for file ID');
    return null;
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to retrieve processing result:', error);
    return null;
  }
}

/**
 * Get database statistics
 */
export async function getStorageStatistics(): Promise<{
  totalEquipment: number;
  totalPoints: number;
  equipmentByType: { [key: string]: number };
  pointsByCategory: { [key: string]: number };
  recentActivity: { date: string; equipment: number; points: number }[];
}> {
  console.log('[EQUIPMENT STORE] Getting storage statistics');
  
  try {
    return await equipmentDbService.getStatistics();
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to get statistics:', error);
    return {
      totalEquipment: 0,
      totalPoints: 0,
      equipmentByType: {},
      pointsByCategory: {},
      recentActivity: []
    };
  }
}

/**
 * Create a new mapping session
 */
export async function createMappingSession(sessionName: string): Promise<string> {
  console.log('[EQUIPMENT STORE] Creating mapping session', { sessionName });
  
  try {
    return await equipmentDbService.createMappingSession(sessionName);
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to create mapping session:', error);
    throw error;
  }
}

/**
 * Update mapping session with progress
 */
export async function updateMappingSession(
  sessionId: string,
  updates: {
    processedFiles?: number;
    totalEquipment?: number;
    totalPoints?: number;
    status?: 'processing' | 'completed' | 'failed';
  }
): Promise<void> {
  console.log('[EQUIPMENT STORE] Updating mapping session', { sessionId, updates });
  
  try {
    await equipmentDbService.updateMappingSession(sessionId, updates);
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to update mapping session:', error);
    throw error;
  }
}

/**
 * Clear in-memory processing cache (useful for cleanup)
 */
export function clearProcessingCache(): void {
  console.log('[EQUIPMENT STORE] Clearing in-memory processing cache', {
    itemsCleared: processingResults.size
  });
  
  processingResults.clear();
}

/**
 * Update equipment in database
 */
export async function updateEquipment(equipmentId: string, updates: Partial<Equipment>): Promise<void> {
  console.log('[EQUIPMENT STORE] Updating equipment in database', { equipmentId, updates });
  
  try {
    // Get current equipment
    const current = await equipmentDbService.getEquipment(equipmentId);
    if (!current) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    // Merge updates
    const updated = { ...current, ...updates };
    
    // Store updated equipment (this will update existing record)
    const points = await equipmentDbService.getPointsByEquipmentId(equipmentId);
    await equipmentDbService.storeEquipmentWithPoints(equipmentId, updated, points);
    
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to update equipment:', error);
    throw error;
  }
}

/**
 * Check if equipment exists in database
 */
export async function equipmentExists(equipmentId: string): Promise<boolean> {
  console.log('[EQUIPMENT STORE] Checking if equipment exists', { equipmentId });
  
  try {
    const equipment = await equipmentDbService.getEquipment(equipmentId);
    return equipment !== null;
  } catch (error) {
    console.error('[EQUIPMENT STORE] Failed to check equipment existence:', error);
    return false;
  }
}

/**
 * Get in-memory cache status (for debugging)
 */
export function getCacheStatus(): {
  inMemoryItems: number;
  fileIds: string[];
} {
  return {
    inMemoryItems: processingResults.size,
    fileIds: Array.from(processingResults.keys())
  };
} 