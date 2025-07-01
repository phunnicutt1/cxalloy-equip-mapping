import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import { processingService } from '../../../lib/services/processing-service';
import { connectorService } from '../../../lib/services/connector-service';
import { EquipmentDatabaseService } from '../../../lib/database/equipment-db-service';
import { EquipmentClassifier } from '../../../lib/classifiers/equipment-classifier';
import { Equipment, ConnectionState, EquipmentStatus } from '../../../types/equipment';
import { nanoid } from 'nanoid';

async function populateFromCsv(dbService: EquipmentDatabaseService) {
  console.log('[REFRESH API] Populating equipment from CSV data');
  const equipmentNames = connectorService.getAllEquipmentNames();
  let count = 0;
  for (const name of equipmentNames) {
    const metadata = connectorService.getEquipmentMetadata(name);
    const equipmentType = EquipmentClassifier.classifyFromFilename(name).equipmentType;

    const equipment: Equipment = {
      id: nanoid(),
      name: metadata.name || name,
      displayName: metadata.name || name,
      type: equipmentType,
      filename: name,
      status: EquipmentStatus.UNKNOWN,
      connectionState: ConnectionState.CLOSED,
      connectionStatus: 'unknown',
      vendor: metadata.vendor || 'Unknown',
      modelName: metadata.model || 'Unknown',
      points: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await dbService.storeEquipmentWithPoints(name, equipment, []);
    count++;
  }
  return count;
}

export async function GET(request: NextRequest) {
  try {
    const dbService = new EquipmentDatabaseService();
    
    // Clear existing data for a clean refresh
    await dbService.clearAllData();
    
    // 1. Populate equipment from CSV files
    const populatedCount = await populateFromCsv(dbService);
    
    // 2. Process all .trio files
    const sampleDataDir = path.join(process.cwd(), 'public', 'sample_data');
    const files = await readdir(sampleDataDir);
    const trioFiles = files.filter(file => file.endsWith('.trio'));
    
    let processedCount = 0;
    for (const trioFile of trioFiles) {
      const fullPath = path.join(sampleDataDir, trioFile);
      await processingService.processFile(fullPath);
      processedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Refresh complete.',
      populated: populatedCount,
      processed: processedCount,
    });
  } catch (error) {
    console.error('[REFRESH API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to refresh data.' }, { status: 500 });
  }
} 