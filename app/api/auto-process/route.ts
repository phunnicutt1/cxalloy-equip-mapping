// app/api/auto-process/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { fileScannerService } from '../../../lib/services/file-scanner-service';
import { parseTrioFileFromContent } from '../../../lib/parsers/trio-parser';
import { classifyEquipment, getEquipmentTypeFromName } from '../../../lib/classifiers/equipment-classifier';
import { PointNormalizer } from '../../../lib/normalizers/point-normalizer';
import { generateHaystackTags } from '../../../lib/taggers/haystack-tagger';
import { EquipmentDatabaseService } from '../../../lib/database/equipment-db-service';
import { BACnetObjectType, PointDataType, PointCategory } from '../../../types/point';
import { Equipment, EquipmentStatus, ConnectionState } from '../../../types/equipment';
import { NormalizedPoint } from '../../../types/normalized';
import { nanoid } from 'nanoid';
import { parse } from 'csv-parse/sync';
import path from 'path';

// Initialize database service
const databaseService = new EquipmentDatabaseService();

// --- HELPER FUNCTIONS ---\n

/**
 * Builds a rich description for equipment based on available fields.
 * Prioritizes specific fields and concatenates others for context.
 * @param record - A row from the bacnet_connections file.
 * @param equipmentName - The name of the equipment.
 * @returns A descriptive string.
 */
function buildRichDescription(record: any, equipmentName: string): string {
  const priorityField = record.DescriptionFromVendor || record.descriptionfromvendor;
  if (priorityField) {
    return priorityField;
  }

  const descriptiveParts: string[] = [];
  const handledKeys = new Set(['location', 'building', 'descriptionfromvendor', 'dis', equipmentName.toLowerCase()]);

  // Concatenate other interesting, non-priority fields
  for (const key in record) {
    if (!handledKeys.has(key.toLowerCase()) && record[key]) {
      descriptiveParts.push(`${key}: ${record[key]}`);
    }
  }

  if (descriptiveParts.length > 0) {
    return descriptiveParts.join('; ');
  }

  // Fallback to the equipment name itself
  return equipmentName;
}

/**
 * Creates an initial Equipment object from a record in ConnectorData.csv.
 * This object is a "shell" that will be stored in the DB.
 * @param connectorRecord - A row from the ConnectorData.csv file.
 * @param metadataMap - A map of enhanced metadata from bacnet_connections.
 * @returns An Equipment object.
 */
function createEquipmentFromConnectorData(
  connectorRecord: any,
  metadataMap: Map<string, any>
): Equipment {
  const id = nanoid();
  const name = connectorRecord.dis || connectorRecord.bacnetDeviceName || `device-${id}`;
  
  const enhancedMeta = metadataMap.get(name) || {};

  const equipmentType = enhancedMeta.type || getEquipmentTypeFromName(name).typeName;
  const displayName = enhancedMeta.description || name;

  const equipment: Equipment = {
    id,
    name,
    displayName,
    type: equipmentType,
    filename: name + '.trio',
    status: connectorRecord.bacnetDeviceStatus === 'OPERATIONAL' ? EquipmentStatus.ACTIVE : EquipmentStatus.INACTIVE,
    connectionState: connectorRecord.connState === 'open' ? ConnectionState.CONNECTED : ConnectionState.CLOSED,
    connectionStatus: connectorRecord.connStatus || 'unknown',
    vendor: connectorRecord.vendorName || 'Unknown',
    modelName: connectorRecord.modelName || 'Unknown',
    location: enhancedMeta.location || connectorRecord.Location || null,
    description: displayName, // The rich description is used as the main description
    points: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return equipment;
}

// --- MAIN PROCESSING LOGIC ---\n

interface ProcessingResult {
  success: boolean;
  scannedFiles: any;
  csvEnhancement: {
    enabled: boolean;
    equipmentCount: number;
    vendorRulesCount: number;
  };
  processedFiles: Array<{
    fileName: string;
    success: boolean;
    equipment?: any;
    pointCount?: number;
    error?: string;
    processingTime?: number;
    enhanced?: boolean;
  }>;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalEquipment: number;
    totalPoints: number;
    enhancedFiles: number;
    averageConfidence: number;
  };
  sessionId: string;
}

/**
 * Orchestrates the entire processing workflow.
 * 1. Clears the database.
 * 2. Processes CSV/TXT files to create equipment shells with rich metadata.
 * 3. Processes TRIO files to add point data to the existing equipment shells.
 */
async function processFilesInOrder(scanResult: any, sessionId: string): Promise<ProcessingResult> {
  const processedFiles: ProcessingResult['processedFiles'] = [];
  let totalPoints = 0;
  let totalEquipment = 0;
  let enhancedFiles = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  
  const equipmentMetadataMap = new Map<string, { type: string; location: string; description: string }>();

  // Step 1: Clear all existing data from the database
  console.log(`[Auto Process] Clearing existing data before processing session ${sessionId}`);
  await databaseService.clearAllData();
  
  // Step 2: Process bacnet_connections file to build enhancement map
  const bacnetConnFile = scanResult.csvFiles.bacnetConnections;
  if (bacnetConnFile) {
    console.log(`[Auto Process] Processing BACnet Connections file: ${bacnetConnFile.name}`);
    try {
      const content = await fileScannerService.readSampleFile(bacnetConnFile.name);
      const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
      
      for (const record of records) {
        const firstColKey = Object.keys(record)[0];
        const equipmentName = record[firstColKey];
        if (!equipmentName) continue;

        const { typeName } = getEquipmentTypeFromName(equipmentName);
        const location = record.Location || record.location || '';
        const description = buildRichDescription(record, equipmentName);
        
        equipmentMetadataMap.set(equipmentName, { type: typeName, location, description });
      }
      console.log(`[Auto Process] Built metadata map with ${equipmentMetadataMap.size} entries from ${bacnetConnFile.name}`);
    } catch (e) {
      console.error(`[Auto Process] Failed to process ${bacnetConnFile.name}`, e);
    }
  }

  // Step 3: Process ConnectorData.csv to create equipment shells
  const connectorDataFile = scanResult.csvFiles.connectorData;
  if (connectorDataFile) {
    console.log(`[Auto Process] Processing Connector Data file: ${connectorDataFile.name}`);
    try {
      const content = await fileScannerService.readSampleFile(connectorDataFile.name);
      const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
      
      for (const record of records) {
        const equipment = createEquipmentFromConnectorData(record, equipmentMetadataMap);
        await databaseService.storeEquipmentWithPoints(
          connectorDataFile.id,
          equipment,
          [],
          sessionId
        );
        totalEquipment++;
      }
      console.log(`[Auto Process] Stored ${records.length} equipment shells from ${connectorDataFile.name}`);
    } catch (e) {
      console.error(`[Auto Process] Failed to process ${connectorDataFile.name}`, e);
    }
  }
  
  // Step 4: Process TRIO files to add points to existing equipment
  console.log(`[Auto Process] Processing ${scanResult.trioFiles.length} TRIO files...`);
  
  for (const trioFile of scanResult.trioFiles) {
    const startTime = Date.now();
    try {
      const fileContent = await fileScannerService.readSampleFile(trioFile.name);
      const trioData = await parseTrioFileFromContent(fileContent, trioFile.name);
      
      const equipmentName = path.basename(trioFile.name, '.trio');
      let equipment = await databaseService.getEquipmentByName(equipmentName);

      if (!equipment) {
        console.warn(`[Auto Process] No existing equipment found for ${equipmentName}. Creating new record.`);
        equipment = classifyEquipment(trioFile.name, trioData);
        totalEquipment++; // Only count as new if it wasn't in the CSVs
      } else {
        console.log(`[Auto Process] Found existing equipment for ${equipmentName}. Enhancing with points.`);
        enhancedFiles++;
      }

      const pointNormalizer = new PointNormalizer();
      const normalizedPoints = trioData.records.map((record: any) => {
        const normResult = pointNormalizer.normalize(record, equipment as Equipment);
        confidenceSum += normResult.confidenceScore;
        confidenceCount++;
        return normResult;
      });

      const taggedPoints = normalizedPoints.map((point: NormalizedPoint) => ({
        ...point,
        haystackTags: generateHaystackTags(point, equipment as Equipment),
      }));

      await databaseService.storeEquipmentWithPoints(
        trioFile.id,
        equipment,
        taggedPoints,
        sessionId
      );

      totalPoints += taggedPoints.length;
      processedFiles.push({
        fileName: trioFile.name,
        success: true,
        pointCount: taggedPoints.length,
        processingTime: Date.now() - startTime,
        enhanced: !!equipmentMetadataMap.size,
      });

    } catch (error) {
      console.error(`[Auto Process] Failed to process ${trioFile.name}:`, error);
      processedFiles.push({
        fileName: trioFile.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      });
    }
  }
  
  const summary = {
    totalFiles: scanResult.totalFiles,
    successfulFiles: processedFiles.filter(f => f.success).length,
    failedFiles: processedFiles.filter(f => !f.success).length,
    totalEquipment,
    totalPoints,
    enhancedFiles,
    averageConfidence: confidenceCount > 0 ? (confidenceSum / confidenceCount) * 100 : 0,
  };
  
  return {
    success: true,
    scannedFiles: scanResult,
    csvEnhancement: {
      enabled: !!equipmentMetadataMap.size,
      equipmentCount: equipmentMetadataMap.size,
      vendorRulesCount: 0, // Placeholder
    },
    processedFiles,
    summary,
    sessionId,
  };
}

/**
 * POST handler for the auto-process route.
 * Triggers the enhanced file processing workflow.
 */
export async function POST(request: NextRequest) {
  const sessionId = nanoid();
  console.log(`[Auto Process] Starting auto-processing session: ${sessionId}`);

  try {
    const scanResult = await fileScannerService.scanSampleData();
    
    if (scanResult.totalFiles === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files found in public/sample_data directory',
      }, { status: 404 });
    }

    console.log(`[Auto Process] Found ${scanResult.totalFiles} files: ${scanResult.trioFiles.length} TRIO, ${Object.keys(scanResult.csvFiles).length} CSV`);
    
    const result = await processFilesInOrder(scanResult, sessionId);
    
    console.log(`[Auto Process] Completed session ${sessionId}:`, result.summary);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Auto Process] Top-level processing failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Auto-processing failed due to an unexpected error.',
      details: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
    }, { status: 500 });
  }
}

/**
 * GET handler to scan and report available files.
 */
export async function GET(request: NextRequest) {
  try {
    const scanResult = await fileScannerService.scanSampleData();
    
    return NextResponse.json({
      sampleDataPath: fileScannerService.getSampleDataPath(),
      scan: scanResult,
      csvEnhancementAvailable: !!(scanResult.csvFiles.bacnetConnections && scanResult.csvFiles.connectorData),
      readyToProcess: scanResult.trioFiles.length > 0,
    });

  } catch (error) {
    console.error('[Auto Process] Scan failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to scan sample data directory',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
