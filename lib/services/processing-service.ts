import { readFile } from 'fs/promises';
import { join } from 'path';
import { TrioParser } from '../parsers/trio-parser';
import { EquipmentClassifier } from '../classifiers/equipment-classifier';
import { PointNormalizer } from '../normalizers/point-normalizer';
import { HaystackTagger } from '../../../lib/taggers/haystack-tagger';
import type { BACnetPoint } from '@/types/point';
import { Equipment, EquipmentStatus, ConnectionState } from '@/types/equipment';
import type { NormalizedPoint } from '@/types/normalized';
import type { HaystackTagSet } from '@/types/haystack';

export interface ProcessingOptions {
  enableNormalization?: boolean;
  enableHaystackTagging?: boolean;
  strictValidation?: boolean;
  includeVendorTags?: boolean;
  confidenceThreshold?: number;
}

export interface ProcessingResult {
  success: boolean;
  fileId: string;
  fileName: string;
  equipment: Equipment[];
  totalPoints: number;
  processedPoints: number;
  normalizedPoints: NormalizedPoint[];
  haystackTagSets: HaystackTagSet[];
  processingTime: number;
  warnings: string[];
  errors: string[];
  metadata: {
    parseTime: number;
    classificationTime: number;
    normalizationTime: number;
    taggingTime: number;
  };
}

export interface ProcessingStatus {
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  result?: ProcessingResult;
  error?: string;
}

class ProcessingService {
  private static instance: ProcessingService;
  private processingJobs = new Map<string, ProcessingStatus>();
  private uploadDir = join(process.cwd(), 'uploads');

  private constructor() {}

  static getInstance(): ProcessingService {
    if (!ProcessingService.instance) {
      ProcessingService.instance = new ProcessingService();
    }
    return ProcessingService.instance;
  }

  /**
   * Process uploaded trio file through all engines
   */
  async processFile(
    fileId: string,
    fileName: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const job: ProcessingStatus = {
      fileId,
      status: 'processing',
      progress: 0,
      currentStep: 'Reading file',
      startTime: new Date()
    };

    this.processingJobs.set(fileId, job);

    try {
      // Step 1: Read file content
      job.currentStep = 'Reading file content';
      job.progress = 10;
      this.processingJobs.set(fileId, { ...job });

      const filePath = join(this.uploadDir, `${fileId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
      const fileContent = await readFile(filePath, 'utf-8');

      // Step 2: Parse trio file
      job.currentStep = 'Parsing trio file';
      job.progress = 20;
      this.processingJobs.set(fileId, { ...job });

      const parseStartTime = Date.now();
      const parseResult = TrioParser.parseTrioFile(fileName, fileContent);
      const parseTime = Date.now() - parseStartTime;

      if (!parseResult.isValid) {
        throw new Error(`Failed to parse trio file: ${parseResult.metadata.errors.map(e => e.message).join(', ')}`);
      }

      // Step 3: Classify equipment
      job.currentStep = 'Classifying equipment';
      job.progress = 30;
      this.processingJobs.set(fileId, { ...job });

      const classificationStartTime = Date.now();
      const classificationResult = EquipmentClassifier.classifyFromFilename(fileName);
      const classificationTime = Date.now() - classificationStartTime;

      // Step 4: Convert trio records to BACnet points
      job.currentStep = 'Converting to BACnet points';
      job.progress = 40;
      this.processingJobs.set(fileId, { ...job });

      const bacnetPoints: BACnetPoint[] = [];
      for (const section of parseResult.sections) {
        if (section.records) {
          for (const record of section.records) {
            const point = TrioParser.trioRecordToBACnetPoint(record, classificationResult.equipmentName);
            if (point) {
              bacnetPoints.push(point);
            }
          }
        }
      }

      // Step 5: Create equipment object
      const equipment: Equipment = {
        id: fileId,
        name: classificationResult.equipmentName,
        displayName: classificationResult.equipmentName,
        type: classificationResult.equipmentType,
        filename: fileName,
        vendor: 'Unknown',
        modelName: 'Unknown',
        description: `${classificationResult.equipmentType} - ${classificationResult.equipmentName}`,
        status: EquipmentStatus.OPERATIONAL,
        connectionState: ConnectionState.OPEN,
        connectionStatus: 'ok',
        createdAt: new Date(),
        updatedAt: new Date(),
        points: bacnetPoints.map(point => ({
          id: point.objectName,
          originalName: point.dis || point.objectName,
          normalizedName: point.dis || point.objectName,
          description: point.description || '',
          objectType: point.objectType || 'AI',
          unit: point.units,
          dataType: point.dataType || 'Number',
          kind: point.dataType || 'Number',
          bacnetCur: point.objectName,
          writable: point.objectType?.includes('O') || false,
          haystackTags: []
        }))
      };

      // Step 6: Normalize points (if enabled)
      job.currentStep = 'Normalizing point names';
      job.progress = 60;
      this.processingJobs.set(fileId, { ...job });

      const normalizedPoints: NormalizedPoint[] = [];
      let normalizationTime = 0;

      if (options.enableNormalization !== false) {
        const normalizationStartTime = Date.now();
        
        for (const point of bacnetPoints) {
          const normalizationResult = PointNormalizer.normalizePointName(point, {
            equipmentType: classificationResult.equipmentType,
            equipmentName: classificationResult.equipmentName
          });

          if (normalizationResult.success && normalizationResult.normalizedPoint) {
            normalizedPoints.push(normalizationResult.normalizedPoint);
            
            // Update equipment point with normalized data
            const equipmentPoint = equipment.points?.find(p => p.id === point.objectName);
            if (equipmentPoint) {
              equipmentPoint.normalizedName = normalizationResult.normalizedPoint.normalizedName;
              equipmentPoint.description = normalizationResult.normalizedPoint.expandedDescription || normalizationResult.normalizedPoint.originalDescription;
            }
          }
        }
        
        normalizationTime = Date.now() - normalizationStartTime;
      }

      // Step 7: Generate Haystack tags (if enabled)
      job.currentStep = 'Generating Haystack tags';
      job.progress = 80;
      this.processingJobs.set(fileId, { ...job });

      const haystackTagSets: HaystackTagSet[] = [];
      let taggingTime = 0;

      if (options.enableHaystackTagging !== false && normalizedPoints.length > 0) {
        const taggingStartTime = Date.now();
        const tagger = new HaystackTagger({
          enableSemanticInference: true,
          includeVendorTags: options.includeVendorTags !== false,
          strictValidation: options.strictValidation !== false,
          confidenceThreshold: options.confidenceThreshold || 0.7
        });

        for (const normalizedPoint of normalizedPoints) {
          const tagSet = await tagger.generateHaystackTags(normalizedPoint);
          haystackTagSets.push(tagSet);

          // Update equipment point with Haystack tags
          const equipmentPoint = equipment.points?.find(p => p.id === normalizedPoint.originalPointId);
          if (equipmentPoint) {
            equipmentPoint.haystackTags = tagSet.tags.map(tag => tag.name);
          }
        }

        taggingTime = Date.now() - taggingStartTime;
      }

      // Step 8: Finalize result
      job.currentStep = 'Finalizing results';
      job.progress = 100;
      job.status = 'completed';
      job.endTime = new Date();

      const processingTime = Date.now() - startTime;
      const result: ProcessingResult = {
        success: true,
        fileId,
        fileName,
        equipment: [equipment],
        totalPoints: bacnetPoints.length,
        processedPoints: normalizedPoints.length,
        normalizedPoints,
        haystackTagSets,
        processingTime,
        warnings: parseResult.metadata.warnings.map(w => w.message),
        errors: parseResult.metadata.errors.map(e => e.message),
        metadata: {
          parseTime,
          classificationTime,
          normalizationTime,
          taggingTime
        }
      };

      job.result = result;
      this.processingJobs.set(fileId, job);

      return result;

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error instanceof Error ? error.message : 'Processing failed';
      this.processingJobs.set(fileId, job);

      throw error;
    }
  }

  /**
   * Get processing status for a file
   */
  getProcessingStatus(fileId: string): ProcessingStatus | null {
    return this.processingJobs.get(fileId) || null;
  }

  /**
   * Get all processing jobs
   */
  getAllProcessingJobs(): ProcessingStatus[] {
    return Array.from(this.processingJobs.values());
  }

  /**
   * Process multiple files in batch
   */
  async processBatch(
    files: Array<{ fileId: string; fileName: string }>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.processFile(file.fileId, file.fileName, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          fileId: file.fileId,
          fileName: file.fileName,
          equipment: [],
          totalPoints: 0,
          processedPoints: 0,
          normalizedPoints: [],
          haystackTagSets: [],
          processingTime: 0,
          warnings: [],
          errors: [error instanceof Error ? error.message : 'Processing failed'],
          metadata: {
            parseTime: 0,
            classificationTime: 0,
            normalizationTime: 0,
            taggingTime: 0
          }
        });
      }
    }

    return results;
  }

  /**
   * Clear completed jobs older than specified time
   */
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    let cleaned = 0;

    for (const [fileId, job] of this.processingJobs.entries()) {
      if (job.endTime && job.endTime < cutoffTime) {
        this.processingJobs.delete(fileId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export const processingService = ProcessingService.getInstance(); 