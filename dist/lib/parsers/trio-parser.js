"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrioParser = void 0;
exports.parseTrioFile = parseTrioFile;
exports.parseTrioToBACnetPoints = parseTrioToBACnetPoints;
const point_1 = require("@/types/point");
/**
 * Comprehensive trio file parser following Project Haystack trio format
 * Handles YAML-derived format with --- separators and zinc encoding
 */
class TrioParser {
    /**
     * Parse trio file content into structured format
     */
    static parseTrioFile(fileName, content, options = {}) {
        const startTime = Date.now();
        const result = {
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
            result.sections = sections.map((sectionContent, index) => this.parseSection(sectionContent, index, options, result)).filter(section => section !== null);
            // Calculate metadata
            result.metadata.totalSections = result.sections.length;
            result.metadata.totalPoints = result.sections.reduce((count, section) => { var _a; return count + (((_a = section.records) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
            result.metadata.parseTime = Date.now() - startTime;
            // Validate structure
            this.validateTrioStructure(result);
        }
        catch (error) {
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
    static parseSections(content) {
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
    static parseSection(sectionContent, index, options, result) {
        try {
            const lines = sectionContent.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith(this.COMMENT_PREFIX));
            if (lines.length === 0)
                return null;
            const section = {
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
        }
        catch (error) {
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
    static parseRecord(lines, result) {
        const record = {
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
                }
                else {
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
            }
            else if (isMultiline) {
                // Continue multiline value
                multilineValue += (multilineValue ? '\n' : '') + line;
            }
            else {
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
    static parseZincValue(value) {
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
    static trioRecordToBACnetPoint(record, equipmentName) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const tags = record.tags;
        // Required fields
        const dis = tags.get('dis');
        const bacnetCur = tags.get('bacnetCur');
        const kind = tags.get('kind');
        if (!dis || !bacnetCur || !kind) {
            return null;
        }
        // Extract BACnet object type and instance
        const bacnetStr = ((_a = bacnetCur.value) === null || _a === void 0 ? void 0 : _a.toString()) || '';
        const objectTypeMatch = bacnetStr.match(/^([A-Z]+)(\d+)$/);
        if (!objectTypeMatch) {
            return null;
        }
        const [, objectTypeStr, instanceStr] = objectTypeMatch;
        const objectType = objectTypeStr;
        const objectInstance = parseInt(instanceStr, 10);
        // Convert kind to PointDataType
        const kindStr = ((_b = kind.value) === null || _b === void 0 ? void 0 : _b.toString()) || 'Number';
        let dataType;
        switch (kindStr) {
            case 'Bool':
                dataType = point_1.PointDataType.BOOLEAN;
                break;
            case 'String':
                dataType = point_1.PointDataType.STRING;
                break;
            case 'Enum':
                dataType = point_1.PointDataType.ENUMERATED;
                break;
            case 'Number':
            default:
                dataType = point_1.PointDataType.NUMBER;
                break;
        }
        const point = {
            id: `${objectType}${objectInstance}`,
            equipmentId: equipmentName || '',
            objectName: ((_c = dis.value) === null || _c === void 0 ? void 0 : _c.toString()) || `${objectType}${objectInstance}`,
            objectType,
            objectInstance,
            displayName: ((_d = dis.value) === null || _d === void 0 ? void 0 : _d.toString()) || '',
            description: ((_f = (_e = tags.get('bacnetDesc')) === null || _e === void 0 ? void 0 : _e.value) === null || _f === void 0 ? void 0 : _f.toString()) || '',
            dataType,
            presentValue: null,
            units: (_h = (_g = tags.get('unit')) === null || _g === void 0 ? void 0 : _g.value) === null || _h === void 0 ? void 0 : _h.toString(),
            category: tags.has('cmd') ? point_1.PointCategory.COMMAND : point_1.PointCategory.SENSOR,
            isWritable: tags.has('writable'),
            isCommand: tags.has('cmd'),
            bacnetWriteProperty: (_k = (_j = tags.get('bacnetWrite')) === null || _j === void 0 ? void 0 : _j.value) === null || _k === void 0 ? void 0 : _k.toString(),
            bacnetWriteLevel: (_l = tags.get('bacnetWriteLevel')) === null || _l === void 0 ? void 0 : _l.value,
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
    static extractEquipmentMetadata(result) {
        const pointTypes = new Set();
        const units = new Set();
        const vendors = new Set();
        result.sections.forEach(section => {
            var _a;
            (_a = section.records) === null || _a === void 0 ? void 0 : _a.forEach(record => {
                var _a, _b, _c;
                const kind = record.tags.get('kind');
                if (kind)
                    pointTypes.add(((_a = kind.value) === null || _a === void 0 ? void 0 : _a.toString()) || '');
                const unit = record.tags.get('unit');
                if (unit)
                    units.add(((_b = unit.value) === null || _b === void 0 ? void 0 : _b.toString()) || '');
                const vendor = record.tags.get('vendor');
                if (vendor)
                    vendors.add(((_c = vendor.value) === null || _c === void 0 ? void 0 : _c.toString()) || '');
            });
        });
        const metadata = {
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
    static normalizeContent(content) {
        return content
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n')
            .replace(/\t/g, '  ') // Convert tabs to spaces
            .trim();
    }
    /**
     * Validate trio structure
     */
    static validateTrioStructure(result) {
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
exports.TrioParser = TrioParser;
TrioParser.SECTION_SEPARATOR = '---';
TrioParser.COMMENT_PREFIX = '//';
TrioParser.ZINC_MARKERS = ['M:', 'Bin:', 'C:', 'R:', 'N:', 'S:', 'U:', 'X:'];
/**
 * Convenience function for parsing trio files
 */
function parseTrioFile(fileName, content, options) {
    return TrioParser.parseTrioFile(fileName, content, options);
}
/**
 * Parse trio content and convert to BACnet points
 */
function parseTrioToBACnetPoints(fileName, content, equipmentName) {
    const result = TrioParser.parseTrioFile(fileName, content);
    const points = [];
    result.sections.forEach(section => {
        var _a;
        (_a = section.records) === null || _a === void 0 ? void 0 : _a.forEach(record => {
            const point = TrioParser.trioRecordToBACnetPoint(record, equipmentName);
            if (point) {
                points.push(point);
            }
        });
    });
    return points;
}
