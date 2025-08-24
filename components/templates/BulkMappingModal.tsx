'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, MapPin, CheckCircle, AlertTriangle, Play, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { MappingTemplate, BulkMappingPair, TemplateMatchingOptions } from '../../types/template-mapping';
import { Equipment, CxAlloyEquipment } from '../../types/equipment';
import { TemplateMappingService } from '../../lib/services/template-mapping-service';
import { useAppStore } from '../../store/app-store';

interface BulkMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkMappingComplete?: (results: any[]) => void;
}

export const BulkMappingModal: React.FC<BulkMappingModalProps> = ({
  isOpen,
  onClose,
  onBulkMappingComplete
}) => {
  const { equipment, cxAlloyEquipment, equipmentMappings, applyExactMappings } = useAppStore();
  
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [suggestedPairs, setSuggestedPairs] = useState<BulkMappingPair[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('all');
  const [matchingOptions, setMatchingOptions] = useState<TemplateMatchingOptions>({
    matchingFacet: 'bacnetDis',
    confidenceThreshold: 0.7,
    allowPartialMatches: true,
    copyNavName: true,
    copyUnits: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'template' | 'pairs' | 'options' | 'results'>('template');

  // Get unmapped equipment
  const mappedDataSourceIds = new Set(equipmentMappings.map(m => m.bacnetEquipmentId));
  const mappedCxAlloyIds = new Set(equipmentMappings.map(m => m.cxalloyEquipmentId || m.cxAlloyEquipmentId));
  
  const unmappedDataSources = equipment.filter(eq => !mappedDataSourceIds.has(eq.id));
  const unmappedCxAlloyEquipment = cxAlloyEquipment.filter(eq => !mappedCxAlloyIds.has(eq.id));

  // Get all available equipment types
  const availableDataSourceTypes = [...new Set(unmappedDataSources.map(ds => ds.type))].sort();
  const availableCxAlloyTypes = [...new Set(unmappedCxAlloyEquipment.map(cx => cx.type))].sort();
  const allAvailableTypes = [...new Set([...availableDataSourceTypes, ...availableCxAlloyTypes])].sort();

  // Filter equipment by selected type
  const getFilteredDataSources = () => {
    if (selectedEquipmentType === 'all') return unmappedDataSources;
    return unmappedDataSources.filter(ds => ds.type.toLowerCase() === selectedEquipmentType.toLowerCase());
  };

  const getFilteredCxAlloyEquipment = () => {
    if (selectedEquipmentType === 'all') return unmappedCxAlloyEquipment;
    return unmappedCxAlloyEquipment.filter(cx => cx.type.toLowerCase() === selectedEquipmentType.toLowerCase());
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setCurrentStep('template');
      setSelectedTemplateId('');
      setSuggestedPairs([]);
      setSelectedPairs(new Set());
      setSelectedEquipmentType('all');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      console.log('[BulkMappingModal] Loading templates...');
      const loadedTemplates = await TemplateMappingService.getTemplates();
      console.log('[BulkMappingModal] Loaded templates:', loadedTemplates);
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('[BulkMappingModal] Error loading templates:', error);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      // Set the equipment type filter to match the template by default, but allow user to override
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Set filter to template type if it exists in available types, otherwise keep 'all'
        if (allAvailableTypes.some(type => type.toLowerCase() === template.equipmentType.toLowerCase())) {
          setSelectedEquipmentType(template.equipmentType);
        } else {
          setSelectedEquipmentType('all');
        }
        
        generatePairings();
        setCurrentStep('pairs');
      }
    }
  };

  const generatePairings = () => {
    const filteredDataSources = getFilteredDataSources();
    const filteredCxAlloyEquipment = getFilteredCxAlloyEquipment();
    
    const pairs = TemplateMappingService.suggestBulkPairings(
      filteredDataSources,
      filteredCxAlloyEquipment
    );
    
    setSuggestedPairs(pairs);
    setSelectedPairs(new Set()); // Clear selection when regenerating pairs
  };

  // Regenerate pairings when equipment type filter changes
  useEffect(() => {
    if (currentStep === 'pairs' && selectedTemplateId) {
      generatePairings();
    }
  }, [selectedEquipmentType]);

  const handlePairToggle = (pairId: string) => {
    const newSelected = new Set(selectedPairs);
    if (newSelected.has(pairId)) {
      newSelected.delete(pairId);
    } else {
      newSelected.add(pairId);
    }
    setSelectedPairs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPairs.size === suggestedPairs.length) {
      setSelectedPairs(new Set());
    } else {
      setSelectedPairs(new Set(suggestedPairs.map(p => p.id)));
    }
  };

  const handleApplyBulkMapping = async () => {
    if (!selectedTemplateId || selectedPairs.size === 0) return;
    
    setIsProcessing(true);
    setCurrentStep('results');
    
    try {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) throw new Error('Template not found');

      const results = [];
      const selectedPairsArray = suggestedPairs.filter(p => selectedPairs.has(p.id));

      for (const pair of selectedPairsArray) {
        try {
          // Get the data source equipment with its points
          const dataSource = unmappedDataSources.find(ds => ds.id === pair.sourceDataSourceId);
          if (!dataSource) continue;

          // Apply template to this data source
          const application = await TemplateMappingService.applyTemplate(
            template,
            dataSource,
            dataSource.points || [],
            matchingOptions,
            'bulk-operation'
          );

          if (application.isSuccessful) {
            // Create the equipment mapping in the store
            await applyExactMappings([{
              id: `bulk-${pair.id}`,
              bacnetEquipmentId: dataSource.id,
              bacnetEquipmentName: dataSource.name,
              cxalloyEquipmentId: pair.targetCxAlloyId,
              cxalloyEquipmentName: pair.targetCxAlloyName,
              mappedPoints: application.appliedMappings.map(mapping => ({
                bacnetPointId: mapping.templatePointId,
                cxalloyPointName: mapping.navName,
                confidence: mapping.confidence
              })),
              confidence: application.matchingResults.averageConfidence,
              isManual: false
            }]);
          }

          results.push({
            pair,
            application,
            success: application.isSuccessful
          });

        } catch (error) {
          console.error(`Error applying template to ${pair.sourceDataSourceName}:`, error);
          results.push({
            pair,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          });
        }
      }

      if (onBulkMappingComplete) {
        onBulkMappingComplete(results);
      }

    } catch (error) {
      console.error('Bulk mapping error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Bulk Template Application</h2>
            <p className="text-gray-600 mt-1">Apply templates to multiple unmapped data sources at once</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-8">
            <div className={`flex items-center ${currentStep === 'template' ? 'text-blue-600' : currentStep === 'pairs' || currentStep === 'options' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'template' ? 'bg-blue-100' : currentStep === 'pairs' || currentStep === 'options' || currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Select Template</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep === 'pairs' || currentStep === 'options' || currentStep === 'results' ? 'bg-green-300' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${currentStep === 'pairs' ? 'text-blue-600' : currentStep === 'options' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'pairs' ? 'bg-blue-100' : currentStep === 'options' || currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Select Pairings</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep === 'options' || currentStep === 'results' ? 'bg-green-300' : 'bg-gray-300'}`} />
            <div className={`flex items-center ${currentStep === 'options' ? 'text-blue-600' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'options' ? 'bg-blue-100' : currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Configure & Apply</span>
            </div>
          </div>
        </div>

        <div className="h-[600px] overflow-y-auto">
          {/* Step 1: Template Selection */}
          {currentStep === 'template' && (
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Select a Template to Apply</h3>
              
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Copy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No templates available</p>
                    <p className="text-sm">Create templates first from mapped equipment</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplateId === template.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{template.equipmentType}</span>
                          <span>{template.pointMappings.length} points</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {Math.round(template.successRate * 100)}% success rate
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Equipment Pairings */}
          {currentStep === 'pairs' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Select Equipment Pairings</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                  >
                    {selectedPairs.size === suggestedPairs.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('options')}
                    disabled={selectedPairs.size === 0}
                  >
                    Continue ({selectedPairs.size} selected)
                  </Button>
                </div>
              </div>

              {/* Equipment Type Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Filter by Equipment Type</label>
                <Select
                  value={selectedEquipmentType}
                  onValueChange={setSelectedEquipmentType}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment Types ({unmappedDataSources.length + unmappedCxAlloyEquipment.length})</SelectItem>
                    {allAvailableTypes.map((type) => {
                      const dataSourceCount = unmappedDataSources.filter(ds => ds.type === type).length;
                      const cxAlloyCount = unmappedCxAlloyEquipment.filter(cx => cx.type === type).length;
                      return (
                        <SelectItem key={type} value={type}>
                          {type} ({dataSourceCount + cxAlloyCount})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Showing {getFilteredDataSources().length} data sources and {getFilteredCxAlloyEquipment().length} CxAlloy equipment
                </p>
              </div>

              {selectedTemplate && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">
                    Template: {selectedTemplate.name}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Equipment Type: {selectedTemplate.equipmentType} • {selectedTemplate.pointMappings.length} point mappings
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {suggestedPairs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No equipment pairings found</p>
                    <p className="text-sm">
                      {selectedEquipmentType === 'all' 
                        ? 'Try selecting a specific equipment type or ensure you have both BACnet and CxAlloy equipment available'
                        : `No unmapped equipment found for type "${selectedEquipmentType}"`
                      }
                    </p>
                  </div>
                ) : (
                  suggestedPairs.map((pair) => (
                    <div
                      key={pair.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg ${
                        selectedPairs.has(pair.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Checkbox
                        checked={selectedPairs.has(pair.id)}
                        onCheckedChange={() => handlePairToggle(pair.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{pair.sourceDataSourceName}</div>
                            <div className="text-xs text-gray-500">Data Source</div>
                          </div>
                          <div className="text-gray-400 mx-4">→</div>
                          <div>
                            <div className="font-medium text-sm">{pair.targetCxAlloyName}</div>
                            <div className="text-xs text-gray-500">CxAlloy Equipment</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((pair.confidence || 0) * 100)}% match
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Configuration & Apply */}
          {currentStep === 'options' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Configure Template Application</h3>
                <Button
                  onClick={handleApplyBulkMapping}
                  disabled={isProcessing}
                  className="flex items-center space-x-2"
                >
                  <Play size={16} />
                  <span>{isProcessing ? 'Processing...' : 'Apply Template'}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Matching Options</h4>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Match Points By</label>
                    <Select
                      value={matchingOptions.matchingFacet}
                      onValueChange={(value) => setMatchingOptions(prev => ({ 
                        ...prev, 
                        matchingFacet: value as 'bacnetCur' | 'bacnetDis' | 'bacnetDesc' 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bacnetDis">Display Name (bacnetDis)</SelectItem>
                        <SelectItem value="bacnetCur">Object Reference (bacnetCur)</SelectItem>
                        <SelectItem value="bacnetDesc">Description (bacnetDesc)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Confidence Threshold</label>
                    <Select
                      value={matchingOptions.confidenceThreshold.toString()}
                      onValueChange={(value) => setMatchingOptions(prev => ({ 
                        ...prev, 
                        confidenceThreshold: parseFloat(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.9">90% - Very High</SelectItem>
                        <SelectItem value="0.8">80% - High</SelectItem>
                        <SelectItem value="0.7">70% - Medium</SelectItem>
                        <SelectItem value="0.6">60% - Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={matchingOptions.allowPartialMatches}
                        onCheckedChange={(checked) => setMatchingOptions(prev => ({ 
                          ...prev, 
                          allowPartialMatches: !!checked 
                        }))}
                      />
                      <label className="text-sm">Allow partial matches</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={matchingOptions.copyNavName}
                        onCheckedChange={(checked) => setMatchingOptions(prev => ({ 
                          ...prev, 
                          copyNavName: !!checked 
                        }))}
                      />
                      <label className="text-sm">Copy navigation names from template</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={matchingOptions.copyUnits}
                        onCheckedChange={(checked) => setMatchingOptions(prev => ({ 
                          ...prev, 
                          copyUnits: !!checked 
                        }))}
                      />
                      <label className="text-sm">Copy units from template</label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Selected Pairings</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {suggestedPairs.filter(p => selectedPairs.has(p.id)).map((pair) => (
                      <div key={pair.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{pair.sourceDataSourceName}</div>
                        <div className="text-gray-600">→ {pair.targetCxAlloyName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Bulk Mapping Results</h3>
                {!isProcessing && (
                  <Button onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>

              {isProcessing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Applying templates to selected equipment...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Template application completed. Check the results below.
                  </div>
                  {/* Results would be displayed here when implementation is complete */}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};