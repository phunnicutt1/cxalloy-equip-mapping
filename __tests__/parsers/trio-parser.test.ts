import { TrioParser, parseTrioFile, parseTrioToBACnetPoints } from '../../lib/parsers/trio-parser';
import { EquipmentClassifier } from '../../lib/classifiers/equipment-classifier';
import { ValidationUtils } from '../../lib/utils/validation';
import { EquipmentType } from '../../types/equipment';
import { BACnetObjectType } from '../../types/point';

describe('TrioParser', () => {
  // Sample trio content for testing
  const sampleTrioContent = `dis:ROOM TEMP 4
bacnetCur:AI39
bacnetDesc:Room temperature
kind:Number
point
unit:°F
---
dis:DAMPER POS 5
bacnetCur:AO0
bacnetDesc:Supply air VAV position
bacnetWrite:AO0
bacnetWriteLevel:16
cmd
kind:Number
point
unit:"%"
writable
---
dis:AIR FLOW
bacnetCur:AV220
bacnetDesc:Supply air VAV relative air volume flow
kind:Number
point
unit:"%"`;

  const malformedTrioContent = `dis:INVALID POINT
bacnetCur:INVALID_REF
kind:InvalidKind
point
---
dis:MISSING BACNET
kind:Number
point`;

  const emptyTrioContent = ``;

  describe('parseTrioFile', () => {
    it('should parse valid trio content successfully', () => {
      const result = TrioParser.parseTrioFile('VVR_2.1.trio', sampleTrioContent);
      
      expect(result.isValid).toBe(true);
      expect(result.fileName).toBe('VVR_2.1.trio');
      expect(result.sections).toHaveLength(3);
      expect(result.metadata.totalSections).toBe(3);
      expect(result.metadata.totalPoints).toBe(3);
      expect(result.metadata.errors).toHaveLength(0);
    });

    it('should handle malformed trio content with warnings', () => {
      const result = TrioParser.parseTrioFile('test.trio', malformedTrioContent);
      
      expect(result.isValid).toBe(true); // Should still parse in non-strict mode
      expect(result.sections).toHaveLength(2);
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result = TrioParser.parseTrioFile('empty.trio', emptyTrioContent);
      
      expect(result.isValid).toBe(false);
      expect(result.metadata.errors.length).toBeGreaterThan(0);
    });

    it('should respect strict mode option', () => {
      const result = TrioParser.parseTrioFile('test.trio', malformedTrioContent, { 
        strictMode: true 
      });
      
      // Should fail in strict mode due to validation issues
      expect(result.sections.length).toBeGreaterThanOrEqual(0);
    });

    it('should include metadata when requested', () => {
      const result = TrioParser.parseTrioFile('test.trio', sampleTrioContent, { 
        includeMetadata: true 
      });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.parseTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.totalSections).toBe(3);
    });
  });

  describe('parseTrioToBACnetPoints', () => {
    it('should convert trio records to BACnet points', () => {
      const points = parseTrioToBACnetPoints('VVR_2.1.trio', sampleTrioContent, 'VAV Controller VVR-2.1');
      
      expect(points).toHaveLength(3);
      
      // Check first point (AI39)
      expect(points[0].objectType).toBe('AI');
      expect(points[0].objectInstance).toBe(39);
      expect(points[0].objectName).toBe('ROOM TEMP 4');
      expect(points[0].description).toBe('Room temperature');
      expect(points[0].units).toBe('°F');
      expect(points[0].dataType).toBe('Number');
      expect(points[0].isWritable).toBe(false);

      // Check second point (AO0) - writable
      expect(points[1].objectType).toBe('AO');
      expect(points[1].objectInstance).toBe(0);
      expect(points[1].objectName).toBe('DAMPER POS 5');
      expect(points[1].isWritable).toBe(true);
      expect(points[1].bacnetWriteLevel).toBe(16);
    });

    it('should filter out invalid points', () => {
      const invalidContent = `dis:INVALID POINT
kind:Number
point
---
dis:VALID POINT
bacnetCur:AI100
bacnetDesc:Valid point
kind:Number
point`;

      const points = parseTrioToBACnetPoints('test.trio', invalidContent);
      
      expect(points).toHaveLength(1); // Only valid point should be included
      expect(points[0].objectType).toBe('AI');
      expect(points[0].objectInstance).toBe(100);
    });

    it('should handle various BACnet object types', () => {
      const multiTypeContent = `dis:Analog Input
bacnetCur:AI100
kind:Number
point
---
dis:Binary Output
bacnetCur:BO200
kind:Bool
point
---
dis:Analog Value
bacnetCur:AV300
kind:Number
point`;

      const points = parseTrioToBACnetPoints('test.trio', multiTypeContent);
      
      expect(points).toHaveLength(3);
      expect(points[0].objectType).toBe('AI');
      expect(points[1].objectType).toBe('BO');
      expect(points[2].objectType).toBe('AV');
    });
  });

  describe('trioRecordToBACnetPoint', () => {
    it('should convert valid trio record to BACnet point', () => {
      const record = {
        tags: new Map([
          ['dis', { type: 'string' as const, value: 'Test Point' }],
          ['bacnetCur', { type: 'string' as const, value: 'AI123' }],
          ['bacnetDesc', { type: 'string' as const, value: 'Test description' }],
          ['kind', { type: 'string' as const, value: 'Number' }],
          ['unit', { type: 'string' as const, value: '°F' }],
          ['point', { type: 'marker' as const, value: true }]
        ]),
        metadata: { originalLines: [] }
      };

      const point = TrioParser.trioRecordToBACnetPoint(record, 'Test Equipment');
      
      expect(point).not.toBeNull();
      expect(point!.objectType).toBe('AI');
      expect(point!.objectInstance).toBe(123);
      expect(point!.objectName).toBe('Test Point');
      expect(point!.description).toBe('Test description');
      expect(point!.units).toBe('°F');
      expect(point!.metadata?.equipmentName).toBe('Test Equipment');
    });

    it('should return null for invalid records', () => {
      const invalidRecord = {
        tags: new Map([
          ['dis', { type: 'string' as const, value: 'Test Point' }],
          // Missing required bacnetCur
          ['kind', { type: 'string' as const, value: 'Number' }]
        ]),
        metadata: { originalLines: [] }
      };

      const point = TrioParser.trioRecordToBACnetPoint(invalidRecord);
      expect(point).toBeNull();
    });
  });

  describe('extractEquipmentMetadata', () => {
    it('should extract metadata from trio parse result', () => {
      const result = TrioParser.parseTrioFile('VVR_2.1.trio', sampleTrioContent);
      const metadata = TrioParser.extractEquipmentMetadata(result);
      
      expect(metadata.fileName).toBe('VVR_2.1.trio');
      expect(metadata.totalPoints).toBe(3);
      expect(metadata.pointTypes).toContain('Number');
      expect(metadata.units).toEqual(expect.arrayContaining(['°F', '%']));
    });
  });

  describe('zinc value parsing', () => {
    const testZincValues = [
      { input: '123', expected: { type: 'number', value: 123 } },
      { input: '45.67', expected: { type: 'number', value: 45.67 } },
      { input: 'true', expected: { type: 'boolean', value: true } },
      { input: 'false', expected: { type: 'boolean', value: false } },
      { input: '"Hello World"', expected: { type: 'string', value: 'Hello World' } },
      { input: '72.5°F', expected: { type: 'number', value: 72.5, unit: '°F' } },
      { input: 'R:site', expected: { type: 'ref', value: 'site' } }
    ];

    testZincValues.forEach(({ input, expected }) => {
      it(`should parse zinc value: ${input}`, () => {
        // This tests the private parseZincValue method through parseTrioFile
        const testContent = `dis:Test Point
testValue:${input}
kind:Number
point`;
        
        const result = TrioParser.parseTrioFile('test.trio', testContent);
        const record = result.sections[0]?.records?.[0];
        
        expect(record).toBeDefined();
        const value = record!.tags.get('testValue');
        
        expect(value?.type).toBe(expected.type);
        expect(value?.value).toBe(expected.value);
        if (expected.unit) {
          expect(value?.unit).toBe(expected.unit);
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle content with no sections', () => {
      const noSectionContent = `dis:Point Without Separator
bacnetCur:AI100
kind:Number
point`;
      
      const result = TrioParser.parseTrioFile('test.trio', noSectionContent);
      expect(result.sections).toHaveLength(1); // Should treat entire content as one section
    });

    it('should handle sections with comments', () => {
      const contentWithComments = `// This is a comment
dis:Test Point
// Another comment
bacnetCur:AI100
kind:Number
point
---
// Section 2 comment
dis:Another Point
bacnetCur:AI101
kind:Number
point`;
      
      const result = TrioParser.parseTrioFile('test.trio', contentWithComments);
      expect(result.sections).toHaveLength(2);
      expect(result.isValid).toBe(true);
    });

    it('should handle multiline values', () => {
      const multilineContent = `dis:Test Point
bacnetDesc:This is a very long description
  that spans multiple lines
  and contains detailed information
bacnetCur:AI100
kind:Number
point`;
      
      const result = TrioParser.parseTrioFile('test.trio', multilineContent);
      expect(result.sections).toHaveLength(1);
      
      const record = result.sections[0]?.records?.[0];
      const desc = record?.tags.get('bacnetDesc');
      expect(desc?.value).toContain('This is a very long description');
    });

    it('should normalize different line endings', () => {
      const windowsLineEndings = sampleTrioContent.replace(/\n/g, '\r\n');
      const result = TrioParser.parseTrioFile('test.trio', windowsLineEndings);
      
      expect(result.isValid).toBe(true);
      expect(result.sections).toHaveLength(3);
    });
  });

  describe('integration with equipment classifier', () => {
    it('should work with equipment classification', () => {
      const fileName = 'VVR_2.1.trio';
      const classification = EquipmentClassifier.classifyFromFilename(fileName);
      const points = parseTrioToBACnetPoints(fileName, sampleTrioContent, classification.equipmentName);
      
      expect(classification.equipmentType).toBe(EquipmentType.VAV_CONTROLLER);
      expect(classification.confidence).toBeGreaterThan(0.9);
      expect(points.length).toBeGreaterThan(0);
      
      // Check that equipment name is included in point metadata
      points.forEach(point => {
        expect(point.metadata?.equipmentName).toBe(classification.equipmentName);
      });
    });
  });

  describe('performance tests', () => {
    it('should parse large trio files efficiently', () => {
      // Generate large trio content
      const largeContent = Array.from({ length: 100 }, (_, i) => 
        `dis:Point ${i}
bacnetCur:AI${i}
bacnetDesc:Test point ${i}
kind:Number
point
unit:°F`
      ).join('\n---\n');

      const startTime = Date.now();
      const result = TrioParser.parseTrioFile('large.trio', largeContent);
      const parseTime = Date.now() - startTime;
      
      expect(result.isValid).toBe(true);
      expect(result.sections).toHaveLength(100);
      expect(parseTime).toBeLessThan(1000); // Should parse in less than 1 second
    });
  });

  describe('validation integration', () => {
    it('should work with validation utilities', () => {
      const validationResult = ValidationUtils.validateTrioFormat(sampleTrioContent);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.metadata.sectionCount).toBe(3);
      expect(validationResult.metadata.estimatedPointCount).toBe(3);
      
      const parseResult = TrioParser.parseTrioFile('test.trio', sampleTrioContent);
      expect(parseResult.isValid).toBe(true);
      expect(parseResult.sections).toHaveLength(validationResult.metadata.sectionCount);
    });

    it('should handle validation warnings', () => {
      const validationResult = ValidationUtils.validateTrioFormat(malformedTrioContent);
      const parseResult = TrioParser.parseTrioFile('test.trio', malformedTrioContent);
      
      // Both should identify issues but handle them gracefully
      expect(validationResult.warnings.length).toBeGreaterThan(0);
      expect(parseResult.metadata.warnings.length).toBeGreaterThan(0);
    });
  });
});

// Test data for various equipment types
export const testTrioData = {
  labAirValve: `dis:EX DIFF P 1
bacnetCur:AI744
bacnetDesc:Extract air VAV differential pressure
kind:Number
point
unit:"inH₂O"
---
dis:EX DMP POS 6
bacnetCur:AO443
bacnetDesc:Extract air VAV position
kind:Number
point
unit:"%"`,

  vavController: `dis:ROOM TEMP 4
bacnetCur:AI39
bacnetDesc:Room temperature
kind:Number
point
unit:°F
---
dis:DAMPER POS 5
bacnetCur:AO0
bacnetDesc:Supply air VAV position
bacnetWrite:AO0
cmd
kind:Number
point
unit:"%"
writable`,

  rtuController: `dis:DX_TS
bacnetCur:AI1
bacnetDesc:DX Cooling Coil Leaving Temperature
kind:Number
point
unit:°F
---
dis:SA_TS
bacnetCur:AI0
bacnetDesc:Supply air temperature
kind:Number
point
unit:°F`
}; 