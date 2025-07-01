import { ProcessingService } from '../../lib/services/processing-service';
import { connectorService } from '../../lib/services/connector-service';
import { EquipmentClassifier } from '../../lib/classifiers/equipment-classifier';
import * as fs from 'fs/promises';
import path from 'path';

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));
jest.mock('../../lib/services/connector-service');
jest.mock('../../lib/classifiers/equipment-classifier');
jest.mock('fs/promises');
jest.mock('../../lib/database/equipment-db-service', () => ({
  equipmentDbService: {
    clearAllData: jest.fn().mockResolvedValue(undefined),
    storeEquipmentWithPoints: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('ProcessingService', () => {
  let processingService: ProcessingService;

  beforeEach(() => {
    processingService = new ProcessingService();
    jest.clearAllMocks();
  });

  it('should enrich equipment data using ConnectorService', async () => {
    // Arrange
    const fileId = 'test-file-id';
    const filename = '7th_FL_Controller.trio';
    const equipmentName = '7th_FL_Controller';

    const mockMetadata = {
      name: '7th Floor Controller',
      description: 'Main controller for the 7th floor HVAC system',
      vendor: 'Distech Controls, Inc.',
      model: 'ECB-300',
    };

    const mockClassification = {
      equipmentName: equipmentName,
      equipmentType: 'Controller',
      confidence: 0.9,
      matchedPattern: 'controller',
      alternatives: [],
    };

    (connectorService.getEquipmentMetadata as jest.Mock).mockReturnValue(mockMetadata);
    (EquipmentClassifier.classifyFromFilename as jest.Mock).mockReturnValue(mockClassification);
    (fs.readFile as jest.Mock).mockResolvedValue('dis:SomePoint\npoint\n---\n');

    // Act
    const result = await processingService.processFile(fileId, filename);

    // Assert
    expect(connectorService.getEquipmentMetadata).toHaveBeenCalledWith(equipmentName);
    expect(result.success).toBe(true);
    expect(result.equipment).toBeDefined();
    expect(result.equipment?.name).toBe(mockMetadata.name);
    expect(result.equipment?.description).toBe(mockMetadata.description);
    expect(result.equipment?.vendor).toBe(mockMetadata.vendor);
    expect(result.equipment?.modelName).toBe(mockMetadata.model);
    expect(result.equipment?.type).toBe(mockClassification.equipmentType);
  });
}); 