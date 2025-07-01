"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
exports.validateTrioFormat = validateTrioFormat;
exports.validateConnectorData = validateConnectorData;
exports.validateFile = validateFile;
/**
 * Comprehensive validation utilities for trio files and connector data
 */
class ValidationUtils {
    /**
     * Validate trio file format compliance
     */
    static validateTrioFormat(content) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            metadata: {
                sectionCount: 0,
                estimatedPointCount: 0,
                hasValidSeparators: false,
                hasValidTags: false,
                commonIssues: []
            }
        };
        try {
            // Basic content checks
            if (!content || content.trim().length === 0) {
                result.errors.push('File is empty or contains only whitespace');
                result.isValid = false;
                return result;
            }
            // Check for section separators
            const sections = content.split('---').map(s => s.trim()).filter(s => s.length > 0);
            result.metadata.sectionCount = sections.length;
            result.metadata.hasValidSeparators = sections.length > 0;
            if (sections.length === 0) {
                result.errors.push('No valid sections found (missing --- separators)');
                result.isValid = false;
            }
            // Validate each section
            let validSectionCount = 0;
            let totalPointsFound = 0;
            sections.forEach((section, index) => {
                const sectionValidation = this.validateTrioSection(section);
                if (sectionValidation.isValid) {
                    validSectionCount++;
                    totalPointsFound++;
                }
                else {
                    result.errors.push(...sectionValidation.errors.map(e => `Section ${index}: ${e}`));
                    result.warnings.push(...sectionValidation.warnings.map(w => `Section ${index}: ${w}`));
                }
            });
            result.metadata.estimatedPointCount = totalPointsFound;
            result.metadata.hasValidTags = validSectionCount > 0;
            // Check for common issues
            const commonIssues = this.detectCommonTrioIssues(content);
            result.metadata.commonIssues = commonIssues;
            result.warnings.push(...commonIssues);
            // Generate suggestions
            result.suggestions = this.generateTrioSuggestions(result);
            // Final validation
            if (validSectionCount === 0) {
                result.errors.push('No valid sections with proper trio format found');
                result.isValid = false;
            }
            if (result.errors.length > 0) {
                result.isValid = false;
            }
        }
        catch (error) {
            result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.isValid = false;
        }
        return result;
    }
    /**
     * Validate individual trio section
     */
    static validateTrioSection(section) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) {
            result.errors.push('Section is empty');
            result.isValid = false;
            return result;
        }
        let hasPointTag = false;
        let tagCount = 0;
        for (const line of lines) {
            // Skip comments
            if (line.startsWith('//'))
                continue;
            // Check for key-value pairs
            if (line.includes(':')) {
                const [key, value] = line.split(':', 2).map(s => s.trim());
                if (!key) {
                    result.warnings.push(`Empty tag key in line: "${line}"`);
                    continue;
                }
                tagCount++;
                // Validate specific tags
                if (key === 'bacnetCur') {
                    if (!this.validateBACnetReference(value)) {
                        result.warnings.push(`Invalid BACnet reference format: "${value}"`);
                    }
                }
                if (key === 'kind') {
                    if (!['Number', 'Bool', 'String', 'Coord', 'Date', 'DateTime', 'Time', 'Uri'].includes(value)) {
                        result.warnings.push(`Unknown kind value: "${value}"`);
                    }
                }
            }
            else {
                // Standalone tag (marker)
                if (line === 'point') {
                    hasPointTag = true;
                }
                tagCount++;
            }
        }
        // Check requirements
        if (!hasPointTag) {
            result.errors.push('Missing required "point" tag');
            result.isValid = false;
        }
        if (tagCount < 2) {
            result.warnings.push('Section has very few tags, may be incomplete');
        }
        return result;
    }
    /**
     * Validate BACnet object reference format
     */
    static validateBACnetReference(value) {
        if (!value)
            return false;
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        // Check for BACnet object pattern (e.g., AI744, AO443, AV1409)
        const bacnetPattern = /^([A-Z]+)(\d+)$/;
        const match = cleanValue.match(bacnetPattern);
        if (!match)
            return false;
        const [, objectType, instance] = match;
        // Validate object type
        if (!this.BACNET_OBJECT_TYPES.includes(objectType)) {
            return false;
        }
        // Validate instance (should be positive integer)
        const instanceNum = parseInt(instance, 10);
        return instanceNum >= 0 && instanceNum <= 4194303; // BACnet instance range
    }
    /**
     * Detect common trio file issues
     */
    static detectCommonTrioIssues(content) {
        const issues = [];
        // Check for inconsistent line endings
        if (content.includes('\r\n') && content.includes('\n')) {
            issues.push('Mixed line endings detected (CRLF and LF)');
        }
        // Check for tabs vs spaces
        if (content.includes('\t')) {
            issues.push('File contains tab characters, consider using spaces');
        }
        // Check for very long lines
        const lines = content.split('\n');
        const longLines = lines.filter(line => line.length > 200);
        if (longLines.length > 0) {
            issues.push(`${longLines.length} lines exceed 200 characters`);
        }
        // Check for potential encoding issues
        if (content.includes('�')) {
            issues.push('Potential character encoding issues detected');
        }
        // Check for common typos
        const commonTypos = ['dis:', 'ponit', 'bacnetCurr', 'baccnet'];
        for (const typo of commonTypos) {
            if (content.includes(typo)) {
                issues.push(`Potential typo detected: "${typo}"`);
            }
        }
        return issues;
    }
    /**
     * Generate suggestions for trio format improvements
     */
    static generateTrioSuggestions(result) {
        const suggestions = [];
        if (result.metadata.sectionCount === 0) {
            suggestions.push('Add section separators (---) between different points');
        }
        if (result.metadata.estimatedPointCount < 5) {
            suggestions.push('Consider adding more detailed point information');
        }
        if (!result.metadata.hasValidTags) {
            suggestions.push('Ensure each section has required tags like "dis", "point", "bacnetCur"');
        }
        if (result.metadata.commonIssues.length > 0) {
            suggestions.push('Review and fix formatting issues mentioned in warnings');
        }
        return suggestions;
    }
    /**
     * Validate connector CSV data
     */
    static validateConnectorData(csvContent) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            metadata: {
                rowCount: 0,
                columnCount: 0,
                missingFields: [],
                dataTypes: {},
                uniqueValues: {}
            }
        };
        try {
            if (!csvContent || csvContent.trim().length === 0) {
                result.errors.push('CSV content is empty');
                result.isValid = false;
                return result;
            }
            const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length < 2) {
                result.errors.push('CSV must have at least header and one data row');
                result.isValid = false;
                return result;
            }
            // Parse header
            const headerLine = lines[0];
            const headers = this.parseCSVLine(headerLine);
            result.metadata.columnCount = headers.length;
            // Check for required fields
            const requiredFields = ['dis', 'bacnetDeviceName', 'conn'];
            const missingFields = requiredFields.filter(field => !headers.includes(field));
            result.metadata.missingFields = missingFields;
            if (missingFields.length > 0) {
                result.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
                result.isValid = false;
            }
            // Parse data rows
            const dataRows = lines.slice(1);
            result.metadata.rowCount = dataRows.length;
            // Validate data consistency
            let validRowCount = 0;
            const columnStats = {};
            // Initialize column stats
            headers.forEach(header => {
                columnStats[header] = { type: 'string', uniqueCount: 0, nullCount: 0 };
            });
            dataRows.forEach((row, index) => {
                const values = this.parseCSVLine(row);
                if (values.length !== headers.length) {
                    result.warnings.push(`Row ${index + 2} has ${values.length} columns, expected ${headers.length}`);
                }
                else {
                    validRowCount++;
                }
                // Update column statistics
                values.forEach((value, colIndex) => {
                    if (colIndex < headers.length) {
                        const header = headers[colIndex];
                        const stat = columnStats[header];
                        if (!value || value.trim() === '') {
                            stat.nullCount++;
                        }
                        else {
                            stat.uniqueCount++;
                        }
                    }
                });
            });
            // Set metadata
            result.metadata.dataTypes = Object.fromEntries(Object.entries(columnStats).map(([key, stat]) => [key, stat.type]));
            result.metadata.uniqueValues = Object.fromEntries(Object.entries(columnStats).map(([key, stat]) => [key, stat.uniqueCount]));
            // Check data quality
            if (validRowCount / dataRows.length < 0.8) {
                result.warnings.push('More than 20% of rows have column count mismatches');
            }
            // Check for empty critical fields
            Object.entries(columnStats).forEach(([field, stat]) => {
                if (requiredFields.includes(field) && stat.nullCount > dataRows.length * 0.1) {
                    result.warnings.push(`Field "${field}" has more than 10% empty values`);
                }
            });
        }
        catch (error) {
            result.errors.push(`CSV validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.isValid = false;
        }
        return result;
    }
    /**
     * Parse CSV line handling quoted values
     */
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        while (i < line.length) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                }
                else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            }
            else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current.trim());
                current = '';
                i++;
            }
            else {
                current += char;
                i++;
            }
        }
        // Add final field
        result.push(current.trim());
        return result;
    }
    /**
     * Validate file extension
     */
    static validateFileExtension(fileName, allowedExtensions) {
        var _a;
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        const extension = (_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (!extension) {
            result.errors.push('File has no extension');
            result.isValid = false;
        }
        else if (!allowedExtensions.map(ext => ext.toLowerCase()).includes(extension)) {
            result.errors.push(`Invalid file extension: .${extension}. Allowed: ${allowedExtensions.join(', ')}`);
            result.isValid = false;
        }
        return result;
    }
    /**
     * Validate file size
     */
    static validateFileSize(content, maxSizeBytes = 10 * 1024 * 1024) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        const sizeBytes = new Blob([content]).size;
        if (sizeBytes > maxSizeBytes) {
            result.errors.push(`File size (${(sizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`);
            result.isValid = false;
        }
        else if (sizeBytes > maxSizeBytes * 0.8) {
            result.warnings.push(`File size is approaching maximum limit`);
        }
        return result;
    }
}
exports.ValidationUtils = ValidationUtils;
ValidationUtils.REQUIRED_TRIO_TAGS = ['dis', 'point'];
ValidationUtils.COMMON_TRIO_TAGS = [
    'dis', 'bacnetCur', 'bacnetDesc', 'kind', 'point', 'unit',
    'writable', 'cmd', 'bacnetWrite', 'bacnetWriteLevel'
];
ValidationUtils.BACNET_OBJECT_TYPES = [
    'AI', 'AO', 'AV', 'BI', 'BO', 'BV', 'MSV', 'MSI', 'MSO',
    'DEVICE', 'PROGRAM', 'SCHEDULE', 'CALENDAR', 'COMMAND',
    'NOTIFICATION_CLASS', 'TREND_LOG', 'FILE', 'GROUP'
];
/**
 * Convenience functions
 */
function validateTrioFormat(content) {
    return ValidationUtils.validateTrioFormat(content);
}
function validateConnectorData(csvContent) {
    return ValidationUtils.validateConnectorData(csvContent);
}
function validateFile(fileName, content, allowedExtensions = ['trio', 'csv']) {
    const extensionResult = ValidationUtils.validateFileExtension(fileName, allowedExtensions);
    const sizeResult = ValidationUtils.validateFileSize(content);
    return {
        isValid: extensionResult.isValid && sizeResult.isValid,
        errors: [...extensionResult.errors, ...sizeResult.errors],
        warnings: [...extensionResult.warnings, ...sizeResult.warnings]
    };
}
