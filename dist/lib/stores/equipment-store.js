"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeProcessingResult = storeProcessingResult;
exports.getEquipment = getEquipment;
exports.getAllEquipment = getAllEquipment;
exports.getEquipmentPoints = getEquipmentPoints;
exports.deleteEquipment = deleteEquipment;
exports.getProcessingResult = getProcessingResult;
exports.getStorageStatistics = getStorageStatistics;
exports.createMappingSession = createMappingSession;
exports.updateMappingSession = updateMappingSession;
exports.clearProcessingCache = clearProcessingCache;
exports.updateEquipment = updateEquipment;
exports.equipmentExists = equipmentExists;
exports.getCacheStatus = getCacheStatus;
const equipment_db_service_1 = require("../database/equipment-db-service");
// Legacy in-memory store for backward compatibility and temporary processing
const processingResults = new Map();
/**
 * Store processing results in database
 * This replaces the previous in-memory storage with persistent MySQL storage
 */
async function storeProcessingResult(fileId, equipment, points) {
    console.log('[EQUIPMENT STORE] Storing processing result to database', {
        fileId,
        equipmentId: equipment.id,
        pointCount: points.length
    });
    try {
        // Store in database
        await equipment_db_service_1.equipmentDbService.storeEquipmentWithPoints(fileId, equipment, points);
        // Also store in memory for immediate access during processing
        processingResults.set(fileId, { equipment, points });
        console.log('[EQUIPMENT STORE] Processing result stored successfully');
    }
    catch (error) {
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
async function getEquipment(equipmentId) {
    console.log('[EQUIPMENT STORE] Retrieving equipment from database', { equipmentId });
    try {
        return await equipment_db_service_1.equipmentDbService.getEquipment(equipmentId);
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to retrieve equipment:', error);
        return null;
    }
}
/**
 * Get all equipment with pagination and filters
 */
async function getAllEquipment(limit = 50, offset = 0, filters) {
    console.log('[EQUIPMENT STORE] Retrieving all equipment from database', { limit, offset, filters });
    try {
        return await equipment_db_service_1.equipmentDbService.getAllEquipment(limit, offset, filters);
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to retrieve equipment list:', error);
        return { equipment: [], total: 0 };
    }
}
/**
 * Get points for specific equipment
 */
async function getEquipmentPoints(equipmentId) {
    console.log('[EQUIPMENT STORE] Retrieving points for equipment', { equipmentId });
    try {
        return await equipment_db_service_1.equipmentDbService.getPointsByEquipmentId(equipmentId);
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to retrieve equipment points:', error);
        return [];
    }
}
/**
 * Delete equipment and its points
 */
async function deleteEquipment(equipmentId) {
    console.log('[EQUIPMENT STORE] Deleting equipment from database', { equipmentId });
    try {
        await equipment_db_service_1.equipmentDbService.deleteEquipment(equipmentId);
        // Also remove from in-memory cache if exists
        for (const [fileId, result] of processingResults.entries()) {
            if (result.equipment.id === equipmentId) {
                processingResults.delete(fileId);
                break;
            }
        }
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to delete equipment:', error);
        throw error;
    }
}
/**
 * Get processing result by file ID (checks memory first, then database)
 * This is useful for immediate access during file processing
 */
async function getProcessingResult(fileId) {
    console.log('[EQUIPMENT STORE] Getting processing result', { fileId });
    // Check in-memory cache first (for active processing)
    const memoryResult = processingResults.get(fileId);
    if (memoryResult) {
        console.log('[EQUIPMENT STORE] Found result in memory cache');
        return memoryResult;
    }
    // Search database for equipment by file ID
    try {
        const { equipment } = await equipment_db_service_1.equipmentDbService.getAllEquipment(1, 0, { searchTerm: fileId });
        if (equipment.length > 0) {
            const equipmentItem = equipment[0];
            const points = await equipment_db_service_1.equipmentDbService.getPointsByEquipmentId(equipmentItem.id);
            console.log('[EQUIPMENT STORE] Found result in database');
            return { equipment: equipmentItem, points };
        }
        console.log('[EQUIPMENT STORE] No result found for file ID');
        return null;
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to retrieve processing result:', error);
        return null;
    }
}
/**
 * Get database statistics
 */
async function getStorageStatistics() {
    console.log('[EQUIPMENT STORE] Getting storage statistics');
    try {
        return await equipment_db_service_1.equipmentDbService.getStatistics();
    }
    catch (error) {
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
async function createMappingSession(sessionName) {
    console.log('[EQUIPMENT STORE] Creating mapping session', { sessionName });
    try {
        return await equipment_db_service_1.equipmentDbService.createMappingSession(sessionName);
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to create mapping session:', error);
        throw error;
    }
}
/**
 * Update mapping session with progress
 */
async function updateMappingSession(sessionId, updates) {
    console.log('[EQUIPMENT STORE] Updating mapping session', { sessionId, updates });
    try {
        await equipment_db_service_1.equipmentDbService.updateMappingSession(sessionId, updates);
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to update mapping session:', error);
        throw error;
    }
}
/**
 * Clear in-memory processing cache (useful for cleanup)
 */
function clearProcessingCache() {
    console.log('[EQUIPMENT STORE] Clearing in-memory processing cache', {
        itemsCleared: processingResults.size
    });
    processingResults.clear();
}
/**
 * Update equipment in database
 */
async function updateEquipment(equipmentId, updates) {
    console.log('[EQUIPMENT STORE] Updating equipment in database', { equipmentId, updates });
    try {
        // Get current equipment
        const current = await equipment_db_service_1.equipmentDbService.getEquipment(equipmentId);
        if (!current) {
            throw new Error(`Equipment ${equipmentId} not found`);
        }
        // Merge updates
        const updated = Object.assign(Object.assign({}, current), updates);
        // Store updated equipment (this will update existing record)
        const points = await equipment_db_service_1.equipmentDbService.getPointsByEquipmentId(equipmentId);
        await equipment_db_service_1.equipmentDbService.storeEquipmentWithPoints(equipmentId, updated, points);
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to update equipment:', error);
        throw error;
    }
}
/**
 * Check if equipment exists in database
 */
async function equipmentExists(equipmentId) {
    console.log('[EQUIPMENT STORE] Checking if equipment exists', { equipmentId });
    try {
        const equipment = await equipment_db_service_1.equipmentDbService.getEquipment(equipmentId);
        return equipment !== null;
    }
    catch (error) {
        console.error('[EQUIPMENT STORE] Failed to check equipment existence:', error);
        return false;
    }
}
/**
 * Get in-memory cache status (for debugging)
 */
function getCacheStatus() {
    return {
        inMemoryItems: processingResults.size,
        fileIds: Array.from(processingResults.keys())
    };
}
