import Papa from 'papaparse';
import { 
  EnhancedConnectorData, 
  FieldDetectionPatterns, 
  CsvProcessingResult,
  EquipmentType,
  EquipmentStatus,
  ConnectionState
} from '@/types/equipment';
import { FileProcessingResult, ProcessingOptions } from '../parsers/file-processor';
import { EquipmentClassifier } from '../classifiers/equipment-classifier';
import { EquipmentDatabaseService } from '../database/equipment-db-service';
import { nanoid } from 'nanoid';

/**
 * Enhanced CSV Processor with dynamic field detection and fallback mechanisms
 * Handles variable CSV structures with vendor, model, description, and location field detection
 */
export class EnhancedCsvProcessor {
  private static readonly DEFAULT_PATTERNS: FieldDetectionPatterns = {
    vendor: [
      /vendor/i,
      /manufacturer/i,
      /brand/i,
      /maker/i,
      /company/i,
      /mfg/i
    ],
    model: [
      /model/i,
      /type/i,
      /product/i,
      /series/i,
      /part/i
    ],
    description: [
      /description/i,
      /desc/i,
      /name/i,
      /title/i,
      /label/i,
      /info/i
    ],
    location: [
      /location/i,
      /place/i,
      /room/i,
      /zone/i,
      /area/i,
      /site/i,
      /building/i,
      /floor/i
    ],
    deviceName: [
      /device/i,
      /equipment/i,
      /unit/i,
      /system/i,
      /controller/i
    ],
    equipmentName: [
      /equipment/i,
      /name/i,
      /device/i,
      /unit/i,
      /id/i,
      /identifier/i
    ]
  };

  private static readonly FALLBACK_FIELDS = [
    'dis', 'DIS', 'display', 'Display',
    'name', 'Name', 'NAME',
    'id', 'Id', 'ID',
    'equipment', 'Equipment', 'EQUIPMENT'
  ];

  /**
   * Process CSV file with enhanced field detection
   */
  static async processCsvFile(
    fileName: string,
    content: string,
    options: ProcessingOptions = {}
  ): Promise<CsvProcessingResult> {
    const startTime = Date.now();
    
    console.log(`[Enhanced CSV Processor] Starting processing of ${fileName}`);
    
    const result: CsvProcessingResult = {
      success: false,
      connectorData: [],
      errors: [],
      warnings: [],
      metadata: {
        totalRecords: 0,
        processedRecords: 0,
        fieldDetectionAccuracy: 0,
        commonPatterns: {},
        processingTime: 0
      }
    };

    try {
      // Step 1: Parse CSV with Papa Parse
      console.log(`[Enhanced CSV Processor] Parsing CSV content`);
      const parseResult = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
        transformHeader: (header: string) => header.trim()
      });

      if (parseResult.errors.length > 0) {
        result.errors.push(...parseResult.errors.map(err => err.message));
        if (options.strictMode) {
          throw new Error(`CSV parsing failed: ${parseResult.errors.map(err => err.message).join(', ')}`);
        }
      }

      const records = parseResult.data as Record<string, string>[];
      result.metadata.totalRecords = records.length;
      
      if (records.length === 0) {
        result.warnings.push('No records found in CSV file');
        return result;
      }

      // Step 2: Detect field patterns
      const headers = Object.keys(records[0]);
      console.log(`[Enhanced CSV Processor] Detected headers:`, headers);
      
      const fieldMappings = this.detectDescriptiveFields(headers);
      console.log(`[Enhanced CSV Processor] Field mappings:`, fieldMappings);

      // Step 3: Process each record
      let successfulRecords = 0;
      let totalConfidence = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          const enhancedData = this.processRecord(record, fieldMappings, fileName, headers);
          result.connectorData.push(enhancedData);
          successfulRecords++;
          totalConfidence += enhancedData.fieldMappings.confidence;
        } catch (error) {
          const errorMsg = `Record ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.warn(`[Enhanced CSV Processor] ${errorMsg}`);
        }
      }

      result.metadata.processedRecords = successfulRecords;
      result.metadata.fieldDetectionAccuracy = successfulRecords > 0 ? totalConfidence / successfulRecords : 0;
      result.success = successfulRecords > 0;

      // Step 4: Generate pattern statistics
      result.metadata.commonPatterns = this.analyzePatterns(fieldMappings, headers);

      console.log(`[Enhanced CSV Processor] Processing complete: ${successfulRecords}/${result.metadata.totalRecords} records processed`);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown processing error';
      result.errors.push(errorMsg);
      console.error(`[Enhanced CSV Processor] Processing failed:`, error);
    } finally {
      result.metadata.processingTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Convert CSV processing result to FileProcessingResult for compatibility
   */
  static async convertToFileProcessingResult(
    csvResult: CsvProcessingResult,
    fileName: string
  ): Promise<FileProcessingResult[]> {
    const results: FileProcessingResult[] = [];

    for (const connectorData of csvResult.connectorData) {
      // Classify equipment from enhanced data
      const classification = EquipmentClassifier.classifyFromFilename(connectorData.equipmentName);
      
      const fileResult: FileProcessingResult = {
        fileName: connectorData.fileName,
        equipmentClassification: classification,
        trioParseResult: null, // CSV files don't have trio data
        bacnetPoints: [], // Will be populated later if needed
        equipmentSource: {
          id: nanoid(),
          name: connectorData.equipmentName,
          type: classification.equipmentType as EquipmentType,
          fileName: connectorData.fileName,
          points: [],
          metadata: {
            classification,
            connector: connectorData,
            processingDate: new Date().toISOString(),
            pointCount: 0,
            confidence: connectorData.fieldMappings.confidence
          },
          status: 'active',
          tags: []
        },
        processingTime: csvResult.metadata.processingTime,
        success: true,
        errors: [],
        warnings: [],
        metadata: {
          fileSize: 0, // Not applicable for individual records
          totalPoints: 0,
          validPoints: 0,
          processingSteps: ['CSV Processing', 'Field Detection', 'Equipment Classification']
        }
      };

      results.push(fileResult);
    }

    return results;
  }

  /**
   * Detect descriptive fields using pattern matching
   */
  private static detectDescriptiveFields(headers: string[]): Record<string, string | null> {
    const mappings: Record<string, string | null> = {
      vendor: null,
      model: null,
      description: null,
      location: null,
      deviceName: null,
      equipmentName: null
    };

    // Score each header against each pattern category
    for (const header of headers) {
      let bestMatch: { category: string; score: number } | null = null;

      for (const [category, patterns] of Object.entries(this.DEFAULT_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(header)) {
            const score = this.calculatePatternScore(header, pattern);
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { category, score };
            }
          }
        }
      }

      // Assign the best match if confidence is high enough
      if (bestMatch && bestMatch.score > 0.7) {
        mappings[bestMatch.category] = header;
      }
    }

    return mappings;
  }

  /**
   * Calculate pattern matching score
   */
  private static calculatePatternScore(header: string, pattern: RegExp): number {
    const match = header.match(pattern);
    if (!match) return 0;

    // Higher score for exact matches
    if (match[0] === header.toLowerCase()) return 1.0;
    
    // Score based on match length relative to header length
    return match[0].length / header.length;
  }

  /**
   * Process individual CSV record with enhanced metadata
   */
  private static processRecord(
    record: Record<string, string>,
    fieldMappings: Record<string, string | null>,
    fileName: string,
    headers: string[]
  ): EnhancedConnectorData {
    // Extract mapped fields
    const vendor = this.extractFieldValue(record, fieldMappings.vendor);
    const model = this.extractFieldValue(record, fieldMappings.model);
    const description = this.extractFieldValue(record, fieldMappings.description);
    const location = this.extractFieldValue(record, fieldMappings.location);
    const deviceName = this.extractFieldValue(record, fieldMappings.deviceName);
    const equipmentName = this.extractFieldValue(record, fieldMappings.equipmentName);

    // Generate fallback description using priority strategy
    const fallbackResult = this.generateFallbackDescription(record, {
      vendor,
      model,
      description,
      deviceName,
      equipmentName
    });

    // Calculate field mapping confidence
    const mappedFieldCount = Object.values(fieldMappings).filter(v => v !== null).length;
    const confidence = mappedFieldCount / Object.keys(fieldMappings).length;

    // Extract additional fields not in main mappings
    const additionalFields: Record<string, string> = {};
    const mappedHeaders = new Set(Object.values(fieldMappings).filter(v => v !== null));
    
    for (const header of headers) {
      if (!mappedHeaders.has(header) && record[header]) {
        additionalFields[header] = record[header];
      }
    }

    const enhancedData: EnhancedConnectorData = {
      // Basic fields (maintaining compatibility)
      fileName,
      equipmentName: equipmentName || fallbackResult.equipmentName || fileName,
      vendor: vendor || undefined,
      model: model || undefined,
      description: description || undefined,
      deviceName: deviceName || undefined,
      
      // Enhanced fields
      vendorName: vendor || undefined,
      modelName: model || undefined,
      location: location || undefined,
      fullDescription: fallbackResult.fullDescription,
      additionalFields,
      
      // Field mapping metadata
      fieldMappings: {
        detectedVendorField: fieldMappings.vendor || undefined,
        detectedModelField: fieldMappings.model || undefined,
        detectedDescriptionField: fieldMappings.description || undefined,
        detectedLocationField: fieldMappings.location || undefined,
        fallbackUsed: fallbackResult.strategy,
        confidence
      },
      
      // Processing metadata
      processingMetadata: {
        csvHeaders: headers,
        totalFields: headers.length,
        mappedFields: mappedFieldCount,
        processingTimestamp: new Date().toISOString(),
        enhancedProcessing: true
      }
    };

    return enhancedData;
  }

  /**
   * Extract field value with null checking
   */
  private static extractFieldValue(record: Record<string, string>, fieldName: string | null): string | null {
    if (!fieldName || !record[fieldName]) return null;
    const value = record[fieldName].trim();
    return value || null;
  }

  /**
   * Generate fallback description using priority strategy
   */
  private static generateFallbackDescription(
    record: Record<string, string>,
    extractedFields: {
      vendor: string | null;
      model: string | null;
      description: string | null;
      deviceName: string | null;
      equipmentName: string | null;
    }
  ): { fullDescription: string; equipmentName: string; strategy: string } {
    const parts: string[] = [];
    let strategy = 'combined_fields';
    let equipmentName = '';

    // Priority 1: Use vendor + model if available
    if (extractedFields.vendor && extractedFields.model) {
      parts.push(`${extractedFields.vendor} ${extractedFields.model}`);
      equipmentName = extractedFields.equipmentName || extractedFields.deviceName || extractedFields.model;
      strategy = 'vendor_model';
    }
    // Priority 2: Use description if available
    else if (extractedFields.description) {
      parts.push(extractedFields.description);
      equipmentName = extractedFields.equipmentName || extractedFields.deviceName || extractedFields.description;
      strategy = 'description_field';
    }
    // Priority 3: Use device name
    else if (extractedFields.deviceName) {
      parts.push(extractedFields.deviceName);
      equipmentName = extractedFields.equipmentName || extractedFields.deviceName;
      strategy = 'device_name';
    }
    // Priority 4: Use equipment name
    else if (extractedFields.equipmentName) {
      parts.push(extractedFields.equipmentName);
      equipmentName = extractedFields.equipmentName;
      strategy = 'equipment_name';
    }
    // Priority 5: Search for DIS or fallback fields
    else {
      for (const fallbackField of this.FALLBACK_FIELDS) {
        if (record[fallbackField]) {
          parts.push(record[fallbackField]);
          equipmentName = record[fallbackField];
          strategy = `fallback_field_${fallbackField}`;
          break;
        }
      }
    }

    // Add additional context if available
    if (extractedFields.vendor && !parts.some(p => p.includes(extractedFields.vendor!))) {
      parts.push(`(${extractedFields.vendor})`);
    }

    const fullDescription = parts.length > 0 ? parts.join(' ') : 'Unknown Equipment';
    
    return {
      fullDescription,
      equipmentName: equipmentName || 'Unknown',
      strategy
    };
  }

  /**
   * Analyze field detection patterns for reporting
   */
  private static analyzePatterns(
    fieldMappings: Record<string, string | null>,
    headers: string[]
  ): Record<string, number> {
    const patterns: Record<string, number> = {};

    // Count successful mappings
    for (const [category, header] of Object.entries(fieldMappings)) {
      if (header) {
        patterns[`detected_${category}`] = 1;
      }
    }

    // Count header patterns
    patterns['total_headers'] = headers.length;
    patterns['mapped_headers'] = Object.values(fieldMappings).filter(v => v !== null).length;

    return patterns;
  }

  /**
   * Process and store CSV equipment data using existing database service
   */
  static async processAndStoreCSV(
    fileName: string,
    content: string,
    sessionId?: string,
    options: ProcessingOptions = {}
  ): Promise<{ success: boolean; processedCount: number; errors: string[] }> {
    console.log(`[Enhanced CSV Processor] Processing and storing ${fileName}`);

    try {
      // Process CSV file
      const csvResult = await this.processCsvFile(fileName, content, options);
      
      if (!csvResult.success) {
        return {
          success: false,
          processedCount: 0,
          errors: csvResult.errors
        };
      }

      // Convert to equipment and store in database
      const databaseService = new EquipmentDatabaseService();
      let processedCount = 0;
      const errors: string[] = [];

      for (const connectorData of csvResult.connectorData) {
        try {
          // Create equipment object from connector data
          const equipment = {
            id: nanoid(),
            name: connectorData.equipmentName,
            displayName: connectorData.equipmentName,
            type: EquipmentClassifier.classifyFromFilename(connectorData.equipmentName).equipmentType,
            filename: fileName,
            vendor: connectorData.vendor || connectorData.vendorName || 'Unknown',
            modelName: connectorData.model || connectorData.modelName || 'Unknown',
            description: connectorData.fullDescription,
            location: connectorData.location,
            status: EquipmentStatus.OPERATIONAL,
            connectionState: ConnectionState.OPEN,
            connectionStatus: 'ok',
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              deviceName: connectorData.deviceName,
              uri: connectorData.uri,
              customFields: {
                ...connectorData.additionalFields,
                enhancedProcessing: 'true',
                fieldMappings: JSON.stringify(connectorData.fieldMappings),
                processingMetadata: JSON.stringify(connectorData.processingMetadata),
                fullDescription: connectorData.fullDescription,
                fallbackStrategy: connectorData.fieldMappings.fallbackUsed,
                fieldDetectionConfidence: connectorData.fieldMappings.confidence.toString()
              }
            }
          };

          // Store equipment with empty points array (CSV files don't contain point data)
          await databaseService.storeEquipmentWithPoints(
            fileName,
            equipment,
            [],
            sessionId
          );

          processedCount++;
          console.log(`[Enhanced CSV Processor] Stored equipment: ${equipment.name}`);

        } catch (error) {
          const errorMsg = `Failed to store equipment ${connectorData.equipmentName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`[Enhanced CSV Processor] ${errorMsg}`);
        }
      }

      return {
        success: processedCount > 0,
        processedCount,
        errors
      };

    } catch (error) {
      console.error(`[Enhanced CSV Processor] Processing failed:`, error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown processing error']
      };
    }
  }
}

// Export convenience functions for backwards compatibility
export async function processCSVFile(
  fileName: string,
  content: string,
  options?: ProcessingOptions
): Promise<CsvProcessingResult> {
  return EnhancedCsvProcessor.processCsvFile(fileName, content, options);
}

export async function processAndStoreCSV(
  fileName: string,
  content: string,
  sessionId?: string,
  options?: ProcessingOptions
): Promise<{ success: boolean; processedCount: number; errors: string[] }> {
  return EnhancedCsvProcessor.processAndStoreCSV(fileName, content, sessionId, options);
} 