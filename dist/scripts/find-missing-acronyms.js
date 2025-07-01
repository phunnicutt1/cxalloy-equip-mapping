"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bacnet_acronyms_1 = require("../lib/dictionaries/bacnet-acronyms");
const uploadsDir = path.join(__dirname, '../../sample_point_data');
const trioFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.trio'));
const existingAcronyms = new Set(bacnet_acronyms_1.BACNET_ACRONYMS.map(a => a.acronym.toLowerCase()));
const unknownTokens = new Set();
const DELIMITERS = /[\s_\-\.]+/;
function tokenizePointName(pointName) {
    if (!pointName)
        return [];
    // First split on common delimiters (spaces, underscores, dashes, dots)
    let tokens = pointName.split(DELIMITERS).filter(t => t.length > 0);
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
for (const file of trioFiles) {
    const filePath = path.join(uploadsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = content.split('---');
    for (const record of records) {
        const lines = record.split('\n');
        const disLine = lines.find(l => l.startsWith('dis:'));
        if (disLine) {
            const pointName = disLine.substring(4).trim();
            const tokens = tokenizePointName(pointName);
            for (const token of tokens) {
                if (!existingAcronyms.has(token.toLowerCase())) {
                    // Ignore purely numeric tokens
                    if (isNaN(parseInt(token, 10))) {
                        unknownTokens.add(token);
                    }
                }
            }
        }
    }
}
console.log('Unknown acronyms found in sample data:');
console.log(Array.from(unknownTokens).sort().join('\n'));
