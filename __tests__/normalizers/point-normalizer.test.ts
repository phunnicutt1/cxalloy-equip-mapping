/**
 * Comprehensive Tests for BACnet Point Normalization Engine
 * Tests accuracy, edge cases, and context-aware normalization
 */

import { PointNormalizer, normalizePointName, NormalizationContext } from '../../lib/normalizers/point-normalizer';
import { BACnetPoint } from '../../types/point';
import { PointFunction, NormalizationConfidence } from '../../types/normalized';

describe('PointNormalizer', () => {
  // Helper function to create mock BACnet points
  const createMockPoint = (name: string, units?: string, objectType: any = 'AI'): BACnetPoint => {
    return {
      objectName: name,
      dis: name,
      objectType,
      dataType: 'Number' as any,
      category: 'SENSOR' as any,
      description: '',
      units
    };
  };

  describe('Basic Acronym Expansion', () => {
    test('should expand common temperature acronyms', () => {
      const testCases = [
        { input: 'VAV1_ZN-T', expected: 'VAV1 Zone Temperature' },
        { input: 'ZNT_SP', expected: 'Zone Temperature Setpoint' },
        { input: 'SAT_SENSOR', expected: 'Supply Air Temperature Sensor' },
        { input: 'RAT_FB', expected: 'Return Air Temperature Feedback' },
        { input: 'OAT_VALUE', expected: 'Outside Air Temperature Value' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePointName(input);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });

    test('should expand airflow and pressure acronyms', () => {
      const testCases = [
        { input: 'SA_FLOW', expected: 'Supply Air Flow' },
        { input: 'RA_PRESS', expected: 'Return Air Pressure' },
        { input: 'DIFF_P', expected: 'Differential Pressure' },
        { input: 'ST_PR_SP', expected: 'Static Pressure Setpoint' },
        { input: 'CFM_SENSOR', expected: 'CFM Sensor' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePointName(input);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    test('should expand control and status acronyms', () => {
      const testCases = [
        { input: 'DMP_POS', expected: 'Damper Position' },
        { input: 'VLV_CMD', expected: 'Valve Command' },
        { input: 'FAN_STS', expected: 'Fan Status' },
        { input: 'PUMP_EN', expected: 'Pump Enable' },
        { input: 'ALM_STAT', expected: 'Alarm Status' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePointName(input);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });
  });

  describe('Equipment-Specific Context', () => {
    test('should use AHU-specific acronyms when equipment type is AHU', () => {
      const testCases = [
        { input: 'MAT', equipmentType: 'AHU', expected: 'Mixed Air Temperature' },
        { input: 'SASP', equipmentType: 'AHU', expected: 'Supply Air Static Pressure' },
        { input: 'OADMP', equipmentType: 'AHU', expected: 'Outside Air Damper' },
        { input: 'SF_VFD', equipmentType: 'AHU', expected: 'Supply Fan VFD' }
      ];

      testCases.forEach(({ input, equipmentType, expected }) => {
        const result = normalizePointName(input, equipmentType);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('should use VAV-specific acronyms when equipment type is VAV', () => {
      const testCases = [
        { input: 'ZT', equipmentType: 'VAV', expected: 'Zone Temperature' },
        { input: 'DAF', equipmentType: 'VAV', expected: 'Discharge Airflow' },
        { input: 'RHVLV', equipmentType: 'VAV', expected: 'Reheat Valve' },
        { input: 'MINAF', equipmentType: 'VAV', expected: 'Minimum Airflow' }
      ];

      testCases.forEach(({ input, equipmentType, expected }) => {
        const result = normalizePointName(input, equipmentType);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('should use RTU-specific acronyms when equipment type is RTU', () => {
      const testCases = [
        { input: 'COMP1', equipmentType: 'RTU', expected: 'Compressor 1' },
        { input: 'COOLSTG', equipmentType: 'RTU', expected: 'Cool Stage' },
        { input: 'ECON', equipmentType: 'RTU', expected: 'Economizer' },
        { input: 'COND', equipmentType: 'RTU', expected: 'Condenser' }
      ];

      testCases.forEach(({ input, equipmentType, expected }) => {
        const result = normalizePointName(input, equipmentType);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Vendor-Specific Context', () => {
    test('should use Johnson Controls acronyms', () => {
      const testCases = [
        { input: 'ZNT', vendor: 'Johnson Controls', expected: 'Zone Temperature' },
        { input: 'OADMPR', vendor: 'Johnson Controls', expected: 'Outside Air Damper' },
        { input: 'CLGVLV', vendor: 'Johnson Controls', expected: 'Cooling Valve' },
        { input: 'AIRFLW', vendor: 'Johnson Controls', expected: 'Air Flow' }
      ];

      testCases.forEach(({ input, vendor, expected }) => {
        const result = normalizePointName(input, undefined, vendor);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('should use Siemens acronyms', () => {
      const testCases = [
        { input: 'T_ZONE', vendor: 'Siemens', expected: 'Zone Temperature' },
        { input: 'P_STATIC', vendor: 'Siemens', expected: 'Static Pressure' },
        { input: 'F_SUPPLY', vendor: 'Siemens', expected: 'Supply Flow' },
        { input: 'V_COOLING', vendor: 'Siemens', expected: 'Cooling Valve' }
      ];

      testCases.forEach(({ input, vendor, expected }) => {
        const result = normalizePointName(input, undefined, vendor);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('should use Trane acronyms', () => {
      const testCases = [
        { input: 'ZoneTemp', vendor: 'Trane', expected: 'Zone Temperature' },
        { input: 'SupplyFlow', vendor: 'Trane', expected: 'Supply Air Flow' },
        { input: 'OutdoorDamper', vendor: 'Trane', expected: 'Outdoor Air Damper' },
        { input: 'StaticPress', vendor: 'Trane', expected: 'Static Pressure' }
      ];

      testCases.forEach(({ input, vendor, expected }) => {
        const result = normalizePointName(input, undefined, vendor);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Unit-Based Inference', () => {
    test('should infer meaning from temperature units', () => {
      const testCases = [
        { input: 'T1', units: '°F', expected: 'Temperature 1' },
        { input: 'SENSOR_T', units: 'deg', expected: 'Sensor Temperature' },
        { input: 'TMP_VAL', units: '°C', expected: 'Temperature Value' }
      ];

      testCases.forEach(({ input, units, expected }) => {
        const result = normalizePointName(input, undefined, undefined, units);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    test('should infer meaning from flow units', () => {
      const testCases = [
        { input: 'F1', units: 'CFM', expected: 'Flow 1' },
        { input: 'FLOW_VAL', units: 'GPM', expected: 'Flow Value' },
        { input: 'FL_SENSOR', units: 'LPS', expected: 'Flow Sensor' }
      ];

      testCases.forEach(({ input, units, expected }) => {
        const result = normalizePointName(input, undefined, undefined, units);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    test('should infer meaning from pressure units', () => {
      const testCases = [
        { input: 'P1', units: 'PSI', expected: 'Pressure 1' },
        { input: 'PR_VAL', units: 'InH2O', expected: 'Pressure Value' },
        { input: 'PRESS_SEN', units: 'Pa', expected: 'Pressure Sensor' }
      ];

      testCases.forEach(({ input, units, expected }) => {
        const result = normalizePointName(input, undefined, undefined, units);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });
  });

  describe('Complex Point Names', () => {
    test('should handle complex multi-token point names', () => {
      const testCases = [
        { 
          input: 'AHU1_SA_TEMP_SP', 
          equipmentType: 'AHU',
          expected: 'AHU1 Supply Air Temperature Setpoint' 
        },
        { 
          input: 'VAV_101_ZN_T_FB', 
          equipmentType: 'VAV',
          expected: 'VAV 101 Zone Temperature Feedback' 
        },
        { 
          input: 'RTU_2_COMP1_STS', 
          equipmentType: 'RTU',
          expected: 'RTU 2 Compressor 1 Status' 
        },
        { 
          input: 'CHW_PUMP_VFD_SPEED', 
          equipmentType: 'PUMP',
          expected: 'Chilled Water Pump VFD Speed' 
        }
      ];

      testCases.forEach(({ input, equipmentType, expected }) => {
        const result = normalizePointName(input, equipmentType);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    test('should handle camelCase point names', () => {
      const testCases = [
        { input: 'ZoneTemperature', expected: 'Zone Temperature' },
        { input: 'SupplyAirFlow', expected: 'Supply Air Flow' },
        { input: 'DamperPosition', expected: 'Damper Position' },
        { input: 'CompressorStatus', expected: 'Compressor Status' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePointName(input);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });

    test('should handle mixed delimiter formats', () => {
      const testCases = [
        { input: 'VAV-1_ZN.T', expected: 'VAV 1 Zone Temperature' },
        { input: 'AHU.1-SA_TEMP', expected: 'AHU 1 Supply Air Temperature' },
        { input: 'RTU_1.COMP-STS', expected: 'RTU 1 Compressor Status' },
        { input: 'PUMP.1_SPEED-FB', expected: 'Pump 1 Speed Feedback' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePointName(input);
        expect(result.normalizedName).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });
  });

  describe('Full Normalization with PointNormalizer Class', () => {
    test('should perform complete normalization with all metadata', () => {
      const point = createMockPoint('VAV1_ZN-T_SP', '°F');
      const context: NormalizationContext = {
        equipmentType: 'VAV',
        equipmentName: 'VAV-1',
        vendorName: 'Johnson Controls'
      };

      const result = PointNormalizer.normalizePointName(point, context);

      expect(result.success).toBe(true);
      expect(result.normalizedPoint).toBeDefined();
      expect(result.normalizedPoint!.normalizedName).toBe('VAV1 Zone Temperature Setpoint');
      expect(result.normalizedPoint!.pointFunction).toBe(PointFunction.TEMPERATURE_SETPOINT);
      expect(result.normalizedPoint!.confidence).toBe(NormalizationConfidence.HIGH);
      expect(result.normalizedPoint!.hasAcronymExpansion).toBe(true);
      expect(result.normalizedPoint!.hasContextInference).toBe(true);
      expect(result.expandedAcronyms.length).toBeGreaterThan(0);
    });

    test('should generate appropriate Haystack tags', () => {
      const point = createMockPoint('SA_TEMP_SENSOR', '°F');
      const context: NormalizationContext = {
        equipmentType: 'AHU'
      };

      const result = PointNormalizer.normalizePointName(point, context);

      expect(result.success).toBe(true);
      const tags = result.normalizedPoint!.haystackTags;
      
      // Should have point marker
      expect(tags.some(tag => tag.name === 'point' && tag.isMarker)).toBe(true);
      
      // Should have temperature-related tags
      expect(tags.some(tag => tag.name === 'temp')).toBe(true);
      expect(tags.some(tag => tag.name === 'sensor')).toBe(true);
    });

    test('should handle low confidence cases appropriately', () => {
      const point = createMockPoint('UNKNOWN_ABBREV_XYZ');
      const result = PointNormalizer.normalizePointName(point);

      expect(result.success).toBe(true);
      expect(result.normalizedPoint!.confidence).toBe(NormalizationConfidence.LOW);
      expect(result.normalizedPoint!.requiresManualReview).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty or null point names', () => {
      const point = createMockPoint('');
      const result = PointNormalizer.normalizePointName(point);

      expect(result.success).toBe(true);
      expect(result.normalizedPoint!.normalizedName).toBe('');
    });

    test('should handle point names with only numbers', () => {
      const result = normalizePointName('123456');
      expect(result.normalizedName).toBe('123456');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should handle point names with special characters', () => {
      const testCases = [
        { input: 'VAV#1_ZN-T', expected: 'VAV 1 Zone Temperature' },
        { input: 'AHU@2_SA_TEMP', expected: 'AHU 2 Supply Air Temperature' },
        { input: 'RTU%3_COMP_STS', expected: 'RTU 3 Compressor Status' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePointName(input);
        expect(result.normalizedName).toBe(expected);
      });
    });

    test('should handle very long point names', () => {
      const longName = 'BUILDING_1_FLOOR_2_ZONE_3_VAV_TERMINAL_UNIT_SUPPLY_AIR_TEMPERATURE_SENSOR_FEEDBACK_VALUE';
      const result = normalizePointName(longName);
      
      expect(result.normalizedName).toContain('Building');
      expect(result.normalizedName).toContain('Floor');
      expect(result.normalizedName).toContain('Zone');
      expect(result.normalizedName).toContain('VAV');
      expect(result.normalizedName).toContain('Supply Air Temperature');
      expect(result.normalizedName).toContain('Sensor');
      expect(result.normalizedName).toContain('Feedback');
    });
  });

  describe('Performance and Accuracy Requirements', () => {
    test('should achieve >90% accuracy on common BACnet patterns', () => {
      const commonPatterns = [
        'ZN-T', 'SAT', 'RAT', 'OAT', 'MAT', 'SP', 'FB', 'STS', 'CMD',
        'DMP', 'VLV', 'FAN', 'PUMP', 'COMP', 'PRESS', 'FLOW', 'CFM',
        'TEMP', 'SENSOR', 'SETPOINT', 'ALARM', 'ENABLE', 'POSITION'
      ];

      let correctNormalizations = 0;
      const totalPatterns = commonPatterns.length;

      commonPatterns.forEach(pattern => {
        const result = normalizePointName(pattern);
        // Consider it correct if confidence is high and the name changed (was expanded)
        if (result.confidence > 0.7 && result.normalizedName !== pattern) {
          correctNormalizations++;
        }
      });

      const accuracyRate = correctNormalizations / totalPatterns;
      expect(accuracyRate).toBeGreaterThan(0.9); // >90% accuracy
    });

    test('should process normalization within reasonable time', () => {
      const point = createMockPoint('COMPLEX_AHU_1_MIXED_AIR_TEMP_SENSOR_FEEDBACK');
      const context: NormalizationContext = {
        equipmentType: 'AHU',
        vendorName: 'Johnson Controls'
      };

      const startTime = Date.now();
      const result = PointNormalizer.normalizePointName(point, context);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result.processingTimeMs).toBeLessThan(50); // Internal timing should be even faster
    });
  });

  describe('Real-World Examples from Sample Data', () => {
    test('should normalize real VAV point names correctly', () => {
      const realVAVPoints = [
        'ZN-T', 'ZN-T SP', 'ZN-T SP EFF', 'AIRFLOW', 'AIRFLOW SP',
        'DAMPER', 'DAMPER POS', 'REHEAT', 'REHEAT VLV'
      ];

      realVAVPoints.forEach(pointName => {
        const result = normalizePointName(pointName, 'VAV');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.normalizedName).not.toBe(pointName); // Should be expanded
      });
    });

    test('should normalize real AHU point names correctly', () => {
      const realAHUPoints = [
        'SA TEMP', 'RA TEMP', 'OA TEMP', 'MA TEMP', 'SA FLOW',
        'RA FLOW', 'OA DAMPER', 'RA DAMPER', 'SF STATUS', 'RF STATUS'
      ];

      realAHUPoints.forEach(pointName => {
        const result = normalizePointName(pointName, 'AHU');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.normalizedName).toContain(' '); // Should be expanded with spaces
      });
    });

    test('should normalize real RTU point names correctly', () => {
      const realRTUPoints = [
        'COMP 1 STS', 'COMP 2 STS', 'COOL STG 1', 'HEAT STG 1',
        'OA DAMPER', 'SA TEMP', 'ECONOMIZER'
      ];

      realRTUPoints.forEach(pointName => {
        const result = normalizePointName(pointName, 'RTU');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.normalizedName.length).toBeGreaterThan(pointName.length); // Should be expanded
      });
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete workflow from trio parsing to normalization', () => {
    // This would typically integrate with the trio parser
    const mockTrioPoints = [
      { name: 'ZN-T', equipment: 'VAV-1', vendor: 'Johnson Controls' },
      { name: 'SA TEMP', equipment: 'AHU-1', vendor: 'Siemens' },
      { name: 'COMP STS', equipment: 'RTU-1', vendor: 'Trane' }
    ];

    mockTrioPoints.forEach(({ name, equipment, vendor }) => {
      const equipmentType = equipment.substring(0, 3);
      const result = normalizePointName(name, equipmentType, vendor);
      
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.normalizedName).not.toBe(name);
    });
  });
}); 