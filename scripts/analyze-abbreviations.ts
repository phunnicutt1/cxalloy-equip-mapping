#!/usr/bin/env node

/**
 * Abbreviation Analysis Script
 * 
 * Analyzes TRIO files to find abbreviations in original descriptions
 * that could be expanded using BACnet knowledge
 * 
 * Run with: npx tsx scripts/analyze-abbreviations.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { BACNET_ACRONYMS } from '../lib/dictionaries/bacnet-acronyms';
import chalk from 'chalk';

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

// Common BACnet abbreviations we know about
const KNOWN_BACNET_ABBREVIATIONS: Record<string, string> = {
  // Your examples
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
  'MIN': 'Minutes',
  'HR': 'Hours',
  'DAY': 'Days',
  
  // Directions/positions
  'CW': 'Clockwise',
  'CCW': 'Counterclockwise',
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
  'SEC': 'Secondary',
  'EMRG': 'Emergency',
  'MAINT': 'Maintenance',
  'TEST': 'Test',
  'SIM': 'Simulation',
  'CAL': 'Calibration',
  'CFG': 'Configuration',
  'LOG': 'Logging'
};

function parseTrioFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const records = [];
    const sections = content.split('---').filter(section => section.trim());
    
    for (const section of sections) {
      const lines = section.trim().split('\n');
      const record: any = {};
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim().replace(/^"|"$/g, '');
          record[key] = value;
        }
      }
      
      if (record.dis && record.bacnetDesc) {
        records.push({
          pointName: record.dis,
          description: record.bacnetDesc,
          file: filePath
        });
      }
    }
    
    return records;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return [];
  }
}

function extractAbbreviations(text: string): string[] {
  // Look for patterns that might be abbreviations:
  // 1. All caps words (2-5 chars)
  // 2. Mixed case words with caps in unusual places
  // 3. Words with numbers
  
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

function isInDictionary(abbreviation: string): boolean {
  return BACNET_ACRONYMS.some(entry => 
    entry.acronym.toUpperCase() === abbreviation.toUpperCase()
  );
}

function suggestExpansion(abbreviation: string): string | undefined {
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

async function analyzeAbbreviations() {
  console.log(chalk.bold.cyan('\n📋 BACnet Abbreviation Analysis\n'));
  console.log(chalk.gray('Analyzing TRIO files for abbreviations in descriptions...'));
  console.log(chalk.gray('=' .repeat(80)));
  
  const sampleDataPath = './public/sample_data';
  const abbreviationMap = new Map<string, AbbreviationAnalysis>();
  let totalFiles = 0;
  let totalPoints = 0;
  
  try {
    const files = readdirSync(sampleDataPath).filter(file => file.endsWith('.trio'));
    console.log(chalk.blue(`\nFound ${files.length} TRIO files to analyze...\n`));
    
    for (const file of files) {
      totalFiles++;
      const filePath = join(sampleDataPath, file);
      const records = parseTrioFile(filePath);
      totalPoints += records.length;
      
      console.log(`📁 ${file}: ${records.length} points`);
      
      for (const record of records) {
        const abbreviations = extractAbbreviations(record.description);
        
        for (const abbr of abbreviations) {
          if (!abbreviationMap.has(abbr)) {
            abbreviationMap.set(abbr, {
              abbreviation: abbr,
              examples: [],
              frequency: 0,
              inDictionary: isInDictionary(abbr),
              suggestedExpansion: suggestExpansion(abbr)
            });
          }
          
          const analysis = abbreviationMap.get(abbr)!;
          analysis.frequency++;
          
          if (analysis.examples.length < 3) {
            analysis.examples.push({
              file,
              pointName: record.pointName,
              description: record.description,
              context: record.description
            });
          }
        }
      }
    }
    
    // Sort by frequency
    const sortedAbbreviations = Array.from(abbreviationMap.values())
      .sort((a, b) => b.frequency - a.frequency);
    
    console.log(chalk.bold.cyan(`\n📊 Analysis Results:\n`));
    console.log(`   Files analyzed: ${totalFiles}`);
    console.log(`   Points processed: ${totalPoints}`);
    console.log(`   Unique abbreviations found: ${sortedAbbreviations.length}`);
    
    // Show missing abbreviations (not in dictionary)
    const missingAbbreviations = sortedAbbreviations.filter(a => !a.inDictionary);
    console.log(`   Missing from dictionary: ${missingAbbreviations.length}`);
    
    console.log(chalk.bold.cyan('\n🔍 Top Missing Abbreviations:\n'));
    
    const topMissing = missingAbbreviations.slice(0, 20);
    for (const abbr of topMissing) {
      const statusColor = abbr.suggestedExpansion ? chalk.green : chalk.yellow;
      const expansion = abbr.suggestedExpansion || '(unknown)';
      
      console.log(statusColor(`${abbr.abbreviation.padEnd(8)} → ${expansion.padEnd(25)} (${abbr.frequency}x)`));
      
      // Show one example
      if (abbr.examples.length > 0) {
        const example = abbr.examples[0];
        console.log(chalk.gray(`         Example: "${example.pointName}" - "${example.description}"`));
      }
      console.log();
    }
    
    console.log(chalk.bold.cyan('\n📚 Suggested Dictionary Additions:\n'));
    
    // Generate code for new dictionary entries
    for (const abbr of topMissing.filter(a => a.suggestedExpansion && a.frequency >= 2).slice(0, 15)) {
      const priority = Math.min(8, 4 + Math.floor(abbr.frequency / 3));
      const category = abbr.suggestedExpansion!.includes('Temperature') ? 'Temperature' :
                      abbr.suggestedExpansion!.includes('Pressure') ? 'Pressure' :
                      abbr.suggestedExpansion!.includes('Flow') ? 'Measurement' :
                      abbr.suggestedExpansion!.includes('Command') ? 'Control' :
                      abbr.suggestedExpansion!.includes('Status') ? 'Status' :
                      abbr.suggestedExpansion!.includes('Setpoint') ? 'Control' : 'Equipment';
      
      console.log(`  { acronym: '${abbr.abbreviation}', expansion: '${abbr.suggestedExpansion}', category: '${category}', priority: ${priority}, tags: ['${abbr.suggestedExpansion.toLowerCase().split(' ').slice(0, 2).join("', '")}'] },`);
    }
    
    console.log(chalk.gray('\n' + '=' .repeat(80)));
    console.log(chalk.bold.cyan('\n✨ Analysis complete!\n'));
    
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

// Run the analysis
analyzeAbbreviations().catch(console.error);