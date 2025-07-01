"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingService = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const trio_parser_1 = require("../parsers/trio-parser");
const equipment_classifier_1 = require("../classifiers/equipment-classifier");
const point_normalizer_1 = require("../normalizers/point-normalizer");
const haystack_tagger_1 = require("../taggers/haystack-tagger");
const equipment_db_service_1 = require("../database/equipment-db-service");
const normalized_1 = require("../../types/normalized");
const point_1 = require("../../types/point");
const haystack_1 = require("../../types/haystack");
const equipment_1 = require("../../types/equipment");
// Debug logging function
function debugLog(processingId, stage, message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[PROCESSING DEBUG ${timestamp}] [${processingId}] [${stage}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}
class ProcessingService {
    constructor() {
        this.hasDataBeenCleared = false;
        this.tagger = new haystack_tagger_1.HaystackTagger();
    }
    // Clear all existing data before processing new files
    async clearExistingData(processingId) {
        if (this.hasDataBeenCleared) {
            debugLog(processingId, 'DATA_CLEAR', 'Data already cleared in this session, skipping');
            return;
        }
        debugLog(processingId, 'DATA_CLEAR', 'Clearing all existing data');
        try {
            await equipment_db_service_1.equipmentDbService.clearAllData();
            this.hasDataBeenCleared = true;
            debugLog(processingId, 'DATA_CLEAR', 'Data cleared successfully');
        }
        catch (error) {
            debugLog(processingId, 'DATA_CLEAR', 'Failed to clear data', { error: error instanceof Error ? error.message : error });
            throw new Error('Failed to clear existing data: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
    // Reset the data cleared flag for new processing sessions
    resetSession() {
        this.hasDataBeenCleared = false;
    }
    async processFile(fileId, filename, onStatusUpdate) {
        var _a, _b, _c, _d;
        const startTime = Date.now();
        const processingId = `${fileId.substring(0, 8)}_${Date.now()}`;
        const debugInfo = {
            processingId,
            stages: {
                parsing: { duration: 0, recordCount: 0, sectionCount: 0 },
                classifying: { duration: 0, equipmentType: '', confidence: 0 },
                normalizing: { duration: 0, pointCount: 0, successCount: 0 },
                tagging: { duration: 0, tagCount: 0, errorCount: 0 }
            }
        };
        debugLog(processingId, 'INIT', 'Starting file processing', {
            fileId,
            filename,
            startTime: new Date(startTime).toISOString()
        });
        try {
            // Clear existing data before processing new files
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'parsing',
                progress: 5,
                message: 'Clearing existing data...'
            });
            await this.clearExistingData(processingId);
            // Update status: Starting parsing
            const parsingStartTime = Date.now();
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'parsing',
                progress: 10,
                message: 'Parsing trio file...'
            });
            debugLog(processingId, 'PARSING', 'Starting trio file parsing', { filename });
            // Step 1: Parse trio file
            const filepath = path_1.default.join(process.cwd(), 'uploads', `${fileId}_${filename}`);
            debugLog(processingId, 'PARSING', 'Reading file', { filepath });
            const fileContent = await (0, promises_1.readFile)(filepath, 'utf-8');
            debugLog(processingId, 'PARSING', 'File read successfully', {
                contentLength: fileContent.length,
                firstLine: ((_a = fileContent.split('\n')[0]) === null || _a === void 0 ? void 0 : _a.substring(0, 100)) + '...'
            });
            const parseResult = trio_parser_1.TrioParser.parseTrioFile(filename, fileContent);
            debugInfo.stages.parsing.duration = Date.now() - parsingStartTime;
            debugInfo.stages.parsing.sectionCount = ((_b = parseResult.sections) === null || _b === void 0 ? void 0 : _b.length) || 0;
            debugInfo.stages.parsing.recordCount = ((_c = parseResult.sections) === null || _c === void 0 ? void 0 : _c.reduce((sum, section) => { var _a; return sum + (((_a = section.records) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0)) || 0;
            debugLog(processingId, 'PARSING', 'Parsing completed', {
                isValid: parseResult.isValid,
                sectionCount: debugInfo.stages.parsing.sectionCount,
                recordCount: debugInfo.stages.parsing.recordCount,
                errors: parseResult.metadata.errors,
                duration: debugInfo.stages.parsing.duration
            });
            if (!parseResult.isValid || !parseResult.sections || parseResult.sections.length === 0) {
                const errorMessage = parseResult.metadata.errors.map(e => e.message).join(', ') || 'Failed to parse trio file';
                debugLog(processingId, 'PARSING', 'Parsing failed', {
                    errors: parseResult.metadata.errors,
                    errorMessage
                });
                return {
                    success: false,
                    error: errorMessage,
                    debug: debugInfo
                };
            }
            // Update status: Classifying equipment
            const classifyingStartTime = Date.now();
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'classifying',
                progress: 30,
                message: 'Classifying equipment type...'
            });
            debugLog(processingId, 'CLASSIFYING', 'Starting equipment classification', { filename });
            // Step 2: Classify equipment
            const classificationResult = equipment_classifier_1.EquipmentClassifier.classifyFromFilename(filename);
            debugInfo.stages.classifying.duration = Date.now() - classifyingStartTime;
            debugInfo.stages.classifying.equipmentType = classificationResult.equipmentType;
            debugInfo.stages.classifying.confidence = classificationResult.confidence;
            debugLog(processingId, 'CLASSIFYING', 'Classification completed', {
                equipmentType: classificationResult.equipmentType,
                confidence: classificationResult.confidence,
                matchedPattern: classificationResult.matchedPattern,
                alternatives: classificationResult.alternatives,
                duration: debugInfo.stages.classifying.duration
            });
            const baseEquipment = {
                id: fileId,
                name: classificationResult.equipmentName,
                displayName: classificationResult.equipmentName,
                type: classificationResult.equipmentType,
                filename: filename,
                vendor: 'Unknown',
                modelName: 'Unknown',
                description: `${classificationResult.equipmentType} parsed from ${filename}`,
                status: equipment_1.EquipmentStatus.OPERATIONAL,
                connectionState: equipment_1.ConnectionState.OPEN,
                connectionStatus: 'ok',
                createdAt: new Date(),
                updatedAt: new Date(),
                points: []
            };
            debugLog(processingId, 'CLASSIFYING', 'Base equipment created', {
                equipmentId: baseEquipment.id,
                equipmentName: baseEquipment.name,
                equipmentType: baseEquipment.type
            });
            // Update status: Normalizing points
            const normalizingStartTime = Date.now();
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'normalizing',
                progress: 50,
                message: 'Normalizing point names...'
            });
            debugLog(processingId, 'NORMALIZING', 'Starting point normalization');
            // Step 3: Normalize points
            const normalizedPoints = [];
            // Extract all records from all sections
            const allRecords = [];
            parseResult.sections.forEach(section => {
                if (section.records) {
                    section.records.forEach(record => {
                        // Convert TrioRecord to a more usable format
                        const recordData = {};
                        record.tags.forEach((value, key) => {
                            recordData[key] = value.value || value.raw;
                        });
                        allRecords.push(recordData);
                    });
                }
            });
            debugLog(processingId, 'NORMALIZING', 'Extracted records for normalization', {
                totalRecords: allRecords.length,
                sampleRecord: allRecords[0] ? Object.keys(allRecords[0]) : []
            });
            let normalizedSuccessCount = 0;
            for (let i = 0; i < allRecords.length; i++) {
                const point = allRecords[i];
                const originalName = point.dis || point.id || `Point_${i}`;
                debugLog(processingId, 'NORMALIZING', `Processing point ${i + 1}/${allRecords.length}`, {
                    originalName,
                    pointData: point
                });
                try {
                    // Create a BACnetPoint object for normalization
                    const bacnetPoint = {
                        id: `${fileId}_point_${i}`,
                        equipmentId: fileId,
                        objectName: originalName,
                        objectType: this.extractObjectType(point.bacnetCur),
                        objectInstance: this.extractObjectInstance(point.bacnetCur) || i,
                        dis: originalName,
                        displayName: originalName,
                        description: point.bacnetDesc || '',
                        dataType: point.kind || 'String',
                        units: point.unit,
                        category: 'unknown',
                        isWritable: !!point.writable,
                        isCommand: !!point.cmd,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    const normalizationResult = point_normalizer_1.PointNormalizer.normalizePointName(bacnetPoint, {
                        equipmentType: classificationResult.equipmentType,
                        // Enable enhanced mode for new processing  
                        addFunctionSuffix: true,
                        useEnhancedConfidence: true
                    });
                    const normalizedName = ((_d = normalizationResult.normalizedPoint) === null || _d === void 0 ? void 0 : _d.normalizedName) || originalName;
                    const normalizedPoint = {
                        originalPointId: `${fileId}_point_${i}`,
                        equipmentId: baseEquipment.id,
                        originalName,
                        originalDescription: point.bacnetDesc || '',
                        objectName: originalName,
                        normalizedName,
                        expandedDescription: normalizedName || originalName,
                        pointFunction: normalized_1.PointFunction.Unknown,
                        category: point_1.PointCategory.SENSOR, // Default category
                        dataType: point.kind || 'string',
                        units: point.unit,
                        objectType: this.extractObjectType(point.bacnetCur) || point_1.BACnetObjectType.ANALOG_INPUT,
                        haystackTags: [],
                        confidence: normalized_1.NormalizationConfidence.MEDIUM,
                        confidenceScore: 0.7,
                        normalizationMethod: 'file-processing',
                        normalizationRules: [],
                        hasAcronymExpansion: false,
                        hasUnitNormalization: !!point.unit,
                        hasContextInference: false,
                        requiresManualReview: false,
                        normalizedAt: new Date(),
                        normalizedBy: 'system'
                    };
                    normalizedPoints.push(normalizedPoint);
                    normalizedSuccessCount++;
                    debugLog(processingId, 'NORMALIZING', `Point normalized successfully`, {
                        index: i,
                        originalName,
                        normalizedName,
                        objectType: normalizedPoint.objectType
                    });
                }
                catch (error) {
                    debugLog(processingId, 'NORMALIZING', `Point normalization failed`, {
                        index: i,
                        originalName,
                        error: error instanceof Error ? error.message : error
                    });
                }
                // Update progress during normalization
                if (i % Math.max(1, Math.floor(allRecords.length / 10)) === 0) {
                    onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                        stage: 'normalizing',
                        progress: 50 + (i / allRecords.length) * 20,
                        message: `Normalizing points... (${i + 1}/${allRecords.length})`
                    });
                }
            }
            debugInfo.stages.normalizing.duration = Date.now() - normalizingStartTime;
            debugInfo.stages.normalizing.pointCount = allRecords.length;
            debugInfo.stages.normalizing.successCount = normalizedSuccessCount;
            debugLog(processingId, 'NORMALIZING', 'Normalization completed', {
                totalPoints: allRecords.length,
                successfulPoints: normalizedSuccessCount,
                failedPoints: allRecords.length - normalizedSuccessCount,
                duration: debugInfo.stages.normalizing.duration
            });
            // Update status: Generating Haystack tags
            const taggingStartTime = Date.now();
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'tagging',
                progress: 80,
                message: 'Generating Haystack tags...'
            });
            debugLog(processingId, 'TAGGING', 'Starting Haystack tag generation');
            // Step 4: Generate Haystack tags
            let totalTags = 0;
            let taggingErrors = 0;
            for (let i = 0; i < normalizedPoints.length; i++) {
                const point = normalizedPoints[i];
                try {
                    // Generate Haystack tags based on point properties
                    const tagNames = this.generateBasicHaystackTags(point);
                    point.haystackTags = tagNames.map(name => ({
                        name,
                        value: undefined,
                        category: haystack_1.HaystackTagCategory.CUSTOM,
                        isMarker: true,
                        isValid: true,
                        source: 'inferred',
                        confidence: 0.8,
                        appliedAt: new Date()
                    }));
                    totalTags += tagNames.length;
                    debugLog(processingId, 'TAGGING', `Tags generated for point`, {
                        pointIndex: i,
                        originalName: point.originalName,
                        tags: tagNames,
                        tagCount: tagNames.length
                    });
                }
                catch (error) {
                    taggingErrors++;
                    debugLog(processingId, 'TAGGING', `Tag generation failed for point`, {
                        pointIndex: i,
                        originalName: point.originalName,
                        error: error instanceof Error ? error.message : error
                    });
                    console.warn(`Failed to generate Haystack tags for point ${point.originalName}:`, error);
                    point.haystackTags = [{
                            name: 'point',
                            value: undefined,
                            category: haystack_1.HaystackTagCategory.CUSTOM,
                            isMarker: true,
                            isValid: true,
                            source: 'inferred',
                            confidence: 0.5,
                            appliedAt: new Date()
                        }]; // Fallback to basic tag
                    totalTags += 1;
                }
                // Update progress during tagging
                if (i % Math.max(1, Math.floor(normalizedPoints.length / 10)) === 0) {
                    onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                        stage: 'tagging',
                        progress: 80 + (i / normalizedPoints.length) * 15,
                        message: `Generating tags... (${i + 1}/${normalizedPoints.length})`
                    });
                }
            }
            debugInfo.stages.tagging.duration = Date.now() - taggingStartTime;
            debugInfo.stages.tagging.tagCount = totalTags;
            debugInfo.stages.tagging.errorCount = taggingErrors;
            debugLog(processingId, 'TAGGING', 'Tagging completed', {
                totalPoints: normalizedPoints.length,
                totalTags,
                taggingErrors,
                averageTagsPerPoint: normalizedPoints.length > 0 ? totalTags / normalizedPoints.length : 0,
                duration: debugInfo.stages.tagging.duration
            });
            // Update equipment with points
            baseEquipment.points = normalizedPoints;
            // Final status update
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'completed',
                progress: 100,
                message: `Processing completed. ${normalizedPoints.length} points processed.`
            });
            const duration = Date.now() - startTime;
            debugLog(processingId, 'COMPLETED', 'Processing completed successfully', {
                totalDuration: duration,
                equipmentId: baseEquipment.id,
                pointCount: normalizedPoints.length,
                stageBreakdown: debugInfo.stages
            });
            return {
                success: true,
                equipment: baseEquipment,
                points: normalizedPoints,
                duration,
                debug: debugInfo
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
            debugLog(processingId, 'ERROR', 'Processing failed with error', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                duration: Date.now() - startTime,
                stageBreakdown: debugInfo.stages
            });
            onStatusUpdate === null || onStatusUpdate === void 0 ? void 0 : onStatusUpdate({
                stage: 'error',
                progress: 0,
                message: 'Processing failed',
                error: errorMessage
            });
            return {
                success: false,
                error: errorMessage,
                duration: Date.now() - startTime,
                debug: debugInfo
            };
        }
    }
    extractObjectType(bacnetCur) {
        if (!bacnetCur)
            return undefined;
        const match = bacnetCur.match(/^([a-zA-Z_]+)/);
        return match ? match[1] : undefined;
    }
    extractObjectInstance(bacnetCur) {
        if (!bacnetCur)
            return undefined;
        // Extract object instance from BACnet current value (e.g., "AI39" -> 39)
        const match = bacnetCur.match(/^[A-Z]{2}(\d+)/);
        return match ? parseInt(match[1], 10) : undefined;
    }
    generateBasicHaystackTags(point) {
        const tags = ['point'];
        // Add object type based tags
        if (point.objectType) {
            const objectType = point.objectType.toLowerCase();
            if (objectType.startsWith('a')) {
                tags.push('sensor');
            }
            if (objectType.includes('i')) {
                tags.push('input');
            }
            if (objectType.includes('o')) {
                tags.push('output', 'cmd');
            }
        }
        // Add unit based tags
        if (point.units) {
            const unit = point.units.toLowerCase();
            if (unit.includes('temp') || unit.includes('°f') || unit.includes('°c')) {
                tags.push('temp');
            }
            if (unit.includes('cfm') || unit.includes('flow')) {
                tags.push('air', 'flow');
            }
            if (unit.includes('%') || unit.includes('pct')) {
                tags.push('sensor');
            }
            if (unit.includes('psi') || unit.includes('pressure')) {
                tags.push('pressure');
            }
        }
        // Add name based tags
        if (point.normalizedName || point.originalName) {
            const name = (point.normalizedName || point.originalName).toLowerCase();
            if (name.includes('temp')) {
                tags.push('temp');
            }
            if (name.includes('flow') || name.includes('cfm')) {
                tags.push('air', 'flow');
            }
            if (name.includes('damper')) {
                tags.push('damper');
            }
            if (name.includes('fan')) {
                tags.push('fan');
            }
            if (name.includes('room') || name.includes('zone')) {
                tags.push('zone');
            }
            if (name.includes('supply')) {
                tags.push('supply');
            }
            if (name.includes('return')) {
                tags.push('return');
            }
            if (name.includes('exhaust')) {
                tags.push('exhaust');
            }
        }
        // Remove duplicates and return
        return Array.from(new Set(tags));
    }
    // Method to get processing status for long-running operations
    async getProcessingStatus(fileId) {
        // This would typically query a database or cache
        // For now, return null indicating no status found
        return null;
    }
    // Method to cancel processing (for future implementation)
    async cancelProcessing(fileId) {
        // Implementation would depend on how background processing is handled
        return false;
    }
}
exports.ProcessingService = ProcessingService;
