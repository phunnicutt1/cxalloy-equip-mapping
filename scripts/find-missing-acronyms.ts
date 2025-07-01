import * as fs from 'fs';
import * as path from 'path';
import { BACNET_ACRONYMS } from '../lib/dictionaries/bacnet-acronyms';

const uploadsDir = path.join(__dirname, '../../sample_point_data');
const trioFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.trio'));

const existingAcronyms = new Set(BACNET_ACRONYMS.map(a => a.acronym.toLowerCase()));
const unknownTokens = new Set<string>();

const DELIMITERS = /[\s_\-\.]+/;
function tokenizePointName(pointName: string): string[] {
  if (!pointName) return [];

  // First split on common delimiters (spaces, underscores, dashes, dots)
  let tokens = pointName.split(DELIMITERS).filter(t => t.length > 0);
  
  // Then handle camelCase within each token, but only if it looks like camelCase
  const finalTokens: string[] = [];
  for (const token of tokens) {
    if (token.length === 0) continue;
    
    // Check if token has camelCase pattern (lowercase followed by uppercase)
    const hasCamelCase = /[a-z][A-Z]/.test(token);
    
    if (hasCamelCase) {
      // Split on camelCase boundaries: insert space before uppercase letters
      const camelSplit = token.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
      finalTokens.push(...camelSplit.filter(t => t.length > 0));
    } else {
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
