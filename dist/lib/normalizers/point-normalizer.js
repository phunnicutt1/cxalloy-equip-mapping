"use strict";
/**
 * Core BACnet Point Normalization Engine
 * Transforms cryptic BACnet point names into human-readable descriptions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointNormalizer = void 0;
exports.normalizePointName = normalizePointName;
const normalized_1 = require("@/types/normalized");
const haystack_1 = require("@/types/haystack");
const bacnet_acronyms_1 = require("../dictionaries/bacnet-acronyms");
const vendor_specific_1 = require("../dictionaries/vendor-specific");
/**
 * Core Point Normalizer Class
 */
class PointNormalizer {
    /**
     * Main normalization function
     */
    static normalizePointName(point, context = {}) {
        const startTime = Date.now();
        const result = {
            success: false,
            originalPoint: {
                name: point.dis || point.objectName,
                description: point.description || '',
                objectName: point.objectName
            },
            appliedRules: [],
            expandedAcronyms: [],
            warnings: [],
            errors: [],
            suggestions: [],
            processingTimeMs: 0,
            rulesEvaluated: 0
        };
        try {
            // Step 1: Tokenize the point name
            const tokens = this.tokenizePointName(point.dis || point.objectName);
            result.rulesEvaluated++;
            // Step 2: Analyze each token
            const tokenAnalyses = tokens.map(token => this.analyzeToken(token, context));
            result.rulesEvaluated += tokens.length;
            // Step 3: Match acronyms with context awareness
            const acronymMatches = this.matchAcronyms(tokens, context);
            result.expandedAcronyms = acronymMatches.map(match => ({
                original: match.originalToken,
                expanded: match.expansion || match.normalizedToken,
                confidence: match.confidence
            }));
            result.rulesEvaluated += acronymMatches.length;
            // Step 4: Analyze context (equipment type, units, object type)
            const contextAnalysis = this.analyzeContext(point, context);
            result.rulesEvaluated++;
            // Step 5: Determine point function first
            const pointFunction = this.determinePointFunction(tokenAnalyses);
            // Step 6: Generate human-readable description with context
            const description = this.generateDescription(tokenAnalyses, context, pointFunction);
            result.appliedRules.push('token_analysis', 'acronym_expansion', 'context_analysis');
            // Step 7: Generate Haystack tags
            const haystackTags = this.generateHaystackTags(tokenAnalyses, contextAnalysis, pointFunction, description);
            // Step 8: Calculate overall confidence
            const confidence = this.calculateConfidence(tokenAnalyses, contextAnalysis);
            // Step 9: Create normalized point
            const normalizedPoint = {
                originalPointId: point.objectName,
                equipmentId: context.equipmentName || 'unknown',
                originalName: point.dis || point.objectName,
                originalDescription: point.description || '',
                objectName: point.objectName,
                objectType: point.objectType,
                normalizedName: this.formatNormalizedName(description),
                expandedDescription: description,
                pointFunction,
                category: point.category,
                dataType: point.dataType,
                units: point.units || context.units,
                haystackTags,
                confidence: this.getConfidenceLevel(confidence.overall, (context === null || context === void 0 ? void 0 : context.useEnhancedConfidence) !== false),
                confidenceScore: confidence.overall,
                normalizationMethod: confidence.primaryMethod,
                normalizationRules: result.appliedRules,
                hasAcronymExpansion: result.expandedAcronyms.length > 0,
                hasUnitNormalization: !!point.units,
                hasContextInference: !!context.equipmentType || !!context.vendorName,
                requiresManualReview: confidence.overall < 0.7,
                normalizedAt: new Date()
            };
            result.normalizedPoint = normalizedPoint;
            result.success = true;
            // Add suggestions for low confidence results
            if (confidence.overall < 0.8) {
                result.suggestions.push('Consider reviewing this normalization manually due to lower confidence score', 'Verify equipment type and vendor information for better accuracy');
            }
        }
        catch (error) {
            result.success = false;
            result.errors.push(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        result.processingTimeMs = Date.now() - startTime;
        return result;
    }
    /**
     * Tokenize point name by splitting on delimiters and camelCase
     */
    static tokenizePointName(pointName) {
        if (!pointName)
            return [];
        // First split on common delimiters (spaces, underscores, dashes, dots)
        let tokens = pointName.split(this.DELIMITERS).filter(t => t.length > 0);
        // Then handle camelCase within each token, but only if it looks like camelCase
        const finalTokens = [];
        for (const token of tokens) {
            if (token.length === 0)
                continue;
            // Check if token has camelCase pattern (lowercase followed by uppercase)
            const hasCamelCase = /[a-z][A-Z]/.test(token);
            if (hasCamelCase) {
                // Split on camelCase boundaries: insert space before uppercase letters
                const camelSplit = token.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
                finalTokens.push(...camelSplit.filter(t => t.length > 0));
            }
            else {
                // No camelCase, keep as single token
                finalTokens.push(token);
            }
        }
        return finalTokens.filter(token => token.length > 0);
    }
    /**
     * Analyze individual token for possible expansions
     */
    static analyzeToken(token, context) {
        const analysis = {
            originalToken: token,
            normalizedToken: token,
            confidence: 0.1, // Base confidence
            source: 'pattern'
        };
        const matchedAcronym = bacnet_acronyms_1.BACNET_ACRONYMS.find(a => a.acronym.toLowerCase() === token.toLowerCase());
        if (matchedAcronym) {
            analysis.normalizedToken = matchedAcronym.expansion;
            analysis.confidence = matchedAcronym.priority / 10;
            analysis.source = 'general';
            analysis.matchedAcronym = matchedAcronym.acronym;
            analysis.expansion = matchedAcronym.expansion;
        }
        return analysis;
    }
    /**
     * Match acronyms with full context awareness
     */
    static matchAcronyms(tokens, context) {
        return tokens.map(token => this.analyzeToken(token, context));
    }
    /**
     * Analyze context for additional insights
     */
    static analyzeContext(point, context) {
        const equipmentContext = [];
        const unitContext = [];
        const objectTypeContext = [];
        // Equipment type context
        if (context.equipmentType) {
            equipmentContext.push(context.equipmentType);
        }
        // Unit context
        if (point.units || context.units) {
            const units = point.units || context.units || '';
            unitContext.push(units);
            // Infer measurement type from units
            for (const [type, pattern] of Object.entries(this.UNIT_PATTERNS)) {
                if (pattern.test(units)) {
                    unitContext.push(type);
                }
            }
        }
        // Object type context
        if (point.objectType) {
            objectTypeContext.push(point.objectType.toString());
        }
        // Infer vendor from naming patterns
        const inferredVendor = context.vendorName || (0, vendor_specific_1.inferVendorFromPattern)(point.dis || point.objectName) || undefined;
        return {
            equipmentContext,
            unitContext,
            objectTypeContext,
            inferredVendor
        };
    }
    /**
     * Generate human-readable description with context enhancement
     */
    static generateDescription(tokenAnalyses, context, pointFunction) {
        const functionText = pointFunction ? ` ${pointFunction.toString()}` : '';
        const description = tokenAnalyses
            .map(t => t.expansion || t.normalizedToken)
            .filter(t => !['sensor', 'command', 'setpoint', 'status'].includes(t.toLowerCase()))
            .filter(t => isNaN(parseInt(t, 10))) // Filter out numeric tokens
            .join(' ');
        // Capitalize first letter of the entire string
        const finalDescription = description.charAt(0).toUpperCase() + description.slice(1).toLowerCase();
        return `${finalDescription}${functionText}`;
    }
    /**
     * Determine the primary function of the point (Sensor, Setpoint, Command, Status)
     */
    static determinePointFunction(tokenAnalyses) {
        for (const analysis of tokenAnalyses) {
            const matchedAcronym = bacnet_acronyms_1.BACNET_ACRONYMS.find(a => a.acronym.toLowerCase() === analysis.originalToken.toLowerCase());
            if (matchedAcronym && matchedAcronym.pointFunction) {
                switch (matchedAcronym.pointFunction) {
                    case 'Setpoint': return normalized_1.PointFunction.Setpoint;
                    case 'Command': return normalized_1.PointFunction.Command;
                    case 'Status': return normalized_1.PointFunction.Status;
                    case 'Sensor': return normalized_1.PointFunction.Sensor;
                }
            }
        }
        // Default to Sensor if no other function is identified
        return normalized_1.PointFunction.Sensor;
    }
    /**
     * Generate comprehensive Haystack tags based on analysis
     */
    static generateHaystackTags(tokenAnalyses, contextAnalysis, pointFunction, finalDescription) {
        const tags = [];
        const addTag = (name, category, confidence = 0.8) => {
            if (name && !tags.some(t => t.name === name)) {
                tags.push({
                    name,
                    value: undefined,
                    category,
                    isMarker: true,
                    isValid: true,
                    source: 'inferred',
                    confidence,
                    appliedAt: new Date()
                });
            }
        };
        // Default tag
        addTag('point', haystack_1.HaystackTagCategory.ENTITY);
        // Tags from tokens
        tokenAnalyses.forEach(analysis => {
            const token = analysis.originalToken;
            if (['air', 'water', 'steam', 'elec'].includes(token.toLowerCase())) {
                addTag(token.toLowerCase(), haystack_1.HaystackTagCategory.SUBSTANCE);
            }
            if (['temp', 'pressure', 'flow', 'humidity', 'power', 'level'].includes(token.toLowerCase())) {
                addTag(token.toLowerCase(), haystack_1.HaystackTagCategory.MEASUREMENT);
            }
        });
        // Tags from point function
        switch (pointFunction) {
            case normalized_1.PointFunction.Sensor:
                addTag('sensor', haystack_1.HaystackTagCategory.FUNCTION);
                break;
            case normalized_1.PointFunction.Setpoint:
                addTag('sp', haystack_1.HaystackTagCategory.FUNCTION);
                break;
            case normalized_1.PointFunction.Command:
                addTag('cmd', haystack_1.HaystackTagCategory.FUNCTION);
                break;
            case normalized_1.PointFunction.Status:
                addTag('status', haystack_1.HaystackTagCategory.FUNCTION);
                break;
        }
        return tags;
    }
    /**
     * Calculate overall confidence score
     */
    static calculateConfidence(tokenAnalyses, contextAnalysis) {
        var _a;
        if (tokenAnalyses.length === 0) {
            return { overall: 0.1, primaryMethod: 'none' };
        }
        // Calculate weighted average confidence
        const totalConfidence = tokenAnalyses.reduce((sum, analysis) => sum + analysis.confidence, 0);
        const averageConfidence = totalConfidence / tokenAnalyses.length;
        // Boost confidence based on context
        let contextBoost = 0;
        if (contextAnalysis.equipmentContext.length > 0)
            contextBoost += 0.1;
        if (contextAnalysis.unitContext.length > 0)
            contextBoost += 0.1;
        if (contextAnalysis.inferredVendor)
            contextBoost += 0.05;
        const overall = Math.min(averageConfidence + contextBoost, 1.0);
        // Determine primary method
        const methodCounts = tokenAnalyses.reduce((counts, analysis) => {
            counts[analysis.source] = (counts[analysis.source] || 0) + 1;
            return counts;
        }, {});
        const primaryMethod = ((_a = Object.entries(methodCounts)
            .sort(([, a], [, b]) => b - a)[0]) === null || _a === void 0 ? void 0 : _a[0]) || 'pattern';
        return { overall, primaryMethod };
    }
    /**
     * Get confidence level enum from numeric score
     */
    static getConfidenceLevel(score, useEnhanced = true) {
        if (useEnhanced) {
            if (score >= 0.8)
                return 'HIGH';
            if (score >= 0.5)
                return 'MEDIUM';
            if (score >= 0.2)
                return 'LOW';
            return 'UNKNOWN';
        }
        else {
            // Legacy format for backward compatibility
            if (score >= 0.8)
                return normalized_1.NormalizationConfidence.HIGH;
            if (score >= 0.5)
                return normalized_1.NormalizationConfidence.MEDIUM;
            if (score >= 0.2)
                return normalized_1.NormalizationConfidence.LOW;
            return normalized_1.NormalizationConfidence.UNKNOWN;
        }
    }
    /**
     * Format normalized name for display
     */
    static formatNormalizedName(description) {
        // Capitalize the first letter of each word
        const words = description.split(' ');
        const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        return capitalizedWords.join(' ');
    }
    /**
     * Infer meaning from units
     */
    static inferFromUnits(token, units) {
        if (!units)
            return null;
        const lowerToken = token.toLowerCase();
        const lowerUnits = units.toLowerCase();
        // Temperature units
        if (/°?[cf]|deg/.test(lowerUnits)) {
            if (lowerToken.includes('t') || lowerToken.includes('tmp')) {
                return { expansion: 'Temperature', confidence: 0.8 };
            }
        }
        // Flow units
        if (/cfm|gpm|lps/.test(lowerUnits)) {
            if (lowerToken.includes('f') || lowerToken.includes('fl')) {
                return { expansion: 'Flow', confidence: 0.8 };
            }
        }
        // Pressure units
        if (/psi|pa|inh2o/.test(lowerUnits)) {
            if (lowerToken.includes('p') || lowerToken.includes('pr')) {
                return { expansion: 'Pressure', confidence: 0.8 };
            }
        }
        return null;
    }
    /**
     * Infer meaning from common patterns
     */
    static inferFromPattern(token) {
        // Numbers
        if (/^\d+$/.test(token)) {
            return { expansion: token, confidence: 1.0 };
        }
        // Single letters (often abbreviations)
        if (token.length === 1) {
            const singleLetterMappings = {
                'T': 'Temperature',
                'P': 'Pressure',
                'F': 'Flow',
                'S': 'Supply',
                'R': 'Return'
            };
            const mapping = singleLetterMappings[token.toUpperCase()];
            if (mapping) {
                return { expansion: mapping, confidence: 0.4 };
            }
        }
        // Common words that don't need expansion
        const commonWords = ['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];
        if (commonWords.includes(token.toLowerCase())) {
            return { expansion: token.toLowerCase(), confidence: 1.0 };
        }
        return null;
    }
}
exports.PointNormalizer = PointNormalizer;
PointNormalizer.DELIMITERS = /[\s_\-\.]+/;
PointNormalizer.UNIT_PATTERNS = {
    temperature: /°?[CF]|deg|temp/i,
    pressure: /psi|pa|inh2o|inhg|bar|press/i,
    flow: /cfm|gpm|lps|m3h|flow/i,
    percentage: /%|pct|percent/i,
    power: /kw|w|hp|power/i,
    humidity: /%?rh|humidity/i,
    co2: /ppm|co2/i
};
/**
 * Convenience function for simple normalization
 */
function normalizePointName(pointName, equipmentType, vendorName, units) {
    var _a, _b;
    const mockPoint = {
        id: `mock-${pointName}`,
        equipmentId: 'mock-equipment',
        objectName: pointName,
        objectType: 'AI',
        objectInstance: 1,
        dis: pointName,
        displayName: pointName,
        dataType: 'Number',
        category: 'SENSOR',
        description: '',
        isWritable: false,
        isCommand: false,
        units,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const context = {
        equipmentType,
        vendorName,
        units
    };
    const result = PointNormalizer.normalizePointName(mockPoint, context);
    return {
        normalizedName: ((_a = result.normalizedPoint) === null || _a === void 0 ? void 0 : _a.normalizedName) || pointName,
        confidence: ((_b = result.normalizedPoint) === null || _b === void 0 ? void 0 : _b.confidenceScore) || 0.1
    };
}
exports.default = PointNormalizer;
