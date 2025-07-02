// lib/services/file-scanner-service.ts

import fs from 'fs/promises';
import path from 'path';

export interface ScannedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'trio' | 'csv_bacnet' | 'csv_connector' | 'unknown';
  lastModified: Date;
}

export interface SampleDataScan {
  trioFiles: ScannedFile[];
  csvFiles: {
    bacnetConnections?: ScannedFile;
    connectorData?: ScannedFile;
  };
  totalFiles: number;
  scanTime: Date;
}

export class FileScannerService {
  private sampleDataPath: string;

  constructor() {
    // Use the existing sample_data directory (with underscore)
    this.sampleDataPath = path.join(process.cwd(), 'public', 'sample_data');
  }

  /**
   * Scan the sample_data directory for TRIO and CSV files
   */
  async scanSampleData(): Promise<SampleDataScan> {
    try {
      // Ensure directory exists
      await this.ensureDirectoryExists();

      // Read directory contents
      const files = await fs.readdir(this.sampleDataPath, { withFileTypes: true });
      
      const scannedFiles: ScannedFile[] = [];
      
      for (const file of files) {
        if (file.isFile() && !file.name.startsWith('.')) {
          const filePath = path.join(this.sampleDataPath, file.name);
          const stats = await fs.stat(filePath);
          
          const scannedFile: ScannedFile = {
            id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            path: filePath,
            size: stats.size,
            type: this.determineFileType(file.name),
            lastModified: stats.mtime
          };
          
          scannedFiles.push(scannedFile);
        }
      }

      // Categorize files
      const trioFiles = scannedFiles.filter(f => f.type === 'trio');
      const csvFiles = this.categorizeCsvFiles(scannedFiles.filter(f => f.type.startsWith('csv')));

      console.log(`[File Scanner] Found ${scannedFiles.length} files: ${trioFiles.length} TRIO, ${Object.keys(csvFiles).length} CSV`);

      return {
        trioFiles,
        csvFiles,
        totalFiles: scannedFiles.length,
        scanTime: new Date()
      };

    } catch (error) {
      console.error('[File Scanner] Error scanning sample data:', error);
      throw new Error(`Failed to scan sample data directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read file content from sample data directory
   */
  async readSampleFile(fileName: string): Promise<string> {
    try {
      const filePath = path.join(this.sampleDataPath, fileName);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`[File Scanner] Error reading file ${fileName}:`, error);
      throw new Error(`Failed to read file ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read multiple files and return their contents
   */
  async readMultipleSampleFiles(fileNames: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const fileName of fileNames) {
      try {
        results[fileName] = await this.readSampleFile(fileName);
      } catch (error) {
        console.error(`[File Scanner] Failed to read ${fileName}:`, error);
        results[fileName] = ''; // Empty content for failed reads
      }
    }
    
    return results;
  }

  /**
   * Get file information without reading content
   */
  async getSampleFileInfo(fileName: string): Promise<ScannedFile | null> {
    try {
      const filePath = path.join(this.sampleDataPath, fileName);
      const stats = await fs.stat(filePath);
      
      return {
        id: `sample-${fileName}`,
        name: fileName,
        path: filePath,
        size: stats.size,
        type: this.determineFileType(fileName),
        lastModified: stats.mtime
      };
    } catch (error) {
      console.error(`[File Scanner] Error getting file info for ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Create sample data directory if it doesn't exist
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.sampleDataPath);
    } catch (error) {
      // Directory doesn't exist, create it
      console.log('[File Scanner] Creating sample_data directory...');
      await fs.mkdir(this.sampleDataPath, { recursive: true });
      
      console.log('[File Scanner] Created sample_data directory');
    }
  }

  /**
   * Determine file type based on filename
   */
  private determineFileType(fileName: string): ScannedFile['type'] {
    const name = fileName.toLowerCase();
    
    if (name.endsWith('.trio')) {
      return 'trio';
    }
    
    if (name.endsWith('.csv')) {
      if (name.includes('bacnet') || name.includes('connection')) {
        return 'csv_bacnet';
      }
      if (name.includes('connector') || name.includes('data')) {
        return 'csv_connector';
      }
      return 'unknown'; // CSV but unclear type
    }

    // Treat BACnet connection text files the same as CSVs
    if (name.endsWith('.txt')) {
      if (name.includes('bacnet') || name.includes('connection')) {
        return 'csv_bacnet';
      }
    }
    
    return 'unknown';
  }

  /**
   * Categorize CSV files into bacnet connections and connector data
   */
  private categorizeCsvFiles(csvFiles: ScannedFile[]): SampleDataScan['csvFiles'] {
    const result: SampleDataScan['csvFiles'] = {};
    
    // Find BACnet connections file
    const bacnetFile = csvFiles.find(f => 
      f.type === 'csv_bacnet' || 
      f.name.toLowerCase().includes('bacnet') || 
      f.name.toLowerCase().includes('connection')
    );
    if (bacnetFile) {
      result.bacnetConnections = bacnetFile;
    }
    
    // Find connector data file
    const connectorFile = csvFiles.find(f => 
      f.type === 'csv_connector' || 
      f.name.toLowerCase().includes('connector') || 
      f.name.toLowerCase().includes('data')
    );
    if (connectorFile) {
      result.connectorData = connectorFile;
    }
    
    return result;
  }

  /**
   * Get sample data directory path
   */
  getSampleDataPath(): string {
    return this.sampleDataPath;
  }

  /**
   * List available sample files for debugging
   */
  async listSampleFiles(): Promise<string[]> {
    try {
      await this.ensureDirectoryExists();
      const files = await fs.readdir(this.sampleDataPath);
      return files.filter(file => !file.startsWith('.'));
    } catch (error) {
      console.error('[File Scanner] Error listing sample files:', error);
      return [];
    }
  }
}

// Export singleton instance
export const fileScannerService = new FileScannerService();
