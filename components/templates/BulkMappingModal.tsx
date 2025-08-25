'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, MapPin, CheckCircle, AlertTriangle, Play, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { BulkMappingPair, TemplateMatchingOptions } from '../../types/template-mapping';
import { UnifiedTemplate } from '../../types/unified-template';
import { Equipment, CxAlloyEquipment } from '../../types/equipment';
import { UnifiedTemplateService } from '../../lib/services/unified-template-service';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';

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
  
  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [suggestedPairs, setSuggestedPairs] = useState<BulkMappingPair[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [selectedTargetEquipment, setSelectedTargetEquipment] = useState<Set<string>>(new Set());
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('all');
  const [matchingOptions, setMatchingOptions] = useState<TemplateMatchingOptions>({
    matchingFacet: 'bacnetDis',
    confidenceThreshold: 0.4, // Lowered from 0.7 to 0.4 for more permissive matching
    allowPartialMatches: true,
    copyNavName: true,
    copyUnits: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'template' | 'pairs' | 'options' | 'results'>('template');
  const [results, setResults] = useState<any[]>([]);

  // Get unmapped equipment
  const mappedDataSourceIds = new Set(equipmentMappings.map(m => m.bacnetEquipmentId));
  const mappedCxAlloyIds = new Set(equipmentMappings.map(m => m.cxalloyEquipmentId).filter(id => id !== undefined));
  
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
      setSelectedTargetEquipment(new Set());
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      console.log('[BulkMappingModal] Loading templates...');
      const loadedTemplates = await UnifiedTemplateService.getTemplates();
      // Show all templates - equipment templates can also be used for bulk mapping
      console.log('[BulkMappingModal] Loaded templates:', loadedTemplates);
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('[BulkMappingModal] Error loading templates:', error);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      // Auto-filter by template equipment type if available
      if (template?.equipmentType && template.equipmentType !== 'Unknown') {
        setSelectedEquipmentType(template.equipmentType);
      } else {
        setSelectedEquipmentType('all');
      }
      setCurrentStep('pairs');
    }
  };

  const generatePairings = () => {
    const filteredDataSources = getFilteredDataSources();
    const filteredCxAlloyEquipment = getFilteredCxAlloyEquipment();
    
    const pairs = UnifiedTemplateService.suggestBulkPairings(
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
    if (!selectedTemplateId || selectedTargetEquipment.size === 0) return;
    
    setIsProcessing(true);
    setCurrentStep('results');
    
    try {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) throw new Error('Template not found');

      const results = [];
      
      console.log('[BulkMappingModal] Applying template:', template.name, 'to', selectedTargetEquipment.size, 'equipment');

      // Apply the template to each target equipment
      const targetEquipmentIds = Array.from(selectedTargetEquipment);
      for (const targetId of targetEquipmentIds) {
        const targetEquipment = getFilteredDataSources().find(eq => eq.id === targetId);
        if (!targetEquipment) {
          console.warn('[BulkMappingModal] Target equipment not found:', targetId);
          continue;
        }

        try {
          console.log('[BulkMappingModal] Processing target equipment:', targetEquipment.name);
          
          // Fetch target equipment points
          const targetResponse = await fetch(`/api/equipment/${targetEquipment.id}`);
          const targetData = await targetResponse.json();
          
          if (!targetData.success || !targetData.points) {
            console.warn('[BulkMappingModal] Failed to fetch points for target equipment:', targetEquipment.name);
            results.push({
              pair: {
                id: `bulk-${targetId}`,
                sourceDataSourceId: template.id,
                sourceDataSourceName: template.name,
                targetCxAlloyId: parseInt(targetId),
                targetCxAlloyName: targetEquipment.name,
                confidence: 0.0,
                isManual: false
              },
              error: 'Failed to fetch equipment points',
              success: false
            });
            continue;
          }

          const targetPoints = targetData.points;
          console.log('[BulkMappingModal] Target equipment', targetEquipment.name, 'has', targetPoints.length, 'points');

          // Apply the template to the target equipment
          const application = await UnifiedTemplateService.applyTemplate(
            template,
            targetEquipment,
            targetPoints,
            matchingOptions,
            'bulk-template-application'
          );
          
          console.log('[BulkMappingModal] Template application result for', targetEquipment.name, ':', {
            successful: application.isSuccessful,
            matchedPoints: application.appliedPoints?.filter(p => p.matched).length || 0,
            totalPoints: application.appliedPoints?.length || 0
          });

          results.push({
            pair: {
              id: `bulk-${targetId}`,
              sourceDataSourceId: template.id,
              sourceDataSourceName: template.name,
              targetCxAlloyId: parseInt(targetId),
              targetCxAlloyName: targetEquipment.name,
              confidence: application.matchingResults?.averageConfidence || 0.0,
              isManual: false
            },
            application,
            success: application.isSuccessful
          });

        } catch (error) {
          console.error(`Error applying template to ${targetEquipment.name}:`, error);
          results.push({
            pair: {
              id: `bulk-${targetId}`,
              sourceDataSourceId: template.id,
              sourceDataSourceName: template.name,
              targetCxAlloyId: parseInt(targetId),
              targetCxAlloyName: targetEquipment.name,
              confidence: 0.0,
              isManual: false
            },
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          });
        }
      }

      setResults(results);
      
      if (onBulkMappingComplete) {
        onBulkMappingComplete(results);
      }

    } catch (error) {
      console.error('Bulk template application error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-500 slide-in-from-bottom-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Bulk Template Application</h2>
            <p className="text-gray-600 mt-1">Apply templates to multiple unmapped data sources at once</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center p-4 bg-gray-50 border-b animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center space-x-8">
            <div className={`flex items-center transition-all duration-500 ${currentStep === 'template' ? 'text-blue-600 scale-110' : currentStep === 'pairs' || currentStep === 'options' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 hover:scale-110 ${currentStep === 'template' ? 'bg-blue-100 animate-pulse' : currentStep === 'pairs' || currentStep === 'options' || currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Select Template</span>
            </div>
            <div className={`w-16 h-0.5 transition-all duration-700 ${currentStep === 'pairs' || currentStep === 'options' || currentStep === 'results' ? 'bg-green-300 animate-in slide-in-from-left duration-500' : 'bg-gray-300'}`} />
            <div className={`flex items-center transition-all duration-500 ${currentStep === 'pairs' ? 'text-blue-600 scale-110' : currentStep === 'options' || currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 hover:scale-110 ${currentStep === 'pairs' ? 'bg-blue-100 animate-pulse' : currentStep === 'options' || currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Select Pairings</span>
            </div>
            <div className={`w-16 h-0.5 transition-all duration-700 ${currentStep === 'options' || currentStep === 'results' ? 'bg-green-300 animate-in slide-in-from-left duration-500 delay-300' : 'bg-gray-300'}`} />
            <div className={`flex items-center transition-all duration-500 ${currentStep === 'options' ? 'text-blue-600 scale-110' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 hover:scale-110 ${currentStep === 'options' ? 'bg-blue-100 animate-pulse' : currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Configure & Apply</span>
            </div>
          </div>
        </div>

        <div className="h-[600px] overflow-y-auto">
          {/* Step 1: Template Selection */}
          {currentStep === 'template' && (
            <div className="p-6 animate-in slide-in-from-right fade-in duration-500">
              <h3 className="text-lg font-medium mb-4">Select a Template to Apply</h3>
              
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 animate-in fade-in zoom-in-50 duration-700">
                    <Copy className="h-12 w-12 mx-auto mb-3 text-gray-300 animate-bounce" />
                    <p>No templates available</p>
                    <p className="text-sm">Create templates first from mapped equipment</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                          selectedTemplateId === template.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 scale-[1.02] shadow-md' : 'hover:bg-gray-50 hover:border-gray-300'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                        style={{animationDelay: `${templates.indexOf(template) * 100}ms`}}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{template.equipmentType}</span>
                          <span>{template.points.length} points</span>
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
            <div className="p-6 animate-in slide-in-from-left fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Select Equipment to Apply Template</h3>
                <Button
                  onClick={() => setCurrentStep('options')}
                  disabled={selectedTargetEquipment.size === 0}
                  className="transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                >
                  Continue ({selectedTargetEquipment.size} target{selectedTargetEquipment.size !== 1 ? 's' : ''} selected)
                </Button>
              </div>

              {/* Equipment Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Filter by Equipment Category (Optional)</label>
                <Select
                  value={selectedEquipmentType}
                  onValueChange={setSelectedEquipmentType}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment Categories ({unmappedDataSources.length + unmappedCxAlloyEquipment.length})</SelectItem>
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
                <div className="mb-4 p-3 bg-blue-50 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="text-sm font-medium text-blue-900">
                    Template: {selectedTemplate.name}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Equipment Type: {selectedTemplate.equipmentType} • {selectedTemplate.points.length} point mappings
                  </div>
                </div>
              )}

              {/* Target Equipment Selection */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Select Equipment to Apply Template To</h4>
                  
                  <div className="space-y-4">
                    {/* Select All/Deselect All Buttons */}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => {
                          if (selectedTargetEquipment.size === getFilteredDataSources().length) {
                            setSelectedTargetEquipment(new Set());
                          } else {
                            setSelectedTargetEquipment(new Set(
                              getFilteredDataSources().map(eq => eq.id)
                            ));
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        {selectedTargetEquipment.size === getFilteredDataSources().length 
                          ? 'Deselect All' 
                          : 'Select All'}
                      </Button>
                      <span className="text-sm text-gray-500">
                        {selectedTargetEquipment.size} of {getFilteredDataSources().length} selected
                      </span>
                    </div>

                    {/* Equipment List with Checkboxes */}
                    <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                      {getFilteredDataSources().map((equipment) => (
                          <div 
                            key={equipment.id} 
                            className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                              selectedTargetEquipment.has(equipment.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                            onClick={() => {
                              const newSelected = new Set(selectedTargetEquipment);
                              if (newSelected.has(equipment.id)) {
                                newSelected.delete(equipment.id);
                              } else {
                                newSelected.add(equipment.id);
                              }
                              setSelectedTargetEquipment(newSelected);
                            }}
                          >
                            <Checkbox 
                              checked={selectedTargetEquipment.has(equipment.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedTargetEquipment);
                                if (checked) {
                                  newSelected.add(equipment.id);
                                } else {
                                  newSelected.delete(equipment.id);
                                }
                                setSelectedTargetEquipment(newSelected);
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{equipment.name}</div>
                              <div className="text-xs text-gray-500">{equipment.type} • {equipment.totalPoints} points</div>
                            </div>
                            {selectedTemplate && equipment.type === selectedTemplate.equipmentType && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Match</span>
                            )}
                          </div>
                        ))
                      }
                      {getFilteredDataSources().length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No equipment available to apply template to</p>
                          <p className="text-sm mt-2">All equipment may already be mapped or filtered out</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selection Summary */}
                  {selectedTargetEquipment.size > 0 && selectedTemplate && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="text-sm font-medium text-blue-900">Template Application Summary:</div>
                      <div className="text-xs text-blue-700 mt-1">
                        Template: {selectedTemplate.name} ({selectedTemplate.equipmentType})
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        Will be applied to: {selectedTargetEquipment.size} equipment
                      </div>
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* Step 3: Configuration & Apply */}
          {currentStep === 'options' && (
            <div className="p-6 animate-in slide-in-from-right fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Configure Template Application</h3>
                <Button
                  onClick={handleApplyBulkMapping}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
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
                  <h4 className="font-medium mb-4">Template Application Plan</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {selectedTemplate && selectedTargetEquipment.size > 0 && (
                      <div className="space-y-3">
                        <div className="p-2 bg-green-50 rounded text-sm border-l-4 border-green-400">
                          <div className="font-medium text-green-800">Template:</div>
                          <div className="text-green-700">{selectedTemplate.name} ({selectedTemplate.equipmentType})</div>
                          <div className="text-green-600 text-xs mt-1">{selectedTemplate.points.length} point mappings</div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded text-sm border-l-4 border-blue-400">
                          <div className="font-medium text-blue-800">Apply Template To ({selectedTargetEquipment.size} equipment):</div>
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {Array.from(selectedTargetEquipment).map(equipmentId => {
                              const equipment = getFilteredDataSources().find(eq => eq.id === equipmentId);
                              return equipment ? (
                                <div key={equipmentId} className="text-blue-700 text-xs flex justify-between">
                                  <span>{equipment.name}</span>
                                  <span className="text-blue-500">({equipment.type})</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    {(!selectedTemplate || selectedTargetEquipment.size === 0) && (
                      <div className="p-2 bg-gray-100 rounded text-sm text-gray-500 text-center">
                        Complete equipment selection in previous step
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && (
            <div className="p-6 animate-in slide-in-from-left fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Bulk Mapping Results</h3>
                {!isProcessing && (
                  <Button onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>

              {isProcessing ? (
                <div className="text-center py-8 animate-in fade-in zoom-in-50 duration-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4 hover:animate-pulse"></div>
                  <p className="text-gray-600">Applying template to selected equipment...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-lg">Template Application Results</h4>
                    <div className="text-sm text-gray-600">
                      {results.filter(r => r.success).length > 0 ? 'Success' : 'Failed'}
                    </div>
                  </div>
                  
                  {results.length > 0 && (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {results.map((result, index) => (
                        <div 
                          key={result.pair.id} 
                          className={cn(
                            "border rounded-lg p-4 transition-all duration-300",
                            result.success 
                              ? "border-green-200 bg-green-50" 
                              : "border-red-200 bg-red-50"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                Template: {result.pair.sourceDataSourceName} → {result.pair.targetCxAlloyName}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Equipment Type: {result.pair.targetCxAlloyName.includes('VAV') ? 'VAV' : result.pair.targetCxAlloyName.includes('AHU') ? 'AHU' : result.pair.targetCxAlloyName.includes('RTU') ? 'RTU' : 'Other'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              )}
                              <span className={cn(
                                "text-xs font-medium px-2 py-1 rounded",
                                result.success 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-red-100 text-red-700"
                              )}>
                                {result.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                          </div>
                          
                          {result.application && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="font-medium">Total Points:</span>
                                  <span className="ml-1">{result.application.matchingResults?.totalPoints || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Matched:</span>
                                  <span className="ml-1">{result.application.matchingResults?.matchedPoints || 0}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Confidence:</span>
                                  <span className="ml-1">{Math.round((result.application.matchingResults?.averageConfidence || 0) * 100)}%</span>
                                </div>
                              </div>
                              
                              {result.success && result.application.appliedPoints && (
                                <details className="mt-2">
                                  <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                                    View {result.application.appliedPoints.filter((p: any) => p.matched).length} mapped points
                                  </summary>
                                  <div className="mt-2 space-y-1 text-xs bg-white rounded p-2 border">
                                    {result.application.appliedPoints.filter((p: any) => p.matched).slice(0, 10).map((point: any, idx: number) => (
                                      <div key={idx} className="flex justify-between">
                                        <span className="font-mono text-gray-600">{point.pointId}</span>
                                        <span className="text-gray-800">{point.navName}</span>
                                        <span className="text-gray-500">{Math.round(point.confidence * 100)}%</span>
                                      </div>
                                    ))}
                                    {result.application.appliedPoints.filter((p: any) => p.matched).length > 10 && (
                                      <div className="text-gray-500 text-center pt-1">
                                        ... and {result.application.appliedPoints.filter((p: any) => p.matched).length - 10} more points
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}
                              
                              {result.error && (
                                <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-200">
                                  <span className="font-medium">Error:</span> {result.error}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {results.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No results to display</p>
                      <p className="text-sm">Something went wrong during template application</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};