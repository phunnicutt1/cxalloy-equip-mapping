/**
 * Abbreviation Analysis Service
 * 
 * Analyzes TRIO files for abbreviations in descriptions and suggests
 * additions to the BACnet acronym dictionary during file processing.
 */

import { readFileSync } from 'fs';
import { BACNET_ACRONYMS } from '../dictionaries/bacnet-acronyms';
import { parseTrioFile } from '../parsers/trio-parser';

interface AbbreviationAnalysis {
  abbreviation: string;
  examples: Array<{
    file: string;
    pointName: string;
    description: string;
    context: string;
  }>;
  frequency: number;
  inDictionary: boolean;
  suggestedExpansion?: string;
}

interface AnalysisResult {
  totalFilesAnalyzed: number;
  totalPointsProcessed: number;
  uniqueAbbreviationsFound: number;
  newAbbreviationsDiscovered: number;
  topNewAbbreviations: AbbreviationAnalysis[];
  suggestedDictionaryAdditions: Array<{
    acronym: string;
    expansion: string;
    category: string;
    priority: number;
    tags: string[];
  }>;
}

// Enhanced BACnet abbreviations based on analysis
const KNOWN_BACNET_ABBREVIATIONS: Record<string, string> = {
  // Your examples from scripts/analyze-abbreviations.ts
  'CCW': 'Counterclockwise',
  'CLR': 'Clear',
  'PRI': 'Primary',
  'DAT': 'Data',
  
  // Water systems
  'CHW': 'Chilled Water',
  'HHW': 'Hot Heating Water',
  'CW': 'Condenser Water',
  'HW': 'Hot Water',
  'WTR': 'Water',
  
  // HVAC equipment
  'RTU': 'Rooftop Unit',
  'AHU': 'Air Handling Unit',
  'VAV': 'Variable Air Volume',
  'FCU': 'Fan Coil Unit',
  'CAV': 'Constant Air Volume',
  'FPB': 'Fan Powered Box',
  'TU': 'Terminal Unit',
  
  // Air flow
  'CFM': 'Cubic Feet per Minute',
  'FPM': 'Feet per Minute',
  'ACH': 'Air Changes per Hour',
  'SCFM': 'Standard Cubic Feet per Minute',
  
  // Electrical
  'KW': 'Kilowatts',
  'KWH': 'Kilowatt Hours',
  'AMP': 'Amperage',
  'VOLT': 'Voltage',
  'VA': 'Volt-Amperes',
  'PF': 'Power Factor',
  
  // Controls
  'PID': 'Proportional Integral Derivative',
  'DDC': 'Direct Digital Control',
  'BAS': 'Building Automation System',
  'EMS': 'Energy Management System',
  'VFD': 'Variable Frequency Drive',
  'HOA': 'Hand Off Auto',
  
  // Common descriptors
  'MIN': 'Minimum',
  'MAX': 'Maximum',
  'AVG': 'Average',
  'TOT': 'Total',
  'CUR': 'Current',
  'REQ': 'Required',
  'ACT': 'Actual',
  'EFF': 'Effective',
  'NOM': 'Nominal',
  'ADJ': 'Adjustable',
  'AUTO': 'Automatic',
  'MAN': 'Manual',
  
  // Time
  'SEC': 'Seconds',
  'MINS': 'Minutes',
  'HR': 'Hours',
  'DAY': 'Days',

  // Directions/positions
  'CLKW': 'Clockwise',
  'UP': 'Up',
  'DN': 'Down',
  'IN': 'Inlet',
  'OUT': 'Outlet',
  'FWD': 'Forward',
  'REV': 'Reverse',
  
  // Status/modes
  'EN': 'Enable',
  'DIS': 'Disable',
  'ON': 'On',
  'OFF': 'Off',
  'RUN': 'Running',
  'STOP': 'Stopped',
  'STBY': 'Standby',
  'ALM': 'Alarm',
  'OK': 'Okay',
  'FAIL': 'Failed',
  'NORM': 'Normal',
  
  // Locations
  'BLD': 'Building',
  'FLR': 'Floor',
  'RM': 'Room',
  'ZN': 'Zone',
  'BSMT': 'Basement',
  'MECH': 'Mechanical',
  'ELEC': 'Electrical',
  'ROOF': 'Rooftop',
  
  // Miscellaneous
  'MISC': 'Miscellaneous',
  'AUX': 'Auxiliary',
  'EMRG': 'Emergency',
  'MAINT': 'Maintenance',
  'TEST': 'Test',
  'SIM': 'Simulation',
  'CAL': 'Calibration',
  'CFG': 'Configuration',
  'LOG': 'Logging'
};

export class AbbreviationAnalysisService {
  /**
   * Analyzes TRIO data for abbreviations
   */
  static async analyzeTrioData(trioFiles: Array<{ name: string; content: string }>): Promise<AnalysisResult> {
    console.log('\x1b[36m[ABBREVIATION ANALYSIS]\x1b[0m Starting analysis of TRIO files for abbreviations...');
    
    const abbreviationMap = new Map<string, AbbreviationAnalysis>();
    let totalFiles = 0;
    let totalPoints = 0;
    
    for (const file of trioFiles) {
      totalFiles++;
      
      try {
        const trioData = parseTrioFile(file.name, file.content);
        const allRecords = trioData.sections.flatMap((section: any) => section.records || []);
        
        totalPoints += allRecords.length;
        
        for (const record of allRecords) {
          const description = record.bacnetDesc || record.description || '';
          if (!description) continue;
          
          const abbreviations = this.extractAbbreviations(description);
          
          for (const abbr of abbreviations) {
            if (!abbreviationMap.has(abbr)) {
              abbreviationMap.set(abbr, {
                abbreviation: abbr,
                examples: [],
                frequency: 0,
                inDictionary: this.isInDictionary(abbr),
                suggestedExpansion: this.suggestExpansion(abbr)
              });
            }
            
            const analysis = abbreviationMap.get(abbr)!;
            analysis.frequency++;
            
            if (analysis.examples.length < 3) {
              analysis.examples.push({
                file: file.name,
                pointName: record.dis || record.objectName || 'unknown',
                description,
                context: description
              });
            }
          }
        }
        
      } catch (error) {
        console.error(`\x1b[31m[ABBREVIATION ANALYSIS]\x1b[0m Error parsing ${file.name}:`, error);
      }
    }
    
    // Sort by frequency and filter for new abbreviations
    const sortedAbbreviations = Array.from(abbreviationMap.values())
      .sort((a, b) => b.frequency - a.frequency);
    
    const newAbbreviations = sortedAbbreviations.filter(a => !a.inDictionary);
    const topNewAbbreviations = newAbbreviations.slice(0, 15);
    
    // Generate dictionary additions for high-frequency abbreviations
    const suggestedDictionaryAdditions = topNewAbbreviations
      .filter(a => a.suggestedExpansion && a.frequency >= 2)
      .slice(0, 10)
      .map(abbr => {
        const priority = Math.min(8, 4 + Math.floor(abbr.frequency / 3));
        const category = this.categorizeAbbreviation(abbr.suggestedExpansion!);
        
        return {
          acronym: abbr.abbreviation,
          expansion: abbr.suggestedExpansion!,
          category,
          priority,
          tags: abbr.suggestedExpansion!.toLowerCase().split(' ').slice(0, 2)
        };
      });
    
    const result: AnalysisResult = {
      totalFilesAnalyzed: totalFiles,
      totalPointsProcessed: totalPoints,
      uniqueAbbreviationsFound: abbreviationMap.size,
      newAbbreviationsDiscovered: newAbbreviations.length,
      topNewAbbreviations,
      suggestedDictionaryAdditions
    };
    
    // Log results
    this.logAnalysisResults(result);
    
    return result;
  }
  
  /**
   * Extract potential abbreviations from text
   */
  private static extractAbbreviations(text: string): string[] {
    const patterns = [
      /\b[A-Z]{2,5}\b/g,           // All caps 2-5 chars
      /\b[A-Z][a-z]*[A-Z][a-z]*\b/g, // CamelCase
      /\b[A-Z]+\d+[A-Z]*\b/g,     // Letters + numbers
      /\b[A-Z][a-z]+\d+\b/g       // Word + number
    ];
    
    const abbreviations = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        // Filter out common words that aren't abbreviations
        if (!['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THIS', 'THAT', 'HAVE', 'WILL'].includes(match)) {
          abbreviations.add(match);
        }
      });
    }
    
    return Array.from(abbreviations);
  }
  
  /**
   * Check if abbreviation is in the BACnet dictionary
   */
  private static isInDictionary(abbreviation: string): boolean {
    return BACNET_ACRONYMS.some(entry => 
      entry.acronym.toUpperCase() === abbreviation.toUpperCase()
    );
  }
  
  /**
   * Suggest expansion for abbreviation
   */
  private static suggestExpansion(abbreviation: string): string | undefined {
    const upper = abbreviation.toUpperCase();
    
    // Check our known abbreviations first
    if (KNOWN_BACNET_ABBREVIATIONS[upper]) {
      return KNOWN_BACNET_ABBREVIATIONS[upper];
    }
    
    // Pattern-based suggestions
    if (upper.endsWith('SP')) return abbreviation.slice(0, -2) + ' Setpoint';
    if (upper.endsWith('CMD')) return abbreviation.slice(0, -3) + ' Command';
    if (upper.endsWith('STS') || upper.endsWith('STAT')) return abbreviation.slice(0, -3) + ' Status';
    if (upper.endsWith('TEMP') || upper.endsWith('TMP')) return abbreviation.slice(0, -4) + ' Temperature';
    if (upper.endsWith('PRESS') || upper.endsWith('PR')) return abbreviation.slice(0, -2) + ' Pressure';
    if (upper.endsWith('FLOW') || upper.endsWith('FLO')) return abbreviation.slice(0, -3) + ' Flow';
    
    return undefined;
  }
  
  /**
   * Categorize abbreviation by its expansion
   */
  private static categorizeAbbreviation(expansion: string): string {
    const lower = expansion.toLowerCase();
    
    if (lower.includes('temperature') || lower.includes('temp')) return 'Temperature';
    if (lower.includes('pressure') || lower.includes('press')) return 'Pressure';
    if (lower.includes('flow') || lower.includes('volume') || lower.includes('cfm')) return 'Measurement';
    if (lower.includes('command') || lower.includes('cmd')) return 'Control';
    if (lower.includes('status') || lower.includes('alarm')) return 'Status';
    if (lower.includes('setpoint') || lower.includes('set')) return 'Control';
    if (lower.includes('fan') || lower.includes('pump') || lower.includes('valve')) return 'Equipment';
    if (lower.includes('water') || lower.includes('air')) return 'Medium';
    if (lower.includes('direction') || lower.includes('position')) return 'Direction';
    
    return 'Equipment';
  }
  
  /**
   * Log analysis results with color coding
   */
  private static logAnalysisResults(result: AnalysisResult): void {
    console.log('\x1b[36m[ABBREVIATION ANALYSIS]\x1b[0m Analysis Results:');
    console.log(`   Files analyzed: ${result.totalFilesAnalyzed}`);
    console.log(`   Points processed: ${result.totalPointsProcessed}`);
    console.log(`   Unique abbreviations: ${result.uniqueAbbreviationsFound}`);
    console.log(`   New abbreviations: ${result.newAbbreviationsDiscovered}`);
    
    if (result.topNewAbbreviations.length > 0) {
      console.log('\x1b[33m[ABBREVIATION ANALYSIS]\x1b[0m Top New Abbreviations:');
      
      for (const abbr of result.topNewAbbreviations.slice(0, 5)) {
        const expansion = abbr.suggestedExpansion || '(unknown)';
        console.log(`   \x1b[32m${abbr.abbreviation}\x1b[0m → ${expansion} (${abbr.frequency}x)`);
        
        if (abbr.examples.length > 0) {
          const example = abbr.examples[0];
          console.log(`      Example: "${example.pointName}" - "${example.description}"`);
        }
      }
    }
    
    if (result.suggestedDictionaryAdditions.length > 0) {
      console.log('\x1b[35m[ABBREVIATION ANALYSIS]\x1b[0m Suggested Dictionary Additions:');
      for (const addition of result.suggestedDictionaryAdditions.slice(0, 3)) {
        console.log(`   { acronym: '${addition.acronym}', expansion: '${addition.expansion}', category: '${addition.category}', priority: ${addition.priority} }`);
      }
    }
  }
  
  /**
   * Get summary string for processing logs
   */
  static getAnalysisSummary(result: AnalysisResult): string {
    return `Found ${result.newAbbreviationsDiscovered} new abbreviations in ${result.totalFilesAnalyzed} files (${result.totalPointsProcessed} points)`;
  }
}