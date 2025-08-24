import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import path from 'path';

export interface EquipmentMetadata {
  name: string;
  vendor?: string;
  model?: string;
  description?: string;
  deviceName?: string;
  deviceStatus?: string;
  ipAddress?: string;
  deviceId?: string;
  network?: string;
  mac?: string;
  uri?: string;
  connStatus?: string;
  connState?: string;
  bacnetVersion?: string;
  customFields?: Record<string, string>;
}

export class ConnectorService {
  private equipmentMap: Map<string, EquipmentMetadata> = new Map();
  private bacnetConnectionsPath: string;
  private connectorDataPath: string;
  private isInitialized: boolean = false;

  constructor() {
    // Update paths to use public/sample_data - note: bacnet_connections is a .txt file
    this.bacnetConnectionsPath = path.join(process.cwd(), 'public', 'sample_data', 'bacnet_connections.txt');
    this.connectorDataPath = path.join(process.cwd(), 'public', 'sample_data', 'ConnectorData.csv');
    this.loadData();
  }

  private loadData(): void {
    try {
      console.log('[CONNECTOR SERVICE] Loading equipment metadata from CSV files');
      
      // First, load bacnet_connections.csv to get equipment names and basic connection info
      const bacnetData = this.loadBacnetConnections();
      
      // Then, load ConnectorData.csv to enrich with vendor, model, and other metadata
      const connectorData = this.loadConnectorData();
      
      // Merge the data
      this.mergeData(bacnetData, connectorData);
      
      this.isInitialized = true;
      console.log(`[CONNECTOR SERVICE] Loaded metadata for ${this.equipmentMap.size} equipment`);
      console.log(`[CONNECTOR SERVICE] Sample loaded equipment:`, Array.from(this.equipmentMap.entries()).slice(0, 3).map(([name, data]) => ({
        name,
        vendor: data.vendor,
        model: data.model
      })));
    } catch (error) {
      console.error('[CONNECTOR SERVICE] Error loading CSV data:', error);
      this.isInitialized = false;
    }
  }

  private loadBacnetConnections(): Map<string, EquipmentMetadata> {
    const map = new Map<string, EquipmentMetadata>();
    
    try {
      console.log(`[CONNECTOR SERVICE] Loading bacnet_connections.txt from: ${this.bacnetConnectionsPath}`);
      const csvContent = readFileSync(this.bacnetConnectionsPath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: '\t'  // Tab-delimited file
      });

      console.log(`[CONNECTOR SERVICE] Parsed ${records.length} records from bacnet_connections.txt`);
      console.log(`[CONNECTOR SERVICE] Column headers:`, Object.keys(records[0] || {}));
      
      for (const record of records) {
        const equipmentName = record['Equipment'];
        if (equipmentName) {
          map.set(equipmentName, {
            name: equipmentName,
            description: record['Location'],
            ipAddress: record['Local IP'] || record['OTTO IP'],
            deviceId: record['Device ID'],
            network: record['Network'],
            mac: record['MAC Address'],
            customFields: {
              building: record['Building'],
              location: record['Location'],
              bacRouter: record['BAC Router'],
              udpPort: record['UDP Port'],
              maxAirflowSP: record['MaxAirflowSP-Design'],
              minAirflowSP: record['MinAirflowSP-Design']
            }
          });
        }
      }
      
      console.log(`[CONNECTOR SERVICE] Loaded ${map.size} equipment from bacnet_connections.txt`);
      console.log(`[CONNECTOR SERVICE] Sample equipment names:`, Array.from(map.keys()).slice(0, 5));
    } catch (error) {
      console.error('[CONNECTOR SERVICE] Error loading bacnet_connections.txt:', error);
    }
    
    return map;
  }

  private loadConnectorData(): Map<string, EquipmentMetadata> {
    const map = new Map<string, EquipmentMetadata>();
    
    try {
      console.log(`[CONNECTOR SERVICE] Loading ConnectorData.csv from: ${this.connectorDataPath}`);
      const csvContent = readFileSync(this.connectorDataPath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Define known standard fields
      const standardFields = new Set([
        'id', 'bacnetConn', 'bacnetDeviceName', 'bacnetDeviceStatus', 
        'bacnetVersion', 'conn', 'connErr', 'connOpenRetryFreq', 
        'connPingFreq', 'connState', 'connStatus', 'connTuningRef', 
        'dis', 'modelName', 'uri', 'vendorName', 'mod'
      ]);

      for (const record of records) {
        const equipmentName = record.dis;
        if (equipmentName) {
          const metadata: EquipmentMetadata = {
            name: equipmentName,
            vendor: record.vendorName,
            model: record.modelName,
            description: record.dis,
            deviceName: record.bacnetDeviceName,
            deviceStatus: record.bacnetDeviceStatus,
            uri: record.uri,
            connStatus: record.connStatus,
            connState: record.connState,
            bacnetVersion: record.bacnetVersion,
            customFields: {}
          };
          
          // Capture any custom fields that the controls contractor might have added
          for (const [key, value] of Object.entries(record)) {
            if (!standardFields.has(key) && value) {
              metadata.customFields![key] = value as string;
            }
          }
          
          map.set(equipmentName, metadata);
        }
      }
      
      console.log(`[CONNECTOR SERVICE] Loaded ${map.size} equipment from ConnectorData.csv`);
    } catch (error) {
      console.error('[CONNECTOR SERVICE] Error loading ConnectorData.csv:', error);
    }
    
    return map;
  }

  private mergeData(
    bacnetData: Map<string, EquipmentMetadata>, 
    connectorData: Map<string, EquipmentMetadata>
  ): void {
    // Start with bacnet connections data
    for (const [name, metadata] of bacnetData) {
      this.equipmentMap.set(name, metadata);
    }
    
    // Enrich with connector data
    for (const [name, connectorMetadata] of connectorData) {
      const existing = this.equipmentMap.get(name);
      if (existing) {
        // Merge the data, preferring connector data for vendor/model info
        this.equipmentMap.set(name, {
          ...existing,
          ...connectorMetadata,
          // Preserve network info from bacnet_connections
          ipAddress: existing.ipAddress || connectorMetadata.ipAddress,
          deviceId: existing.deviceId || connectorMetadata.deviceId,
          network: existing.network || connectorMetadata.network,
          mac: existing.mac || connectorMetadata.mac
        });
      } else {
        // Equipment exists in ConnectorData but not in bacnet_connections
        this.equipmentMap.set(name, connectorMetadata);
      }
    }
  }

  public getEquipmentMetadata(equipmentName: string): EquipmentMetadata {
    if (!this.isInitialized) {
      console.warn(`[CONNECTOR SERVICE] Service not initialized, reloading data...`);
      this.loadData();
    }
    
    console.log(`[CONNECTOR SERVICE] Getting metadata for equipment: ${equipmentName}`);
    console.log(`[CONNECTOR SERVICE] Total equipment in map: ${this.equipmentMap.size}`);
    
    const metadata = this.equipmentMap.get(equipmentName);
    if (!metadata) {
      console.warn(`[CONNECTOR SERVICE] No metadata found for equipment: ${equipmentName}`);
      console.log(`[CONNECTOR SERVICE] Available equipment names:`, Array.from(this.equipmentMap.keys()).slice(0, 10));
      return { name: equipmentName };
    }
    
    console.log(`[CONNECTOR SERVICE] Found metadata for ${equipmentName}:`, {
      vendor: metadata.vendor,
      model: metadata.model,
      deviceName: metadata.deviceName
    });
    
    return metadata;
  }

  public getAllEquipmentNames(): string[] {
    return Array.from(this.equipmentMap.keys());
  }

  public getAllEquipmentMetadata(): Map<string, EquipmentMetadata> {
    return new Map(this.equipmentMap);
  }

  public getEquipmentByVendor(vendor: string): EquipmentMetadata[] {
    const results: EquipmentMetadata[] = [];
    for (const metadata of this.equipmentMap.values()) {
      if (metadata.vendor?.toLowerCase().includes(vendor.toLowerCase())) {
        results.push(metadata);
      }
    }
    return results;
  }

  public getEquipmentByModel(model: string): EquipmentMetadata[] {
    const results: EquipmentMetadata[] = [];
    for (const metadata of this.equipmentMap.values()) {
      if (metadata.model?.toLowerCase().includes(model.toLowerCase())) {
        results.push(metadata);
      }
    }
    return results;
  }

  // Reload data (useful for development or if CSV files are updated)
  public reloadData(): void {
    this.equipmentMap.clear();
    this.loadData();
  }
}

// Export singleton instance
export const connectorService = new ConnectorService(); 