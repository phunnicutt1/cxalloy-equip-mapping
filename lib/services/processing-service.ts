import { readFile } from 'fs/promises';
import path from 'path';
import { TrioParser } from '../parsers/trio-parser';
import { EquipmentClassifier } from '../classifiers/equipment-classifier';
import { PointNormalizer } from '../normalizers/point-normalizer';
import { HaystackTagger } from '../taggers/haystack-tagger';
import type { Equipment } from '../../types/equipment';
import type { NormalizedPoint } from '../../types/normalized';
import { PointFunction, NormalizationConfidence } from '../../types/normalized';
import { BACnetObjectType, PointCategory, PointDataType } from '../../types/point';
import { HaystackTagCategory } from '../../types/haystack';
import { EquipmentStatus, ConnectionState, EquipmentType } from '../../types/equipment';
import type { TrioRecord } from '../../types/trio';

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
function debugLog(processingId: string, stage: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[PROCESSING DEBUG ${timestamp}] [${processingId}] [${stage}] ${message}`, 
    data ? JSON.stringify(data, null, 2) : '');
}

export class ProcessingService {
  private tagger: HaystackTagger;

  constructor() {
    this.tagger = new HaystackTagger();
  }

  async processFile(
    fileId: string,
    filename: string,
    onStatusUpdate?: (status: ProcessingStatus) => void
  ): Promise<ProcessingResult> {
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
      // Update status: Starting parsing
      const parsingStartTime = Date.now();
      onStatusUpdate?.({
        stage: 'parsing',
        progress: 10,
        message: 'Parsing trio file...'
      });

      debugLog(processingId, 'PARSING', 'Starting trio file parsing', { filename });

      // Step 1: Parse trio file
      const filepath = path.join(process.cwd(), 'uploads', `${fileId}_${filename}`);
      
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
      const equipmentType = EquipmentClassifier.classifyFromFilename(filename);
      
      debugInfo.stages.classifying.duration = Date.now() - classifyingStartTime;
      debugInfo.stages.classifying.equipmentType = equipmentType.equipmentType;
      debugInfo.stages.classifying.confidence = equipmentType.confidence;
      
      debugLog(processingId, 'CLASSIFYING', 'Classification completed', {
        equipmentType: equipmentType.equipmentType,
        confidence: equipmentType.confidence,
        matchedPattern: equipmentType.matchedPattern,
        alternatives: equipmentType.alternatives,
        duration: debugInfo.stages.classifying.duration
      });

      const baseEquipment: Equipment = {
        id: fileId,
        name: this.extractEquipmentName(filename),
        displayName: this.extractEquipmentName(filename),
        type: equipmentType.equipmentType,
        filename: filename,
        vendor: 'Unknown',
        modelName: 'Unknown',
        description: `${equipmentType.equipmentType} parsed from ${filename}`,
        status: EquipmentStatus.OPERATIONAL,
        connectionState: ConnectionState.OPEN,
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
      onStatusUpdate?.({
        stage: 'normalizing',
        progress: 50,
        message: 'Normalizing point names...'
      });

      debugLog(processingId, 'NORMALIZING', 'Starting point normalization');

      // Step 3: Normalize points
      const normalizedPoints: NormalizedPoint[] = [];
      
      // Extract all records from all sections
      const allRecords: any[] = [];
      parseResult.sections.forEach(section => {
        if (section.records) {
          section.records.forEach(record => {
            // Convert TrioRecord to a more usable format
            const recordData: any = {};
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
            objectType: this.extractObjectType(point.bacnetCur) as any,
            objectInstance: this.extractObjectInstance(point.bacnetCur) || i,
            dis: originalName,
            displayName: originalName,
            description: point.bacnetDesc || '',
            dataType: point.kind as any || 'String',
            units: point.unit,
            category: 'unknown' as any,
            isWritable: !!point.writable,
            isCommand: !!point.cmd,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const normalizationResult = PointNormalizer.normalizePointName(
            bacnetPoint,
            { equipmentType: equipmentType.equipmentType }
          );
          
          const normalizedName = normalizationResult.normalizedPoint?.normalizedName || originalName;

          const normalizedPoint: NormalizedPoint = {
            originalPointId: `${fileId}_point_${i}`,
            equipmentId: baseEquipment.id,
            originalName,
            originalDescription: point.bacnetDesc || '',
            objectName: originalName,
            normalizedName,
            expandedDescription: normalizedName || originalName,
            pointFunction: PointFunction.UNKNOWN,
            category: PointCategory.SENSOR, // Default category
            dataType: point.kind || 'string',
            units: point.unit,
            objectType: this.extractObjectType(point.bacnetCur) as BACnetObjectType || BACnetObjectType.ANALOG_INPUT,
            haystackTags: [],
            confidence: NormalizationConfidence.MEDIUM,
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

        } catch (error) {
          debugLog(processingId, 'NORMALIZING', `Point normalization failed`, {
            index: i,
            originalName,
            error: error instanceof Error ? error.message : error
          });
        }

        // Update progress during normalization
        if (i % Math.max(1, Math.floor(allRecords.length / 10)) === 0) {
          onStatusUpdate?.({
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

  private extractEquipmentName(filename: string): string {
    // Remove file extension and clean up the name
    const nameWithoutExt = path.basename(filename, path.extname(filename));
    
    // Remove common prefixes/suffixes and clean up
    const cleaned = nameWithoutExt
      .replace(/^(equipment_|equip_|unit_)/i, '')
      .replace(/(_\d+)?$/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    return cleaned || 'Unknown Equipment';
  }

  private extractObjectType(bacnetCur?: string): string | undefined {
    if (!bacnetCur) return undefined;
    
    // Extract object type from BACnet current value (e.g., "AI39" -> "AI")
    const match = bacnetCur.match(/^([A-Z]{2})/);
    return match ? match[1] : undefined;
  }

  private extractObjectInstance(bacnetCur?: string): number | undefined {
    if (!bacnetCur) return undefined;
    
    // Extract object instance from BACnet current value (e.g., "AI39" -> 39)
    const match = bacnetCur.match(/^[A-Z]{2}(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private generateBasicHaystackTags(point: NormalizedPoint): string[] {
    const tags: string[] = ['point'];
    
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