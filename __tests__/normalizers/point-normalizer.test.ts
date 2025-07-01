import { PointNormalizer } from '../../lib/normalizers/point-normalizer';
import { BACnetPoint, PointDataType, BACnetObjectType, PointCategory } from '../../types/point';
import { PointFunction } from '../../types/normalized';
import { EquipmentType } from '../../types/equipment';

describe('PointNormalizer', () => {
  it('should normalize a simple room temperature sensor point correctly', () => {
    const point: BACnetPoint = {
      objectName: 'AI39',
      objectType: BACnetObjectType.ANALOG_INPUT,
      dis: 'ROOM TEMP 4',
      description: 'Room Temperature',
      units: '°F',
      dataType: PointDataType.NUMBER,
      category: PointCategory.CONTROL
    };

    const context = {
      equipmentType: EquipmentType.VAV_CONTROLLER
    };

    const result = PointNormalizer.normalizePointName(point, context);

    expect(result.success).toBe(true);
    const normalizedPoint = result.normalizedPoint;

    expect(normalizedPoint).toBeDefined();
    expect(normalizedPoint.normalizedName).toBe('Room Temperature Sensor');
    expect(normalizedPoint.pointFunction).toBe(PointFunction.Sensor);
    expect(normalizedPoint.haystackTags.some(t => t.name === 'room')).toBe(true);
    expect(normalizedPoint.haystackTags.some(t => t.name === 'temp')).toBe(true);
    expect(normalizedPoint.haystackTags.some(t => t.name === 'sensor')).toBe(true);
    expect(normalizedPoint.confidenceScore).toBeGreaterThan(0.7);
  });
});
