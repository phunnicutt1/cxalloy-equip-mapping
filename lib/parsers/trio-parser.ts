import { 
  TrioParseOptions
} from '@/types/trio';
import { BACnetPoint, BACnetObjectType, PointDataType, PointCategory } from '@/types/point';

/**
 * Trio value for parser
 */
export interface TrioValue {
  type: 'string' | 'number' | 'boolean' | 'ref' | 'marker';
  value?: unknown;
  unit?: string;
  raw?: string; // Raw value as it appeared in the trio file
}

/**
 * Trio record for parser
 */
export interface TrioRecord {
  tags: Map<string, TrioValue>;
  metadata?: {
    originalLines?: string[];
  };
}

/**
 * Trio section for parser
 */
export interface TrioSection {
  index: number;
  records?: TrioRecord[];
  metadata?: {
    lineCount?: number;
    rawContent?: string;
  };
}

/**
 * Simple trio parse result for our parser
 */
export interface TrioParseResult {
  fileName: string;
  sections: TrioSection[];
  metadata: {
    totalSections: number;
    totalPoints: number;
    parseTime: number;
    warnings: Array<{
      type: string;
      message: string;
      line: number;
      severity: string;
    }>;
    errors: Array<{
      type: string;
      message: string;
      line: number;
      severity: string;
    }>;
  };
  isValid: boolean;
}

/**
 * Comprehensive trio file parser following Project Haystack trio format
 * Handles YAML-derived format with --- separators and zinc encoding
 */
export class TrioParser {
  private static readonly SECTION_SEPARATOR = '---';
  private static readonly COMMENT_PREFIX = '//';
  private static readonly ZINC_MARKERS = ['M:', 'Bin:', 'C:', 'R:', 'N:', 'S:', 'U:', 'X:'];

  /**
   * Parse trio file content into structured format
   */
  static parseTrioFile(
    fileName: string,
    content: string,
    options: Partial<TrioParseOptions> = {}
  ): TrioParseResult {
    const startTime = Date.now();
    const result: TrioParseResult = {
      fileName,
      sections: [],
      metadata: {
        totalSections: 0,
        totalPoints: 0,
        parseTime: 0,
        warnings: [],
        errors: []
      },
      isValid: true
    };

    try {
      // Clean and normalize content
      const normalizedContent = this.normalizeContent(content);
      
      // Parse sections
      const sections = this.parseSections(normalizedContent);
      
      // Process each section
      result.sections = sections.map((sectionContent, index) => 
        this.parseSection(sectionContent, index, options, result)
      ).filter(section => section !== null) as TrioSection[];

      // Calculate metadata
      result.metadata.totalSections = result.sections.length;
      result.metadata.totalPoints = result.sections.reduce((count, section) => 
        count + (section.records?.length || 0), 0
      );
      result.metadata.parseTime = Date.now() - startTime;

      // Validate structure
      this.validateTrioStructure(result);

    } catch (error) {
      result.isValid = false;
      result.metadata.errors.push({
        type: 'PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown parse error',
        line: 0,
        severity: 'error'
      });
    }

    return result;
  }

  /**
   * Parse individual sections separated by ---
   */
  private static parseSections(content: string): string[] {
    const sections = content.split(this.SECTION_SEPARATOR)
      .map(section => section.trim())
      .filter(section => section.length > 0);

    if (sections.length === 0) {
      throw new Error('No valid sections found in trio file');
    }

    return sections;
  }

  /**
   * Parse individual section into TrioSection
   */
  private static parseSection(
    sectionContent: string, 
    index: number, 
    options: Partial<TrioParseOptions>,
    result?: TrioParseResult
  ): TrioSection | null {
    try {
      const lines = sectionContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith(this.COMMENT_PREFIX));

      if (lines.length === 0) return null;

      const section: TrioSection = {
        index,
        records: [],
        metadata: {
          lineCount: lines.length,
          rawContent: sectionContent
        }
      };

      // Parse records from lines
      const record = this.parseRecord(lines, result);
      if (record) {
        section.records = [record];
      }

      return section;
    } catch (error) {
      if (result) {
        result.metadata.warnings.push({
          type: 'SECTION_PARSE_WARNING',
          message: `Failed to parse section ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          line: 0,
          severity: 'warning'
        });
      }
      if (options.strictMode) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Parse lines into TrioRecord
   */
  private static parseRecord(lines: string[], result?: TrioParseResult): TrioRecord | null {
    const record: TrioRecord = {
      tags: new Map(),
      metadata: {
        originalLines: lines
      }
    };

    let currentKey = '';
    let isMultiline = false;
    let multilineValue = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(':')) {
        // Handle previous multiline if exists
        if (isMultiline && currentKey) {
          record.tags.set(currentKey, this.parseZincValue(multilineValue.trim()));
          isMultiline = false;
          multilineValue = '';
        }

        // Parse key-value pair
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        currentKey = key;

        if (value) {
          // Single line value
          record.tags.set(key, this.parseZincValue(value));
        } else {
          // Potential multiline value
          isMultiline = true;
          multilineValue = '';
        }
        
        // Add warning for potentially malformed lines
        if ((key.toLowerCase().includes('invalid') || value.includes('INVALID')) && result) {
          result.metadata.warnings.push({
            type: 'INVALID_REFERENCE',
            message: `Potentially invalid reference: ${key}:${value}`,
            line: i + 1,
            severity: 'warning'
          });
        }
      } else if (isMultiline) {
        // Continue multiline value
        multilineValue += (multilineValue ? '\n' : '') + line;
      } else {
        // Standalone tag (marker)
        record.tags.set(line, { type: 'marker', value: true });
      }
    }

    // Handle final multiline value
    if (isMultiline && currentKey) {
      record.tags.set(currentKey, this.parseZincValue(multilineValue.trim()));
    }

    return record.tags.size > 0 ? record : null;
  }

  /**
   * Parse zinc-encoded values
   */
  private static parseZincValue(value: string): TrioValue {
    // Remove quotes if present
    const trimmedValue = value.replace(/^["']|["']$/g, '');

    // Handle special zinc markers
    for (const marker of this.ZINC_MARKERS) {
      if (value.startsWith(marker)) {
        return { 
          type: 'ref', 
          value: value.substring(marker.length), // Remove marker prefix
          raw: value 
        };
      }
    }

    // Handle numbers
    if (!isNaN(Number(trimmedValue)) && trimmedValue !== '') {
      return { type: 'number', value: Number(trimmedValue) };
    }

    // Handle booleans
    if (trimmedValue.toLowerCase() === 'true' || trimmedValue.toLowerCase() === 'false') {
      return { type: 'boolean', value: trimmedValue.toLowerCase() === 'true' };
    }

    // Handle units (numbers with units)
    const unitMatch = trimmedValue.match(/^(-?\d*\.?\d+)\s*(.+)$/);
    if (unitMatch) {
      const [, numStr, unit] = unitMatch;
      const num = Number(numStr);
      if (!isNaN(num)) {
        return { 
          type: 'number', 
          value: num, 
          unit: unit.replace(/["""]/g, '')
        };
      }
    }

    // Default to string
    return { type: 'string', value: trimmedValue };
  }

  /**
   * Convert TrioRecord to BACnetPoint
   */
  static trioRecordToBACnetPoint(record: TrioRecord, equipmentName?: string): BACnetPoint | null {
    const tags = record.tags;
    
    // Required fields
    const dis = tags.get('dis');
    const bacnetCur = tags.get('bacnetCur');
    const kind = tags.get('kind');

    if (!dis || !bacnetCur || !kind) {
      return null;
    }

    // Extract BACnet object type and instance
    const bacnetStr = bacnetCur.value?.toString() || '';
    const objectTypeMatch = bacnetStr.match(/^([A-Z]+)(\d+)$/);
    
    if (!objectTypeMatch) {
      return null;
    }

    const [, objectTypeStr, instanceStr] = objectTypeMatch;
    const objectType = objectTypeStr as BACnetObjectType;
    const objectInstance = parseInt(instanceStr, 10);

    // Convert kind to PointDataType
    const kindStr = kind.value?.toString() || 'Number';
    let dataType: PointDataType;
    switch (kindStr) {
      case 'Bool':
        dataType = PointDataType.BOOLEAN;
        break;
      case 'String':
        dataType = PointDataType.STRING;
        break;
      case 'Enum':
        dataType = PointDataType.ENUMERATED;
        break;
      case 'Number':
      default:
        dataType = PointDataType.NUMBER;
        break;
    }

    const point: BACnetPoint = {
      id: `${objectType}${objectInstance}`,
      equipmentId: equipmentName || '',
      objectName: dis.value?.toString() || `${objectType}${objectInstance}`,
      objectType,
      objectInstance,
      displayName: dis.value?.toString() || '',
      description: tags.get('bacnetDesc')?.value?.toString() || '',
      dataType,
      presentValue: null,
      units: tags.get('unit')?.value?.toString(),
      category: tags.has('cmd') ? PointCategory.COMMAND : PointCategory.SENSOR,
      isWritable: tags.has('writable'),
      isCommand: tags.has('cmd'),
      bacnetWriteProperty: tags.get('bacnetWrite')?.value?.toString(),
      bacnetWriteLevel: tags.get('bacnetWriteLevel')?.value as number,
      reliability: 'no-fault-detected',
      outOfService: false,
      metadata: equipmentName ? { equipmentName } : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return point;
  }

  /**
   * Extract equipment metadata from trio file
   */
  static extractEquipmentMetadata(result: TrioParseResult): Record<string, unknown> {
    const pointTypes = new Set<string>();
    const units = new Set<string>();
    const vendors = new Set<string>();

    result.sections.forEach(section => {
      section.records?.forEach(record => {
        const kind = record.tags.get('kind');
        if (kind) pointTypes.add(kind.value?.toString() || '');

        const unit = record.tags.get('unit');
        if (unit) units.add(unit.value?.toString() || '');

        const vendor = record.tags.get('vendor');
        if (vendor) vendors.add(vendor.value?.toString() || '');
      });
    });

    const metadata: Record<string, unknown> = {
      fileName: result.fileName,
      totalPoints: result.metadata.totalPoints,
      pointTypes: Array.from(pointTypes),
      units: Array.from(units),
      vendors: Array.from(vendors)
    };

    return metadata;
  }

  /**
   * Normalize content for consistent parsing
   */
  private static normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\t/g, '  ')    // Convert tabs to spaces
      .trim();
  }

  /**
   * Validate trio structure
   */
  private static validateTrioStructure(result: TrioParseResult): void {
    if (result.sections.length === 0) {
      result.metadata.warnings.push({
        type: 'STRUCTURE_WARNING',
        message: 'No sections found in trio file',
        line: 0,
        severity: 'warning'
      });
    }

    result.sections.forEach((section, index) => {
      if (!section.records || section.records.length === 0) {
        result.metadata.warnings.push({
          type: 'EMPTY_SECTION',
          message: `Section ${index} is empty`,
          line: 0,
          severity: 'warning'
        });
      }
    });
  }
}

/**
 * Convenience function for parsing trio files
 */
export function parseTrioFile(
  fileName: string,
  content: string,
  options?: Partial<TrioParseOptions>
): TrioParseResult {
  return TrioParser.parseTrioFile(fileName, content, options);
}

/**
 * Parse trio content and convert to BACnet points
 */
export function parseTrioToBACnetPoints(
  fileName: string,
  content: string,
  equipmentName?: string
): BACnetPoint[] {
  const result = TrioParser.parseTrioFile(fileName, content);
  const points: BACnetPoint[] = [];

  result.sections.forEach(section => {
    section.records?.forEach(record => {
      const point = TrioParser.trioRecordToBACnetPoint(record, equipmentName);
      if (point) {
        points.push(point);
      }
    });
  });

  return points;
} 