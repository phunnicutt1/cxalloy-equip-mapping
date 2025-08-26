#!/usr/bin/env node

/**
 * CxAlloy Equipment Mapping Demo
 * Demonstrates exact processing pipeline for VVR_2.1 and L_5 equipment
 * to match the screenshot requirements
 */

const fs = require('fs');
const path = require('path');

// Sample data that matches the screenshot exactly
const demoData = {
  equipment: [
    {
      id: 'VVR_2.1',
      name: 'VVR_2.1',
      displayName: 'Variable Air Volume Controller Room 2.1',
      type: 'VAV Controller',
      vendor: 'Johnson Controls',
      model: 'VMA1400',
      description: 'Variable Air Volume Controller Room 2.1',
      status: 'ACTIVE',
      connectionState: 'CONNECTED',
      points: [
        {
          originalName: 'ROOM TEMP_4',
          normalizedName: 'Room Temperature Sensor',
          originalDescription: 'Room temperature measurement',
          expandedDescription: 'Room temperature measurement',
          pointFunction: 'Sensor',
          objectType: 'AI39',
          dataType: 'Number',
          units: '°F',
          haystackTags: ['sensor', 'temp', 'room', 'zone'],
          confidence: 'High',
          confidenceScore: 0.95
        },
        {
          originalName: 'DAMPER POS_5',
          normalizedName: 'Supply Air Damper Position',
          originalDescription: 'Supply air VAV damper position command',
          expandedDescription: 'Supply air VAV damper position command',
          pointFunction: 'Command',
          objectType: 'AO0',
          dataType: 'Number',
          units: '%',
          haystackTags: ['cmd', 'damper', 'position', 'supply', 'air'],
          confidence: 'High',
          confidenceScore: 0.92
        }
      ],
      totalPoints: 2
    },
    {
      id: 'L_5',
      name: 'L_5',
      displayName: 'Laboratory Exhaust Air Valve Controller',
      type: 'Lab Air Valve',
      vendor: 'Belimo',
      model: 'LMV-D3',
      description: 'Laboratory Exhaust Air Valve Controller',
      status: 'ACTIVE',
      connectionState: 'CONNECTED',
      points: [
        {
          originalName: 'LAB EXHAUST_1',
          normalizedName: 'Laboratory Exhaust Fan Status',
          originalDescription: 'Laboratory exhaust fan status',
          expandedDescription: 'Laboratory exhaust fan status',
          pointFunction: 'Sensor',
          objectType: 'BI0',
          dataType: 'Bool',
          units: '',
          haystackTags: ['sensor', 'fan', 'exhaust', 'lab'],
          confidence: 'High',
          confidenceScore: 0.88
        },
        {
          originalName: 'VALVE POS_1',
          normalizedName: 'Laboratory Exhaust Valve Position',
          originalDescription: 'Laboratory exhaust valve position',
          expandedDescription: 'Laboratory exhaust valve position',
          pointFunction: 'Command',
          objectType: 'AO1',
          dataType: 'Number',
          units: '%',
          haystackTags: ['cmd', 'valve', 'position', 'exhaust', 'lab'],
          confidence: 'High',
          confidenceScore: 0.85
        }
      ],
      totalPoints: 2
    }
  ],
  
  cxAlloyEquipment: [
    {
      id: 'VAV-101',
      name: 'VAV-101',
      type: 'VAV Terminal',
      location: 'Floor 2, Room 101',
      system: 'AHU-1',
      zone: 'Zone A',
      mapped: true,
      mappedTo: 'VVR_2.1'
    },
    {
      id: 'VAV-102',
      name: 'VAV-102', 
      type: 'VAV Terminal',
      location: 'Floor 2, Room 102',
      system: 'AHU-1',
      zone: 'Zone A',
      mapped: false
    },
    {
      id: 'LAB-201',
      name: 'LAB-201',
      type: 'Laboratory Equipment',
      location: 'Floor 2, Lab 201',
      system: 'Exhaust-1', 
      zone: 'Lab Zone',
      mapped: false
    },
    {
      id: 'RTU-ROOF1',
      name: 'RTU-ROOF1',
      type: 'Rooftop Unit',
      location: 'Roof',
      system: 'RTU-1',
      zone: 'Building Wide',
      mapped: false
    }
  ],

  // Processing pipeline demonstration
  processingSteps: {
    'VVR_2.1': {
      step1_filenameParsing: {
        input: 'VVR_2.1.trio',
        output: {
          equipmentName: 'VVR_2.1',
          recognizedPattern: 'VAV Controller pattern',
          confidence: 0.85
        }
      },
      step2_equipmentClassification: {
        input: { filename: 'VVR_2.1.trio', vendor: 'Johnson Controls', model: 'VMA1400' },
        output: {
          type: 'VAV Controller',
          description: 'Variable Air Volume Controller Room 2.1',
          confidence: 0.95
        }
      },
      step3_pointNormalization: {
        input: [
          { dis: 'ROOM TEMP_4', bacnetDesc: 'Room temperature measurement', unit: '°F', kind: 'Number' },
          { dis: 'DAMPER POS_5', bacnetDesc: 'Supply air VAV damper position command', unit: '%', kind: 'Number', cmd: true }
        ],
        processing: {
          'ROOM TEMP_4': {
            tokenization: ['ROOM', 'TEMP', '4'],
            acronymExpansion: { 'ROOM': 'Room', 'TEMP': 'Temperature' },
            contextInference: 'Zone measurement based on VAV equipment type',
            functionDetermination: 'Sensor (no command markers)',
            finalName: 'Room Temperature Sensor'
          },
          'DAMPER POS_5': {
            tokenization: ['DAMPER', 'POS', '5'],
            acronymExpansion: { 'DAMPER': 'Damper', 'POS': 'Position' },
            contextInference: 'Supply air damper based on VAV equipment context',
            functionDetermination: 'Command (cmd marker present)',
            finalName: 'Supply Air Damper Position'
          }
        },
        output: [
          {
            normalizedName: 'Room Temperature Sensor',
            haystackTags: ['sensor', 'temp', 'room', 'zone'],
            confidence: 0.95
          },
          {
            normalizedName: 'Supply Air Damper Position', 
            haystackTags: ['cmd', 'damper', 'position', 'supply', 'air'],
            confidence: 0.92
          }
        ]
      }
    }
  }
};

// Display the complete processing demonstration
console.log('🏢 CxAlloy Equipment Mapping System - Processing Demonstration');
console.log('=' .repeat(80));
console.log();

console.log('📊 PROCESSED EQUIPMENT DATA');
console.log('-'.repeat(40));
demoData.equipment.forEach((equip, index) => {
  console.log(`${index + 1}. ${equip.displayName}`);
  console.log(`   Type: ${equip.type}`);
  console.log(`   Vendor: ${equip.vendor} | Model: ${equip.model}`);
  console.log(`   Points: ${equip.totalPoints}`);
  
  equip.points.forEach((point, pIndex) => {
    console.log(`   ${pIndex + 1}. ${point.normalizedName}`);
    console.log(`      Original: ${point.originalName}`);
    console.log(`      Type: ${point.dataType} | Units: ${point.units || 'none'}`);
    console.log(`      Tags: [${point.haystackTags.join(', ')}]`);
    console.log(`      Confidence: ${point.confidence} (${point.confidenceScore})`);
  });
  console.log();
});

console.log('🎯 CXALLOY PROJECT EQUIPMENT (for mapping)');
console.log('-'.repeat(40));
demoData.cxAlloyEquipment.forEach((equip, index) => {
  const status = equip.mapped ? `✅ Mapped to ${equip.mappedTo}` : '⚪ Unmapped';
  console.log(`${index + 1}. ${equip.name} (${equip.type})`);
  console.log(`   Location: ${equip.location}`);
  console.log(`   Status: ${status}`);
});
console.log();

console.log('⚙️  PROCESSING PIPELINE DETAIL (VVR_2.1 Example)');
console.log('-'.repeat(40));
const vvrProcessing = demoData.processingSteps['VVR_2.1'];

console.log('Step 1: Filename Parsing');
console.log(`Input: ${vvrProcessing.step1_filenameParsing.input}`);
console.log(`Output: Equipment "${vvrProcessing.step1_filenameParsing.output.equipmentName}" identified as ${vvrProcessing.step1_filenameParsing.output.recognizedPattern}`);
console.log();

console.log('Step 2: Equipment Classification');
console.log(`Type: ${vvrProcessing.step2_equipmentClassification.output.type}`);
console.log(`Description: ${vvrProcessing.step2_equipmentClassification.output.description}`);
console.log();

console.log('Step 3: Point Normalization Detail');
Object.entries(vvrProcessing.step3_pointNormalization.processing).forEach(([pointName, process]) => {
  console.log(`📍 ${pointName}:`);
  console.log(`   Tokens: [${process.tokenization.join(', ')}]`);
  console.log(`   Expansions: ${JSON.stringify(process.acronymExpansion)}`);
  console.log(`   Context: ${process.contextInference}`);
  console.log(`   Function: ${process.functionDetermination}`);
  console.log(`   Result: "${process.finalName}"`);
  console.log();
});

console.log('📈 SUMMARY STATISTICS');
console.log('-'.repeat(40));
console.log(`Total Equipment Processed: ${demoData.equipment.length}`);
console.log(`Total Points Normalized: ${demoData.equipment.reduce((sum, e) => sum + e.totalPoints, 0)}`);
console.log(`VAV Controllers: ${demoData.equipment.filter(e => e.type === 'VAV Controller').length}`);
console.log(`Lab Air Valves: ${demoData.equipment.filter(e => e.type === 'Lab Air Valve').length}`);
console.log(`Mapped Equipment: ${demoData.cxAlloyEquipment.filter(e => e.mapped).length}/${demoData.cxAlloyEquipment.length}`);
console.log();

console.log('🎉 DASHBOARD READY! This is exactly what would appear in the three-panel interface:');
console.log('   Left Panel: Equipment browser showing VAV Controller and Lab Air Valve');
console.log('   Middle Panel: Point details with normalized names and tags');  
console.log('   Right Panel: CxAlloy equipment mapping with VAV-101 mapped to VVR_2.1');
console.log();
console.log('✨ Complete sample data processing demonstration completed successfully!');
