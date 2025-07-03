import { readFile } from 'fs/promises';
import path from 'path';
import { TrioParser } from '../parsers/trio-parser';
import { EquipmentClassifier } from '../classifiers/equipment-classifier';
import { PointNormalizer } from '../normalizers/point-normalizer';
import { HaystackTagger } from '../taggers/haystack-tagger';
import { EquipmentDatabaseService } from '../database/equipment-db-service';
import type { Equipment } from '../../types/equipment';
import type { NormalizedPoint } from '../../types/normalized';
import { PointFunction, NormalizationConfidence } from '../../types/normalized';
import { BACnetObjectType, PointCategory, PointDataType } from '../../types/point';
import { HaystackTagCategory } from '../../types/haystack';
import { EquipmentStatus, ConnectionState, EquipmentType } from '../../types/equipment';
import type { TrioRecord } from '../../types/trio';
import { connectorService } from './connector-service';
import { nanoid } from 'nanoid';

export interface ProcessingStatus {
  stage: 'parsing' | 'classifying' | 'normalizing' | 'tagging' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  equipment?: Equipment;
  points?: NormalizedPoint[];
  error?: string;
  duration?: number;
  debug?: {
    processingId: string;
    stages: {
      parsing: { duration: number; recordCount: number; sectionCount: number };
      classifying: { duration: number; equipmentType: string; confidence: number };
      normalizing: { duration: number; pointCount: number; successCount: number };
      tagging: { duration: number; tagCount: number; errorCount: number };
    };
  };
}

// Debug logging function
function debugLog(processingId: string, stage: string, message: string, data?: Record<string, unknown> | string) {
  const timestamp = new Date().toISOString();
  console.log(`[PROCESSING DEBUG ${timestamp}] [${processingId}] [${stage}] ${message}`, 
    data ? JSON.stringify(data, null, 2) : '');
}

export class ProcessingService {
  private tagger: HaystackTagger;
  private hasDataBeenCleared: boolean = false;
  private equipmentDbService: EquipmentDatabaseService;

  constructor() {
    this.tagger = new HaystackTagger();
    this.equipmentDbService = new EquipmentDatabaseService();
  }

  // Clear all existing data before processing new files
  async clearExistingData(processingId: string): Promise<void> {
    if (this.hasDataBeenCleared) {
      debugLog(processingId, 'DATA_CLEAR', 'Data already cleared in this session, skipping');
      return;
    }

    debugLog(processingId, 'DATA_CLEAR', 'Clearing all existing data');
    
    try {
      await this.equipmentDbService.clearAllData();
      this.hasDataBeenCleared = true;
      debugLog(processingId, 'DATA_CLEAR', 'Data cleared successfully');
    } catch (error) {
      debugLog(processingId, 'DATA_CLEAR', 'Failed to clear data', { error: error instanceof Error ? error.message : error });
      throw new Error('Failed to clear existing data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Reset the data cleared flag for new processing sessions
  resetSession(): void {
    this.hasDataBeenCleared = false;
  }

  async processFile(
    filepath: string,
    onStatusUpdate?: (status: ProcessingStatus) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const filename = path.basename(filepath);
    const equipmentName = path.basename(filename, '.trio');
    const processingId = `${equipmentName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const fileId = nanoid();
    
    // Try to find existing equipment first
    const existingEquipment = await this.equipmentDbService.findEquipmentByName(equipmentName);
    const equipmentId = existingEquipment ? existingEquipment.id : `${fileId}-${equipmentName}`;

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
      equipmentId,
      startTime: new Date(startTime).toISOString()
    });
    
    try {
      // Update status: Starting parsing
      const parsingStartTime = Date.now();
      onStatusUpdate?.({
        stage: 'parsing',
        progress: 10,
        message: 'Parsing trio file...'
      });

      debugLog(processingId, 'PARSING', 'Starting trio file parsing', { filename });

      // Step 1: Parse trio file
      debugLog(processingId, 'PARSING', 'Reading file', { filepath });
      
      const fileContent = await readFile(filepath, 'utf-8');
      
      debugLog(processingId, 'PARSING', 'File read successfully', { 
        contentLength: fileContent.length,
        firstLine: fileContent.split('\n')[0]?.substring(0, 100) + '...'
      });
      
      const parseResult = TrioParser.parseTrioFile(filename, fileContent);
      
      debugInfo.stages.parsing.duration = Date.now() - parsingStartTime;
      debugInfo.stages.parsing.sectionCount = parseResult.sections?.length || 0;
      debugInfo.stages.parsing.recordCount = parseResult.sections?.reduce((sum, section) => 
        sum + (section.records?.length || 0), 0) || 0;

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
      onStatusUpdate?.({
        stage: 'classifying',
        progress: 30,
        message: 'Classifying equipment type...'
      });

      debugLog(processingId, 'CLASSIFYING', 'Starting equipment classification', { filename });

      // Step 2: Classify equipment
      const metadata = connectorService.getEquipmentMetadata(equipmentName);
      
      debugLog(processingId, 'METADATA', 'Equipment metadata from connector service', {
        equipmentName,
        metadata: metadata,
        hasVendor: !!metadata.vendor,
        hasModel: !!metadata.model
      });
      
      const classificationResult = EquipmentClassifier.classifyFromFilename(equipmentName);
      
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

      const baseEquipment: Equipment = {
        id: equipmentId,
        name: metadata.name || classificationResult.equipmentName,
        displayName: metadata.description || metadata.name || classificationResult.equipmentName,
        type: classificationResult.equipmentType,
        filename: filename,
        vendor: metadata.vendor || 'Unknown',
        modelName: metadata.model || 'Unknown',
        description: metadata.deviceName || `${classificationResult.equipmentType} - ${metadata.vendor || 'Unknown'} ${metadata.model || ''}`.trim(),
        status: metadata.deviceStatus === 'OPERATIONAL' ? EquipmentStatus.OPERATIONAL : EquipmentStatus.UNKNOWN,
        connectionState: metadata.connState === 'open' ? ConnectionState.OPEN : ConnectionState.CLOSED,
        connectionStatus: metadata.connStatus || 'unknown',
        createdAt: existingEquipment ? existingEquipment.createdAt : new Date(),
        updatedAt: new Date(),
        points: [],
        metadata: {
          deviceName: metadata.deviceName,
          deviceStatus: metadata.deviceStatus,
          bacnetVersion: metadata.bacnetVersion,
          ipAddress: metadata.ipAddress,
          deviceId: metadata.deviceId,
          network: metadata.network,
          uri: metadata.uri,
          customFields: metadata.customFields
        }
      };

      debugLog(processingId, 'CLASSIFYING', 'Base equipment created', {
        equipmentId: baseEquipment.id,
        equipmentName: baseEquipment.name,
        equipmentType: baseEquipment.type
      });

      // Update status: Normalizing points
      const normalizingStartTime = Date.now();
      onStatusUpdate?.({
        stage: 'normalizing',
        progress: 50,
        message: 'Normalizing point names...'
      });

      debugLog(processingId, 'NORMALIZING', 'Starting point normalization');

      // Step 3: Normalize points
      const normalizedPoints: NormalizedPoint[] = [];
      
      // Extract all records from all sections
      const allRecords: Record<string, unknown>[] = [];
      parseResult.sections.forEach(section => {
        if (section.records) {
          section.records.forEach(record => {
            // Convert TrioRecord to a more usable format
            const recordData: Record<string, unknown> = {};
            record.tags.forEach((value, key) => {
              recordData[key] = value.value ?? value.raw;
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

      for (const [index, record] of allRecords.entries()) {
        const pointName = (record.dis as string) || (record.id as string) || `Point_${index + 1}`;
        
        debugLog(processingId, 'NORMALIZING', `Processing point ${index + 1}/${allRecords.length}`, {
          originalName: pointName,
          pointData: record as Record<string, unknown>
        });

        const bacnetCur = record.bacnetCur as string | undefined;

        const bacnetPoint = {
          id: `${equipmentId}-${pointName}`,
          equipmentId: equipmentId,
          objectName: pointName,
          dis: pointName,
          objectType: (this.extractObjectType(bacnetCur) as BACnetObjectType) || BACnetObjectType.ANALOG_INPUT,
          objectInstance: this.extractObjectInstance(bacnetCur) || index,
          displayName: pointName,
          dataType: this.determineDataType(record),
          units: record.unit as string | undefined,
          description: record.description as string || '',
          category: PointCategory.UNKNOWN,
          isWritable: !!record.writable,
          isCommand: !!record.cmd,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const normalizationResult = PointNormalizer.normalizePointName(
          bacnetPoint,
          {
            equipmentType: baseEquipment.type,
            equipmentName: baseEquipment.name,
            vendorName: baseEquipment.vendor,
            units: bacnetPoint.units,
            objectType: bacnetPoint.objectType
          }
        );

        if (normalizationResult.success && normalizationResult.normalizedPoint) {
          // Use the normalized point from the result
          const normalizedPoint = normalizationResult.normalizedPoint;
          
          // Ensure category is valid
          if (!normalizedPoint.category || normalizedPoint.category === PointCategory.UNKNOWN) {
            // Determine category based on point properties
            if (bacnetPoint.isCommand) {
              normalizedPoint.category = PointCategory.COMMAND;
            } else if (bacnetPoint.isWritable) {
              normalizedPoint.category = PointCategory.SETPOINT;
            } else if (normalizedPoint.pointFunction === PointFunction.Status) {
              normalizedPoint.category = PointCategory.STATUS;
            } else {
              normalizedPoint.category = PointCategory.SENSOR;
            }
          }

          normalizedPoints.push(normalizedPoint);
          normalizedSuccessCount++;
          
          debugLog(processingId, 'NORMALIZING', 'Point normalized successfully', {
            index,
            originalName: pointName,
            normalizedName: normalizedPoint.normalizedName,
            objectType: normalizedPoint.objectType
          });
        } else {
          debugLog(processingId, 'NORMALIZING', 'Point normalization failed', {
            index,
            originalName: pointName,
            errors: normalizationResult.errors
          });

          // Fallback if normalization fails
          const fallbackPoint: NormalizedPoint = {
            originalPointId: pointName,
            equipmentId: equipmentId,
            originalName: pointName,
            originalDescription: bacnetPoint.description || '',
            objectName: bacnetPoint.objectName,
            objectType: bacnetPoint.objectType,
            objectInstance: bacnetPoint.objectInstance,
            normalizedName: pointName, // Use original name as fallback
            expandedDescription: bacnetPoint.description || pointName,
            pointFunction: PointFunction.Unknown,
            category: bacnetPoint.category,
            dataType: bacnetPoint.dataType,
            units: bacnetPoint.units,
            haystackTags: [],
            confidence: NormalizationConfidence.UNKNOWN,
            confidenceScore: 0.1,
            normalizationMethod: 'fallback',
            normalizationRules: ['fallback'],
            hasAcronymExpansion: false,
            hasUnitNormalization: !!bacnetPoint.units,
            hasContextInference: false,
            requiresManualReview: true,
            normalizedAt: new Date(),
            normalizedBy: 'system'
          };

          normalizedPoints.push(fallbackPoint);

          debugLog(processingId, 'NORMALIZING', 'Fallback point created', {
            index,
            originalName: pointName,
            fallbackName: fallbackPoint.normalizedName
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
      onStatusUpdate?.({
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
            category: HaystackTagCategory.CUSTOM,
            isMarker: true,
            isValid: true,
            source: 'inferred' as const,
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

        } catch (error) {
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
            category: HaystackTagCategory.CUSTOM,
            isMarker: true,
            isValid: true,
            source: 'inferred' as const,
            confidence: 0.5,
            appliedAt: new Date()
          }]; // Fallback to basic tag
          totalTags += 1;
        }

        // Update progress during tagging
        if (i % Math.max(1, Math.floor(normalizedPoints.length / 10)) === 0) {
          onStatusUpdate?.({
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

      // Persist equipment and points to the database
      try {
        await this.equipmentDbService.storeEquipmentWithPoints(fileId, baseEquipment, normalizedPoints);
        debugLog(processingId, 'DATABASE', 'Equipment and points stored in database', {
          equipmentId: baseEquipment.id,
          pointCount: normalizedPoints.length
        });
      } catch (dbError) {
        debugLog(processingId, 'DATABASE', 'Failed to store equipment and points', {
          error: dbError instanceof Error ? dbError.message : dbError
        });
        throw dbError;
      }

      // Final status update
      onStatusUpdate?.({
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

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      debugLog(processingId, 'ERROR', 'Processing failed with error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        stageBreakdown: debugInfo.stages
      });
      
      onStatusUpdate?.({
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

  private extractObjectType(bacnetCur?: string): string | undefined {
    if (!bacnetCur) return undefined;
    const match = bacnetCur.match(/^([a-zA-Z_]+)/);
    return match ? match[1] : undefined;
  }

  private extractObjectInstance(bacnetCur?: string): number | undefined {
    if (!bacnetCur) return undefined;
    
    // Extract object instance from BACnet current value (e.g., "AI39" -> 39)
    const match = bacnetCur.match(/^[A-Z]{2}(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private determineDataType(record: Record<string, unknown>): PointDataType {
    const kind = record.kind as string;
    const objectType = this.extractObjectType(record.bacnetCur as string | undefined);

    if (kind?.toLowerCase() === 'bool') return PointDataType.BOOLEAN;
    if (kind?.toLowerCase() === 'number') return PointDataType.NUMBER;
    if (kind?.toLowerCase() === 'str') return PointDataType.STRING;

    if (objectType) {
      if (objectType.startsWith('BI') || objectType.startsWith('BO') || objectType.startsWith('BV')) {
        return PointDataType.BOOLEAN;
      }
      if (objectType.startsWith('AI') || objectType.startsWith('AO') || objectType.startsWith('AV')) {
        return PointDataType.NUMBER;
      }
      if (objectType.startsWith('MSI') || objectType.startsWith('MSO') || objectType.startsWith('MSV')) {
        return PointDataType.ENUMERATED;
      }
    }

    if (record.enum) return PointDataType.ENUMERATED;

    return PointDataType.STRING;
  }

  /**
   * Generates a basic set of Haystack tags based on the normalized point data.
   */
  private generateBasicHaystackTags(point: NormalizedPoint): string[] {
    const tags: string[] = ['point'];

    if (point.pointFunction === PointFunction.Sensor) {
      tags.push('sensor');
    }
    if (point.pointFunction === PointFunction.Command) {
      tags.push('cmd');
    }
    if (point.pointFunction === PointFunction.Setpoint) {
      tags.push('sp');
    }

    if (point.objectType?.startsWith('AI') || point.objectType?.startsWith('BI')) {
      tags.push('input');
    } else if (point.objectType?.startsWith('AO') || point.objectType?.startsWith('BO')) {
      tags.push('output');
    }

    if (point.units) {
      if (/%/.test(point.units)) tags.push('percentage');
      if (/°[CF]/.test(point.units)) tags.push('temp');
      if (/pa|psi|bar/i.test(point.units)) tags.push('pressure');
      if (/cfm|gpm|lps/i.test(point.units)) tags.push('flow');
      if (/kw|wh/i.test(point.units)) tags.push('power');
    }

    return tags;
  }

  // Method to get processing status for long-running operations
  async getProcessingStatus(fileId: string): Promise<ProcessingStatus | null> {
    // This would typically query a database or cache
    // For now, return null indicating no status found
    return null;
  }

  // Method to cancel processing (for future implementation)
  async cancelProcessing(fileId: string): Promise<boolean> {
    // Implementation would depend on how background processing is handled
    return false;
  }
}

export const processingService = new ProcessingService();
