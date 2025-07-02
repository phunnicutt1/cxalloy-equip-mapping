// lib/processors/csv-equipment-processor.ts

import Papa from 'papaparse';

export interface BACnetConnection {
  equipmentName: string;
  ipAddress: string;
  deviceId: number;
  network: number;
  mac: number;
}

export interface ConnectorData {
  id: string;
  bacnetConn: string;
  bacnetDeviceName: string;
  bacnetDeviceStatus: string;
  bacnetVersion?: number;
  conn: string;
  connErr?: string;
  connOpenRetryFreq?: string;
  connPingFreq?: string;
  connState: string;
  connStatus: string;
  connTuningRef?: string;
  dis: string; // Display name
  modelName: string;
  uri: string;
  vendorName: string;
  mod?: string;
  // Allow for custom fields that controls contractors might add
  [key: string]: any;
}

export interface EnhancedEquipmentInfo {
  equipmentName: string;
  displayName: string;
  vendorName: string;
  modelName: string;
  deviceId: number;
  ipAddress: string;
  bacnetDeviceName: string;
  connectionState: string;
  deviceStatus: string;
  customFields: Record<string, any>;
  equipmentType: string;
  confidence: number;
  source: 'csv_enhanced';
}

export class CSVEquipmentProcessor {
  private bacnetConnections: Map<string, BACnetConnection> = new Map();
  private connectorData: Map<string, ConnectorData> = new Map();
  private processedEquipment: Map<string, EnhancedEquipmentInfo> = new Map();

  /**
   * Process BACnet connections CSV file
   */
  async processBACnetConnections(csvContent: string): Promise<BACnetConnection[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const connections: BACnetConnection[] = results.data.map((row: any) => {
              // Handle different possible column names
              const equipmentName = row['Equip/Connector Name'] || 
                                   row['Equipment Name'] || 
                                   row['equipmentName'] || 
                                   row['name'] || 
                                   Object.values(row)[0] as string;

              return {
                equipmentName: equipmentName?.toString().trim() || '',
                ipAddress: row.ipAddress?.toString() || '',
                deviceId: parseInt(row.deviceId) || 0,
                network: parseInt(row.network) || 0,
                mac: parseInt(row.mac) || 0
              };
            }).filter(conn => conn.equipmentName); // Filter out empty names

            // Store in map for quick lookup
            connections.forEach(conn => {
              this.bacnetConnections.set(conn.equipmentName, conn);
            });

            console.log(`Processed ${connections.length} BACnet connections`);
            resolve(connections);
          } catch (error) {
            reject(new Error(`Failed to process BACnet connections: ${error}`));
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  /**
   * Process connector data CSV file with support for custom fields
   */
  async processConnectorData(csvContent: string): Promise<ConnectorData[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const connectorData: ConnectorData[] = results.data.map((row: any) => {
              // Extract standard fields
              const standardData: Partial<ConnectorData> = {
                id: row.id?.toString() || '',
                bacnetConn: row.bacnetConn?.toString() || '',
                bacnetDeviceName: row.bacnetDeviceName?.toString() || '',
                bacnetDeviceStatus: row.bacnetDeviceStatus?.toString() || '',
                bacnetVersion: parseFloat(row.bacnetVersion) || undefined,
                conn: row.conn?.toString() || '',
                connErr: row.connErr?.toString() || undefined,
                connOpenRetryFreq: row.connOpenRetryFreq?.toString() || undefined,
                connPingFreq: row.connPingFreq?.toString() || undefined,
                connState: row.connState?.toString() || '',
                connStatus: row.connStatus?.toString() || '',
                connTuningRef: row.connTuningRef?.toString() || undefined,
                dis: row.dis?.toString() || '',
                modelName: row.modelName?.toString() || '',
                uri: row.uri?.toString() || '',
                vendorName: row.vendorName?.toString() || '',
                mod: row.mod?.toString() || undefined
              };

              // Extract any custom fields (fields not in standard schema)
              const standardFields = new Set(Object.keys(standardData));
              const customFields: Record<string, any> = {};
              
              Object.keys(row).forEach(key => {
                if (!standardFields.has(key) && row[key] !== null && row[key] !== undefined) {
                  customFields[key] = row[key];
                }
              });

              return {
                ...standardData,
                ...customFields
              } as ConnectorData;
            }).filter(data => data.id || data.dis || data.bacnetDeviceName); // Filter valid entries

            // Store in map for quick lookup by multiple keys
            connectorData.forEach(data => {
              this.connectorData.set(data.dis, data); // Use display name as primary key
              if (data.id && data.id !== data.dis) {
                this.connectorData.set(data.id, data);
              }
              if (data.bacnetDeviceName && data.bacnetDeviceName !== data.dis) {
                this.connectorData.set(data.bacnetDeviceName, data);
              }
            });

            console.log(`Processed ${connectorData.length} connector data entries`);
            resolve(connectorData);
          } catch (error) {
            reject(new Error(`Failed to process connector data: ${error}`));
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  /**
   * Enhanced equipment type classification using vendor and model data
   */
  private classifyEquipmentType(
    equipmentName: string, 
    vendorName: string, 
    modelName: string, 
    customFields: Record<string, any>
  ): { type: string; confidence: number } {
    let confidence = 0;
    let type = 'Unknown';

    // Equipment name patterns (highest priority)
    const namePatterns = [
      { pattern: /EF_/i, type: 'Exhaust Fan', confidence: 95 },
      { pattern: /WSHP_/i, type: 'Water Source Heat Pump', confidence: 95 },
      { pattern: /AHU/i, type: 'Air Handling Unit', confidence: 90 },
      { pattern: /RTU/i, type: 'Rooftop Unit', confidence: 90 },
      { pattern: /VAV/i, type: 'VAV Controller', confidence: 90 },
      { pattern: /Controller/i, type: 'Controller', confidence: 70 },
      { pattern: /Pump/i, type: 'Pump', confidence: 85 },
      { pattern: /Boiler/i, type: 'Boiler Controller', confidence: 90 },
      { pattern: /CTF_/i, type: 'Cooling Tower Fan', confidence: 90 },
      { pattern: /ECB_/i, type: 'Zone Controller', confidence: 80 }
    ];

    for (const { pattern, type: patternType, confidence: patternConf } of namePatterns) {
      if (pattern.test(equipmentName)) {
        type = patternType;
        confidence = Math.max(confidence, patternConf);
        break;
      }
    }

    // Vendor-specific enhancements
    const vendorEnhancements: Record<string, Record<string, { type: string; bonus: number }>> = {
      'ABB': {
        'ACH580': { type: 'VFD Controller', bonus: 15 }
      },
      'Climate Master': {
        'ClimateMaster MPC': { type: 'Water Source Heat Pump', bonus: 15 }
      },
      'Distech Controls, Inc.': {
        'ECB_600': { type: 'Zone Controller', bonus: 15 }
      },
      'Danfoss Drives A/S': {
        'FC-102': { type: 'VFD Controller', bonus: 15 }
      }
    };

    if (vendorEnhancements[vendorName]) {
      for (const [modelPattern, enhancement] of Object.entries(vendorEnhancements[vendorName])) {
        if (modelName.includes(modelPattern)) {
          if (type === 'Unknown') {
            type = enhancement.type;
            confidence = 70 + enhancement.bonus;
          } else {
            confidence += enhancement.bonus;
          }
          break;
        }
      }
    }

    return { type, confidence: Math.min(confidence, 100) };
  }

  /**
   * Merge BACnet connections with connector data to create enhanced equipment info
   */
  mergeEquipmentData(): EnhancedEquipmentInfo[] {
    const enhancedEquipment: EnhancedEquipmentInfo[] = [];

    // Process each BACnet connection
    this.bacnetConnections.forEach((connection, equipmentName) => {
      // Try to find matching connector data using multiple lookup strategies
      let connectorInfo = this.connectorData.get(equipmentName) ||
                         this.connectorData.get(connection.deviceId.toString()) ||
                         Array.from(this.connectorData.values()).find(data => 
                           data.bacnetDeviceName === equipmentName ||
                           data.dis === equipmentName
                         );

      if (!connectorInfo) {
        // Create minimal connector info if not found
        connectorInfo = {
          id: equipmentName,
          bacnetConn: equipmentName,
          bacnetDeviceName: equipmentName,
          bacnetDeviceStatus: 'unknown',
          conn: 'unknown',
          connState: 'unknown',
          connStatus: 'unknown',
          dis: equipmentName,
          modelName: 'Unknown',
          uri: '',
          vendorName: 'Unknown'
        };
      }

      // Extract custom fields
      const standardConnectorFields = new Set([
        'id', 'bacnetConn', 'bacnetDeviceName', 'bacnetDeviceStatus', 'bacnetVersion',
        'conn', 'connErr', 'connOpenRetryFreq', 'connPingFreq', 'connState',
        'connStatus', 'connTuningRef', 'dis', 'modelName', 'uri', 'vendorName', 'mod'
      ]);

      const customFields: Record<string, any> = {};
      Object.entries(connectorInfo).forEach(([key, value]) => {
        if (!standardConnectorFields.has(key) && value !== null && value !== undefined) {
          customFields[key] = value;
        }
      });

      // Classify equipment type
      const { type, confidence } = this.classifyEquipmentType(
        equipmentName,
        connectorInfo.vendorName,
        connectorInfo.modelName,
        customFields
      );

      const enhancedInfo: EnhancedEquipmentInfo = {
        equipmentName,
        displayName: connectorInfo.dis || equipmentName,
        vendorName: connectorInfo.vendorName,
        modelName: connectorInfo.modelName,
        deviceId: connection.deviceId,
        ipAddress: connection.ipAddress,
        bacnetDeviceName: connectorInfo.bacnetDeviceName,
        connectionState: connectorInfo.connState,
        deviceStatus: connectorInfo.bacnetDeviceStatus,
        customFields,
        equipmentType: type,
        confidence,
        source: 'csv_enhanced'
      };

      enhancedEquipment.push(enhancedInfo);
      this.processedEquipment.set(equipmentName, enhancedInfo);
    });

    console.log(`Created ${enhancedEquipment.length} enhanced equipment entries`);
    return enhancedEquipment;
  }

  /**
   * Get equipment info by name with fuzzy matching
   */
  getEquipmentInfo(equipmentName: string): EnhancedEquipmentInfo | null {
    // Direct lookup first
    let info = this.processedEquipment.get(equipmentName);
    if (info) return info;

    // Fuzzy matching for equipment names
    const normalizedName = equipmentName.toLowerCase().replace(/[_\-\s]/g, '');
    
    for (const [key, value] of this.processedEquipment.entries()) {
      const normalizedKey = key.toLowerCase().replace(/[_\-\s]/g, '');
      if (normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get all processed equipment
   */
  getAllEquipment(): EnhancedEquipmentInfo[] {
    return Array.from(this.processedEquipment.values());
  }

  /**
   * Get equipment statistics
   */
  getStatistics() {
    const equipment = this.getAllEquipment();
    const typeStats: Record<string, number> = {};
    const vendorStats: Record<string, number> = {};
    
    equipment.forEach(eq => {
      typeStats[eq.equipmentType] = (typeStats[eq.equipmentType] || 0) + 1;
      vendorStats[eq.vendorName] = (vendorStats[eq.vendorName] || 0) + 1;
    });

    const avgConfidence = equipment.reduce((sum, eq) => sum + eq.confidence, 0) / equipment.length;

    return {
      totalEquipment: equipment.length,
      averageConfidence: Math.round(avgConfidence * 10) / 10,
      typeDistribution: typeStats,
      vendorDistribution: vendorStats,
      customFieldsFound: equipment.filter(eq => Object.keys(eq.customFields).length > 0).length
    };
  }
}

// Usage example and helper functions
export async function processEquipmentCSVs(
  bacnetConnectionsCSV: string,
  connectorDataCSV: string
): Promise<{
  processor: CSVEquipmentProcessor;
  equipment: EnhancedEquipmentInfo[];
  statistics: any;
}> {
  const processor = new CSVEquipmentProcessor();
  
  try {
    // Process both CSV files
    await processor.processBACnetConnections(bacnetConnectionsCSV);
    await processor.processConnectorData(connectorDataCSV);
    
    // Merge the data
    const equipment = processor.mergeEquipmentData();
    const statistics = processor.getStatistics();
    
    return {
      processor,
      equipment,
      statistics
    };
  } catch (error) {
    console.error('Error processing equipment CSVs:', error);
    throw error;
  }
}
