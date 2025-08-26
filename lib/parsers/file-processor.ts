import { TrioParser, parseTrioToBACnetPoints, TrioParseResult } from './trio-parser';
import { EquipmentClassifier, ClassificationResult } from '../classifiers/equipment-classifier';
import { validateTrioFormat } from '../utils/validation';
import { EquipmentSource, EquipmentType } from '@/types/equipment';
import { BACnetPoint } from '@/types/point';

/**
 * File processing result
 */
export interface FileProcessingResult {
  fileName: string;
  equipmentClassification: ClassificationResult;
  trioParseResult: TrioParseResult | null;
  bacnetPoints: BACnetPoint[];
  equipmentSource: EquipmentSource | null;
  processingTime: number;
  success: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    fileSize: number;
    totalPoints: number;
    validPoints: number;
    processingSteps: string[];
  };
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalProcessingTime: number;
  results: FileProcessingResult[];
  summary: {
    equipmentTypeDistribution: Record<EquipmentType, number>;
    totalPoints: number;
    averagePointsPerEquipment: number;
    commonErrors: Record<string, number>;
  };
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  strictMode?: boolean;
  includeMetadata?: boolean;
  validateFormat?: boolean;
  maxPointsPerEquipment?: number;
  skipEmptyFiles?: boolean;
  enableLogging?: boolean;
}

/**
 * Connector data for correlation
 */
export interface ConnectorData {
  fileName: string;
  equipmentName: string;
  vendor?: string;
  model?: string;
  description?: string;
  uri?: string;
  deviceName?: string;
}

/**
 * Main file processor for coordinating trio parsing and equipment classification
 */
export class FileProcessor {
  private static readonly DEFAULT_OPTIONS: ProcessingOptions = {
    strictMode: false,
    includeMetadata: true,
    validateFormat: true,
    maxPointsPerEquipment: 1000,
    skipEmptyFiles: true,
    enableLogging: false
  };

  /**
   * Process single trio file
   */
  static async processTrioFile(
    fileName: string,
    content: string,
    connectorData?: ConnectorData,
    options: ProcessingOptions = {}
  ): Promise<FileProcessingResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const steps: string[] = [];

    const result: FileProcessingResult = {
      fileName,
      equipmentClassification: {} as ClassificationResult,
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
        const formatValidation = validateTrioFormat(content);
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
      result.equipmentClassification = EquipmentClassifier.classifyFromFilename(fileName);
      
      if (result.equipmentClassification.confidence < 0.5) {
        result.warnings.push('Low confidence equipment classification');
      }

      // Step 3: Parse trio file
      steps.push('Trio File Parsing');
      result.trioParseResult = TrioParser.parseTrioFile(fileName, content, {
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
      result.bacnetPoints = parseTrioToBACnetPoints(fileName, content, equipmentName);

      // Validate point count
      if (opts.maxPointsPerEquipment && result.bacnetPoints.length > opts.maxPointsPerEquipment) {
        result.warnings.push(`Point count (${result.bacnetPoints.length}) exceeds maximum (${opts.maxPointsPerEquipment})`);
      }

      // Step 5: Create equipment source
      steps.push('Equipment Source Creation');
      result.equipmentSource = this.createEquipmentSource(
        result.equipmentClassification,
        result.bacnetPoints,
        connectorData,
        result.trioParseResult
      );

      // Calculate metadata
      result.metadata.totalPoints = result.bacnetPoints.length;
      result.metadata.validPoints = result.bacnetPoints.filter(p => 
        p.objectName && p.objectType && p.objectInstance !== undefined
      ).length;

      // Skip empty files if requested
      if (opts.skipEmptyFiles && result.bacnetPoints.length === 0) {
        result.warnings.push('File contains no valid points');
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown processing error');
    } finally {
      result.processingTime = Date.now() - startTime;
      result.metadata.processingSteps = steps;
    }

    return result;
  }

  /**
   * Process multiple trio files in batch
   */
  static async batchProcessTrioFiles(
    files: Array<{ fileName: string; content: string }>,
    connectorDataMap?: Map<string, ConnectorData>,
    options: ProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: FileProcessingResult[] = [];

    // Process files concurrently with limited concurrency
    const concurrencyLimit = 5;
    const batches = this.chunkArray(files, concurrencyLimit);

    for (const batch of batches) {
      const batchPromises = batch.map(({ fileName, content }) => {
        const connectorData = connectorDataMap?.get(fileName);
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
  private static createEquipmentSource(
    classification: ClassificationResult,
    points: BACnetPoint[],
    connectorData?: ConnectorData,
    trioResult?: TrioParseResult | null
  ): EquipmentSource {
    // Get fileName from available sources
    const fileName = connectorData?.fileName || trioResult?.fileName || classification.equipmentName;
    
    const equipmentSource: EquipmentSource = {
      id: this.generateEquipmentId(fileName),
      name: classification.equipmentName,
      type: classification.equipmentType as EquipmentType,
      fileName,
      points,
      metadata: {
        classification,
        connector: connectorData,
        trioMetadata: trioResult ? TrioParser.extractEquipmentMetadata(trioResult) : undefined,
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
  private static generateEquipmentId(fileName: string): string {
    const timestamp = Date.now().toString(36);
    const fileHash = fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `eq-${fileHash}-${timestamp}`;
  }

  /**
   * Generate equipment tags
   */
  private static generateEquipmentTags(
    classification: ClassificationResult,
    connectorData?: ConnectorData
  ): string[] {
    const tags: string[] = [];

    // Add equipment type tag
    tags.push(`type:${classification.equipmentType.toLowerCase().replace(/\s+/g, '-')}`);

    // Add vendor tags if available
    if (connectorData?.vendor) {
      tags.push(`vendor:${connectorData.vendor.toLowerCase().replace(/\s+/g, '-')}`);
    }

    // Add confidence tags
    if (classification.confidence > 0.9) {
      tags.push('high-confidence');
    } else if (classification.confidence < 0.7) {
      tags.push('low-confidence');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Calculate batch processing summary
   */
  private static calculateBatchSummary(results: FileProcessingResult[]) {
    const equipmentTypeDistribution: Record<EquipmentType, number> = {} as Record<EquipmentType, number>;
    const commonErrors: Record<string, number> = {};
    let totalPoints = 0;

    results.forEach(result => {
      // Count equipment types
      const type = result.equipmentClassification.equipmentType as EquipmentType;
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
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get processing statistics
   */
  static getProcessingStats(result: FileProcessingResult) {
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
  static validateProcessingResult(result: FileProcessingResult): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

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

/**
 * Convenience functions
 */
export async function processTrioFile(
  fileName: string,
  content: string,
  options?: ProcessingOptions
): Promise<FileProcessingResult> {
  return FileProcessor.processTrioFile(fileName, content, undefined, options);
}

export async function batchProcessTrioFiles(
  files: Array<{ fileName: string; content: string }>,
  options?: ProcessingOptions
): Promise<BatchProcessingResult> {
  return FileProcessor.batchProcessTrioFiles(files, undefined, options);
} 