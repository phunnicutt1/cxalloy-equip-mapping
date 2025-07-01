"use strict";
/**
 * Project Haystack v5 Compliance Validation and Export Utilities
 * Validates tags against Haystack specifications and exports to various formats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHaystackTags = validateHaystackTags;
exports.exportToSkySpark = exportToSkySpark;
exports.exportToZinc = exportToZinc;
exports.exportToTrio = exportToTrio;
exports.generateComplianceReport = generateComplianceReport;
exports.validateBatchHaystackTags = validateBatchHaystackTags;
exports.generateBatchComplianceReport = generateBatchComplianceReport;
/**
 * Official Project Haystack v5 marker definitions
 */
const OFFICIAL_HAYSTACK_MARKERS = new Set([
    // Core markers
    'point', 'equip', 'site', 'space', 'floor', 'ref', 'marker',
    // Point role markers
    'sensor', 'cmd', 'sp', 'setpoint',
    // Physical quantity markers
    'temp', 'temperature', 'pressure', 'flow', 'humidity', 'power', 'energy',
    'voltage', 'current', 'freq', 'frequency', 'co2', 'co', 'voc',
    // Equipment markers
    'ahu', 'vav', 'rtu', 'chiller', 'boiler', 'pump', 'fan', 'humidifier',
    'dehumidifier', 'fcu', 'cuh', 'uh', 'coolingTower', 'heatExchanger',
    'elecPanel', 'elecMeter', 'economizer',
    // Location markers
    'zone', 'discharge', 'return', 'outside', 'mixed', 'exhaust', 'relief',
    'entering', 'leaving', 'supply', 'coil', 'filter', 'damper', 'valve',
    'duct', 'pipe', 'roof', 'basement', 'mechanical',
    // System markers
    'hvac', 'elec', 'water', 'air', 'hot', 'chilled', 'condenser',
    'cooling', 'heating', 'reheat',
    // Property markers
    'writable', 'analog', 'binary', 'enum', 'run', 'enable', 'status',
    'alarm', 'fault', 'feedback', 'position', 'speed', 'stage',
    // Unit markers
    'fahrenheit', 'celsius', 'kelvin', 'pascal', 'percentage', 'electric',
    'min', 'max', 'high', 'low', 'static', 'differential',
    // Quality markers
    'concentration', 'quality', 'time', 'level', 'angle',
    // Equipment component markers
    'compressor', 'evaporator', 'condenser', 'burner', 'flame',
    // Scheduling and control markers
    'schedule', 'override', 'manual', 'auto'
]);
/**
 * Deprecated or non-standard markers that should be flagged
 */
const DEPRECATED_MARKERS = new Set([
    'bacnet', 'vendor', 'device', 'network', 'instance'
]);
/**
 * Required marker combinations for semantic completeness
 */
const REQUIRED_COMBINATIONS = [
    {
        name: 'Point Role',
        description: 'All points should have a role marker',
        required: ['point'],
        shouldHave: ['sensor', 'cmd', 'sp'],
        severity: 'warning'
    },
    {
        name: 'Equipment Context',
        description: 'HVAC points should have equipment context',
        required: ['point', 'hvac'],
        shouldHave: ['ahu', 'vav', 'rtu', 'chiller', 'boiler', 'pump', 'fan'],
        severity: 'info'
    },
    {
        name: 'Physical Quantity',
        description: 'Sensor points should have physical quantity',
        required: ['point', 'sensor'],
        shouldHave: ['temp', 'pressure', 'flow', 'humidity', 'power', 'energy'],
        severity: 'info'
    }
];
/**
 * Conflicting marker combinations that should not coexist
 */
const CONFLICTING_COMBINATIONS = [
    {
        name: 'Multiple Roles',
        description: 'Points should not have multiple role markers',
        markers: ['sensor', 'cmd', 'sp'],
        maxAllowed: 1,
        severity: 'error'
    },
    {
        name: 'Temperature Units',
        description: 'Points should not have multiple temperature unit markers',
        markers: ['fahrenheit', 'celsius', 'kelvin'],
        maxAllowed: 1,
        severity: 'warning'
    },
    {
        name: 'Equipment Types',
        description: 'Points should not have multiple primary equipment types',
        markers: ['ahu', 'vav', 'rtu', 'chiller', 'boiler'],
        maxAllowed: 1,
        severity: 'warning'
    }
];
/**
 * Validate Haystack tags against Project Haystack v5 specifications
 */
function validateHaystackTags(tagSet) {
    const result = {
        isValid: true,
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        completeness: 1.0,
        confidence: 1.0,
        compliance: {
            level: 'full',
            score: 100,
            details: []
        }
    };
    let complianceScore = 100;
    const markers = tagSet.tags ? tagSet.tags.map(tag => tag.name) : [];
    // Validate individual markers
    for (const marker of markers) {
        if (!OFFICIAL_HAYSTACK_MARKERS.has(marker)) {
            if (DEPRECATED_MARKERS.has(marker)) {
                result.warnings.push(`Deprecated marker: ${marker}`);
                complianceScore -= 2;
            }
            else if (!marker.includes(':')) { // Allow vendor-specific markers with colons
                result.warnings.push(`Non-standard marker: ${marker}`);
                complianceScore -= 3;
            }
        }
    }
    // Check for required combinations
    for (const combination of REQUIRED_COMBINATIONS) {
        const hasRequired = combination.required.every(marker => markers.includes(marker));
        if (hasRequired) {
            const hasShouldHave = combination.shouldHave.some(marker => markers.includes(marker));
            if (!hasShouldHave) {
                const message = `${combination.name}: ${combination.description}. Consider adding one of: ${combination.shouldHave.join(', ')}`;
                if (combination.severity === 'warning') {
                    result.warnings.push(message);
                    complianceScore -= 5;
                }
                else {
                    result.suggestions.push(message);
                    complianceScore -= 2;
                }
            }
        }
    }
    // Check for conflicting combinations
    for (const conflict of CONFLICTING_COMBINATIONS) {
        const presentMarkers = conflict.markers.filter(marker => markers.includes(marker));
        if (presentMarkers.length > conflict.maxAllowed) {
            const message = `${conflict.name}: ${conflict.description}. Found: ${presentMarkers.join(', ')}`;
            if (conflict.severity === 'error') {
                result.errors.push(message);
                result.valid = false;
                result.isValid = false;
                complianceScore -= 15;
            }
            else {
                result.warnings.push(message);
                complianceScore -= 8;
            }
        }
    }
    // Validate required base marker
    if (!markers.includes('point')) {
        result.errors.push('Missing required "point" marker');
        result.valid = false;
        result.isValid = false;
        complianceScore -= 20;
    }
    // Update compliance score
    if (result.compliance) {
        result.compliance.score = Math.max(0, complianceScore);
        if (complianceScore >= 90) {
            result.compliance.level = 'full';
        }
        else if (complianceScore >= 70) {
            result.compliance.level = 'high';
        }
        else if (complianceScore >= 50) {
            result.compliance.level = 'medium';
        }
        else {
            result.compliance.level = 'low';
        }
    }
    // Update completeness based on compliance score
    result.completeness = complianceScore / 100;
    result.confidence = Math.min(1.0, result.completeness + 0.1);
    return result;
}
/**
 * Export tag set to SkySpark format
 */
function exportToSkySpark(tagSet) {
    const tags = tagSet.tags || [];
    const markers = tags.filter(tag => tag.isMarker).map(tag => tag.name);
    const values = tags.filter(tag => !tag.isMarker);
    let result = `id:@${tagSet.id || 'point'}\n`;
    result += `dis:"${tagSet.dis || 'Unknown Point'}"\n`;
    // Add markers
    markers.forEach(marker => {
        result += `${marker}\n`;
    });
    // Add value tags
    values.forEach(tag => {
        result += `${tag.name}:${tag.value || 'N/A'}\n`;
    });
    return result;
}
/**
 * Export tag set to Zinc format
 */
function exportToZinc(tagSet) {
    const tags = tagSet.tags || [];
    const tagPairs = [];
    tagPairs.push(`id:@${tagSet.id || 'point'}`);
    tagPairs.push(`dis:"${tagSet.dis || 'Unknown Point'}"`);
    tags.forEach(tag => {
        if (tag.isMarker) {
            tagPairs.push(tag.name);
        }
        else {
            tagPairs.push(`${tag.name}:${tag.value || 'N/A'}`);
        }
    });
    return tagPairs.join(' ');
}
/**
 * Export tag set to Trio format
 */
function exportToTrio(tagSet) {
    const tags = tagSet.tags || [];
    let result = `id:@${tagSet.id || 'point'}\n`;
    result += `dis:"${tagSet.dis || 'Unknown Point'}"\n`;
    tags.forEach(tag => {
        if (tag.isMarker) {
            result += `${tag.name}\n`;
        }
        else {
            result += `${tag.name}:${tag.value || 'N/A'}\n`;
        }
    });
    return result + '\n';
}
/**
 * Generate compliance report for multiple tag sets
 */
function generateComplianceReport(results) {
    const totalPoints = results.length;
    const validPoints = results.filter(r => r.valid).length;
    const averageScore = results.reduce((acc, r) => { var _a; return acc + (((_a = r.compliance) === null || _a === void 0 ? void 0 : _a.score) || 0); }, 0) / totalPoints;
    const complianceLevels = {
        full: results.filter(r => { var _a; return ((_a = r.compliance) === null || _a === void 0 ? void 0 : _a.level) === 'full'; }).length,
        high: results.filter(r => { var _a; return ((_a = r.compliance) === null || _a === void 0 ? void 0 : _a.level) === 'high'; }).length,
        medium: results.filter(r => { var _a; return ((_a = r.compliance) === null || _a === void 0 ? void 0 : _a.level) === 'medium'; }).length,
        low: results.filter(r => { var _a; return ((_a = r.compliance) === null || _a === void 0 ? void 0 : _a.level) === 'low'; }).length
    };
    // Aggregate issues
    const errorCounts = new Map();
    const warningCounts = new Map();
    const suggestionCounts = new Map();
    results.forEach(result => {
        result.errors.forEach(error => {
            errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });
        result.warnings.forEach(warning => {
            warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1);
        });
        result.suggestions.forEach(suggestion => {
            suggestionCounts.set(suggestion, (suggestionCounts.get(suggestion) || 0) + 1);
        });
    });
    const errors = Array.from(errorCounts.entries()).map(([message, count]) => ({ message, count }));
    const warnings = Array.from(warningCounts.entries()).map(([message, count]) => ({ message, count }));
    const suggestions = Array.from(suggestionCounts.entries()).map(([message, count]) => ({ message, count }));
    const recommendations = [];
    if (averageScore < 80) {
        recommendations.push('Consider reviewing tag consistency across all points');
    }
    if (errors.length > 0) {
        recommendations.push('Address critical errors to improve compliance');
    }
    if (warnings.length > totalPoints * 0.3) {
        recommendations.push('Review warning patterns to improve tag quality');
    }
    return {
        summary: {
            totalPoints,
            validPoints,
            averageScore,
            complianceLevels
        },
        issues: {
            errors,
            warnings,
            suggestions
        },
        recommendations
    };
}
/**
 * Validate multiple tag sets in batch
 */
function validateBatchHaystackTags(tagSets) {
    return tagSets.map(tagSet => validateHaystackTags(tagSet));
}
/**
 * Generate batch compliance report
 */
function generateBatchComplianceReport(tagSets) {
    const results = validateBatchHaystackTags(tagSets);
    const report = generateComplianceReport(results);
    return {
        generatedAt: new Date(),
        totalEntities: report.summary.totalPoints,
        totalPoints: report.summary.totalPoints,
        compliantEntities: report.summary.validPoints,
        validPoints: report.summary.validPoints,
        complianceRate: report.summary.totalPoints > 0 ? report.summary.validPoints / report.summary.totalPoints : 0,
        averageCompliance: report.summary.averageScore,
        complianceDistribution: {
            full: report.summary.complianceLevels.full || 0,
            high: report.summary.complianceLevels.high || 0,
            medium: report.summary.complianceLevels.medium || 0,
            low: report.summary.complianceLevels.low || 0
        },
        commonIssues: [
            ...report.issues.errors.map(err => ({ issue: err.message, count: err.count, severity: 'high' })),
            ...report.issues.warnings.map(warn => ({ issue: warn.message, count: warn.count, severity: 'medium' }))
        ],
        recommendations: report.recommendations
    };
}
