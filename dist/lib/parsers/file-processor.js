"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessor = void 0;
exports.processTrioFile = processTrioFile;
exports.batchProcessTrioFiles = batchProcessTrioFiles;
const trio_parser_1 = require("./trio-parser");
const equipment_classifier_1 = require("../classifiers/equipment-classifier");
const validation_1 = require("../utils/validation");
/**
 * Main file processor for coordinating trio parsing and equipment classification
 */
class FileProcessor {
    /**
     * Process single trio file
     */
    static async processTrioFile(fileName, content, connectorData, options = {}) {
        const startTime = Date.now();
        const opts = Object.assign(Object.assign({}, this.DEFAULT_OPTIONS), options);
        const steps = [];
        const result = {
            fileName,
            equipmentClassification: {},
            trioParseResult: null,
            bacnetPoints: [],
            equipmentSource: null,
            processingTime: 0,
            success: false,
            errors: [],
            warnings: [],
            metadata: {
                fileSize: content.length,
                totalPoints: 0,
                validPoints: 0,
                processingSteps: []
            }
        };
        try {
            // Step 1: Validate file format
            steps.push('Format Validation');
            if (opts.validateFormat) {
                const formatValidation = (0, validation_1.validateTrioFormat)(content);
                if (!formatValidation.isValid) {
                    result.errors.push(...formatValidation.errors);
                    if (opts.strictMode) {
                        throw new Error(`Format validation failed: ${formatValidation.errors.join(', ')}`);
                    }
                }
                result.warnings.push(...formatValidation.warnings);
            }
            // Step 2: Classify equipment from filename
            steps.push('Equipment Classification');
            result.equipmentClassification = equipment_classifier_1.EquipmentClassifier.classifyFromFilename(fileName);
            if (result.equipmentClassification.confidence < 0.5) {
                result.warnings.push('Low confidence equipment classification');
            }
            // Step 3: Parse trio file
            steps.push('Trio File Parsing');
            result.trioParseResult = trio_parser_1.TrioParser.parseTrioFile(fileName, content, {
                strictMode: opts.strictMode || false
            });
            if (!result.trioParseResult.isValid) {
                result.errors.push(...result.trioParseResult.metadata.errors.map(e => e.message));
                if (opts.strictMode) {
                    throw new Error('Trio parsing failed');
                }
            }
            result.warnings.push(...result.trioParseResult.metadata.warnings.map(w => w.message));
            // Step 4: Convert to BACnet points
            steps.push('BACnet Point Conversion');
            const equipmentName = result.equipmentClassification.equipmentName;
            result.bacnetPoints = (0, trio_parser_1.parseTrioToBACnetPoints)(fileName, content, equipmentName);
            // Validate point count
            if (opts.maxPointsPerEquipment && result.bacnetPoints.length > opts.maxPointsPerEquipment) {
                result.warnings.push(`Point count (${result.bacnetPoints.length}) exceeds maximum (${opts.maxPointsPerEquipment})`);
            }
            // Step 5: Create equipment source
            steps.push('Equipment Source Creation');
            result.equipmentSource = this.createEquipmentSource(result.equipmentClassification, result.bacnetPoints, connectorData, result.trioParseResult);
            // Calculate metadata
            result.metadata.totalPoints = result.bacnetPoints.length;
            result.metadata.validPoints = result.bacnetPoints.filter(p => p.objectName && p.objectType && p.objectInstance !== undefined).length;
            // Skip empty files if requested
            if (opts.skipEmptyFiles && result.bacnetPoints.length === 0) {
                result.warnings.push('File contains no valid points');
            }
            result.success = result.errors.length === 0;
        }
        catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown processing error');
        }
        finally {
            result.processingTime = Date.now() - startTime;
            result.metadata.processingSteps = steps;
        }
        return result;
    }
    /**
     * Process multiple trio files in batch
     */
    static async batchProcessTrioFiles(files, connectorDataMap, options = {}) {
        const startTime = Date.now();
        const results = [];
        // Process files concurrently with limited concurrency
        const concurrencyLimit = 5;
        const batches = this.chunkArray(files, concurrencyLimit);
        for (const batch of batches) {
            const batchPromises = batch.map(({ fileName, content }) => {
                const connectorData = connectorDataMap === null || connectorDataMap === void 0 ? void 0 : connectorDataMap.get(fileName);
                return this.processTrioFile(fileName, content, connectorData, options);
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        // Calculate summary statistics
        const summary = this.calculateBatchSummary(results);
        return {
            totalFiles: files.length,
            successfulFiles: results.filter(r => r.success).length,
            failedFiles: results.filter(r => !r.success).length,
            totalProcessingTime: Date.now() - startTime,
            results,
            summary
        };
    }
    /**
     * Create equipment source from processing results
     */
    static createEquipmentSource(classification, points, connectorData, trioResult) {
        const equipmentSource = {
            id: this.generateEquipmentId(classification.originalFileName),
            name: classification.equipmentName,
            type: classification.equipmentType,
            fileName: classification.originalFileName,
            points,
            metadata: {
                classification,
                connector: connectorData,
                trioMetadata: trioResult ? trio_parser_1.TrioParser.extractEquipmentMetadata(trioResult) : undefined,
                processingDate: new Date().toISOString(),
                pointCount: points.length,
                confidence: classification.confidence
            },
            status: points.length > 0 ? 'active' : 'unknown',
            tags: this.generateEquipmentTags(classification, connectorData)
        };
        return equipmentSource;
    }
    /**
     * Generate unique equipment ID
     */
    static generateEquipmentId(fileName) {
        const timestamp = Date.now().toString(36);
        const fileHash = fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return `eq-${fileHash}-${timestamp}`;
    }
    /**
     * Generate equipment tags
     */
    static generateEquipmentTags(classification, connectorData) {
        const tags = [];
        // Add classification-based tags
        const config = equipment_classifier_1.EquipmentClassifier.getEquipmentConfig(classification.equipmentType);
        if (config) {
            tags.push(...config.tags);
        }
        // Add vendor tags if available
        if (connectorData === null || connectorData === void 0 ? void 0 : connectorData.vendor) {
            tags.push(`vendor:${connectorData.vendor.toLowerCase().replace(/\s+/g, '-')}`);
        }
        // Add confidence tags
        if (classification.confidence > 0.9) {
            tags.push('high-confidence');
        }
        else if (classification.confidence < 0.7) {
            tags.push('low-confidence');
        }
        return [...new Set(tags)]; // Remove duplicates
    }
    /**
     * Calculate batch processing summary
     */
    static calculateBatchSummary(results) {
        const equipmentTypeDistribution = {};
        const commonErrors = {};
        let totalPoints = 0;
        results.forEach(result => {
            // Count equipment types
            const type = result.equipmentClassification.equipmentType;
            equipmentTypeDistribution[type] = (equipmentTypeDistribution[type] || 0) + 1;
            // Count points
            totalPoints += result.bacnetPoints.length;
            // Count errors
            result.errors.forEach(error => {
                commonErrors[error] = (commonErrors[error] || 0) + 1;
            });
        });
        const successfulFiles = results.filter(r => r.success).length;
        const averagePointsPerEquipment = successfulFiles > 0 ? totalPoints / successfulFiles : 0;
        return {
            equipmentTypeDistribution,
            totalPoints,
            averagePointsPerEquipment: Math.round(averagePointsPerEquipment * 100) / 100,
            commonErrors
        };
    }
    /**
     * Utility function to chunk array
     */
    static chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Get processing statistics
     */
    static getProcessingStats(result) {
        return {
            fileName: result.fileName,
            equipmentType: result.equipmentClassification.equipmentType,
            confidence: result.equipmentClassification.confidence,
            pointCount: result.bacnetPoints.length,
            processingTime: result.processingTime,
            success: result.success,
            errorCount: result.errors.length,
            warningCount: result.warnings.length
        };
    }
    /**
     * Validate processing result
     */
    static validateProcessingResult(result) {
        const issues = [];
        const recommendations = [];
        // Check if classification succeeded
        if (result.equipmentClassification.confidence < 0.5) {
            issues.push('Low confidence equipment classification');
            recommendations.push('Review filename pattern or provide manual classification');
        }
        // Check if points were extracted
        if (result.bacnetPoints.length === 0) {
            issues.push('No BACnet points extracted');
            recommendations.push('Verify trio file format and content');
        }
        // Check for parsing errors
        if (result.errors.length > 0) {
            issues.push(`${result.errors.length} processing errors occurred`);
            recommendations.push('Review error messages and fix underlying issues');
        }
        // Check processing time
        if (result.processingTime > 5000) {
            issues.push('Processing time exceeded 5 seconds');
            recommendations.push('Consider optimizing file size or processing approach');
        }
        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }
}
exports.FileProcessor = FileProcessor;
FileProcessor.DEFAULT_OPTIONS = {
    strictMode: false,
    includeMetadata: true,
    validateFormat: true,
    maxPointsPerEquipment: 1000,
    skipEmptyFiles: true,
    enableLogging: false
};
/**
 * Convenience functions
 */
async function processTrioFile(fileName, content, options) {
    return FileProcessor.processTrioFile(fileName, content, undefined, options);
}
async function batchProcessTrioFiles(files, options) {
    return FileProcessor.batchProcessTrioFiles(files, undefined, options);
}
