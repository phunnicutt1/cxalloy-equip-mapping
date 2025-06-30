import { readFile } from 'fs/promises';
import path from 'path';
import { TrioParser } from '../parsers/trio-parser';
import { EquipmentClassifier } from '../classifiers/equipment-classifier';
import { PointNormalizer } from '../normalizers/point-normalizer';
import { HaystackTagger } from '../../../lib/taggers/haystack-tagger';
import type { Equipment, NormalizedPoint } from '../../types/equipment';
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
    
    try {
      // Update status: Starting parsing
      onStatusUpdate?.({
        stage: 'parsing',
        progress: 10,
        message: 'Parsing trio file...'
      });

      // Step 1: Parse trio file
      const filepath = path.join(process.cwd(), 'uploads', `${fileId}_${filename}`);
      const fileContent = await readFile(filepath, 'utf-8');
      const parseResult = TrioParser.parseTrioFile(filename, fileContent);

      if (!parseResult.isValid || !parseResult.sections || parseResult.sections.length === 0) {
        return {
          success: false,
          error: parseResult.metadata.errors.map(e => e.message).join(', ') || 'Failed to parse trio file'
        };
      }

      // Update status: Classifying equipment
      onStatusUpdate?.({
        stage: 'classifying',
        progress: 30,
        message: 'Classifying equipment type...'
      });

      // Step 2: Classify equipment
      const equipmentType = EquipmentClassifier.classifyFromFilename(filename);
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

      // Update status: Normalizing points
      onStatusUpdate?.({
        stage: 'normalizing',
        progress: 50,
        message: 'Normalizing point names...'
      });

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

      for (let i = 0; i < allRecords.length; i++) {
        const point = allRecords[i];
        const originalName = point.dis || point.id || `Point_${i}`;
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
          id: `${fileId}_point_${i}`,
          originalName,
          normalizedName,
          description: point.bacnetDesc || undefined,
          unit: point.unit || undefined,
          dataType: point.kind || undefined,
          kind: point.kind || undefined,
          bacnetCur: point.bacnetCur || undefined,
          objectType: this.extractObjectType(point.bacnetCur),
          writable: !!point.writable,
          haystackTags: []
        };

        normalizedPoints.push(normalizedPoint);

        // Update progress during normalization
        if (i % Math.max(1, Math.floor(allRecords.length / 10)) === 0) {
          onStatusUpdate?.({
            stage: 'normalizing',
            progress: 50 + (i / allRecords.length) * 20,
            message: `Normalizing points... (${i + 1}/${allRecords.length})`
          });
        }
      }

      // Update status: Generating Haystack tags
      onStatusUpdate?.({
        stage: 'tagging',
        progress: 80,
        message: 'Generating Haystack tags...'
      });

      // Step 4: Generate Haystack tags
      for (let i = 0; i < normalizedPoints.length; i++) {
        const point = normalizedPoints[i];
        try {
          // Generate basic Haystack tags based on point properties
          const tags = this.generateBasicHaystackTags(point);
          point.haystackTags = tags;
        } catch (error) {
          console.warn(`Failed to generate Haystack tags for point ${point.originalName}:`, error);
          point.haystackTags = ['point']; // Fallback to basic tag
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

      // Update equipment with points
      baseEquipment.points = normalizedPoints;

      // Final status update
      onStatusUpdate?.({
        stage: 'completed',
        progress: 100,
        message: `Processing completed. ${normalizedPoints.length} points processed.`
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        equipment: baseEquipment,
        points: normalizedPoints,
        duration
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      
      onStatusUpdate?.({
        stage: 'error',
        progress: 0,
        message: 'Processing failed',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
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
    if (point.unit) {
      const unit = point.unit.toLowerCase();
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