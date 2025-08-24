'use client';

import React, { useState } from 'react';
import { X, Check, AlertTriangle, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { AutoMappingResult, EquipmentMapping } from '../../types/auto-mapping';

interface AutoMappingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AutoMappingResult | null;
  onApplyMapping: (mapping: EquipmentMapping) => Promise<void>;
  onApplyAllExact: () => Promise<void>;
  onApplySelectedSuggestions: (mappings: EquipmentMapping[]) => Promise<void>;
  onManualMap?: (equipment: any) => void;
  onCreateCxAlloyEquipment?: (bacnetEquipment: any) => void;
}

const AutoMappingResultsModal: React.FC<AutoMappingResultsModalProps> = ({
  isOpen,
  onClose,
  results,
  onApplyMapping,
  onApplyAllExact,
  onApplySelectedSuggestions,
  onManualMap,
  onCreateCxAlloyEquipment
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [appliedMappings, setAppliedMappings] = useState<Set<string>>(new Set());
  const [applyingMappings, setApplyingMappings] = useState<Set<string>>(new Set());
  const [bulkApplying, setBulkApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    exact: true,
    suggested: true,
    unmatchedBacnet: false,
    unmatchedCxAlloy: false
  });

  if (!isOpen || !results) return null;

  const { exactMappings = [], suggestedMappings = [], unmatchedBacnet = [], unmatchedCxAlloy = [], stats } = results;

  const toggleSuggestionSelection = (mappingId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(mappingId)) {
      newSelected.delete(mappingId);
    } else {
      newSelected.add(mappingId);
    }
    setSelectedSuggestions(newSelected);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleApplySelectedSuggestions = async () => {
    const selectedMappings = suggestedMappings.filter(mapping => 
      selectedSuggestions.has(mapping.id)
    );
    
    setBulkApplying(true);
    try {
      await onApplySelectedSuggestions(selectedMappings);
      
      // Mark as applied
      const newApplied = new Set(appliedMappings);
      selectedMappings.forEach(m => newApplied.add(m.id));
      setAppliedMappings(newApplied);
      
      // Clear selection
      setSelectedSuggestions(new Set());
      
      // Show success message
      setSuccessMessage(`Successfully applied ${selectedMappings.length} suggested mappings`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to apply selected suggestions:', error);
    } finally {
      setBulkApplying(false);
    }
  };

  const handleApplyAllExact = async () => {
    setBulkApplying(true);
    try {
      await onApplyAllExact();
      
      // Mark all exact mappings as applied
      const newApplied = new Set(appliedMappings);
      exactMappings.forEach(m => newApplied.add(m.id));
      setAppliedMappings(newApplied);
      
      // Show success message
      setSuccessMessage(`Successfully applied ${exactMappings.length} exact mappings`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to apply exact mappings:', error);
    } finally {
      setBulkApplying(false);
    }
  };

  const handleApplySingleMapping = async (mapping: EquipmentMapping) => {
    // Set this mapping as applying
    setApplyingMappings(prev => new Set(prev).add(mapping.id));
    
    try {
      await onApplyMapping(mapping);
      
      // Mark as applied
      setAppliedMappings(prev => new Set(prev).add(mapping.id));
      
      // Show success message
      setSuccessMessage(`Successfully applied mapping: ${mapping.bacnetEquipmentName} → ${mapping.cxalloyEquipmentName}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to apply mapping:', error);
    } finally {
      // Remove from applying set
      setApplyingMappings(prev => {
        const newSet = new Set(prev);
        newSet.delete(mapping.id);
        return newSet;
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const SectionHeader = ({ 
    title, 
    count, 
    section, 
    icon 
  }: { 
    title: string; 
    count: number; 
    section: keyof typeof expandedSections;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
        <span className="px-2 py-1 bg-gray-200 rounded-full text-sm font-medium">
          {count}
        </span>
      </div>
      {expandedSections[section] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden relative">
        {/* Success Message Toast */}
        {successMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 animate-in slide-in-from-top">
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Check size={20} />
              <span>{successMessage}</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Auto-Mapping Results</h2>
            <p className="text-gray-600 mt-1">
              Processed {stats?.totalBacnet || 0} BACnet equipment and {stats?.totalCxAlloy || 0} CxAlloy equipment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{exactMappings.length}</div>
              <div className="text-sm text-gray-600">Exact Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{suggestedMappings.length}</div>
              <div className="text-sm text-gray-600">Suggested Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{unmatchedBacnet.length}</div>
              <div className="text-sm text-gray-600">Unmatched BACnet</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{unmatchedCxAlloy.length}</div>
              <div className="text-sm text-gray-600">Unmatched CxAlloy</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Exact Mappings */}
          <div>
            <SectionHeader
              title="Exact Matches"
              count={exactMappings.length}
              section="exact"
              icon={<Check className="text-green-600" size={16} />}
            />
            
            {expandedSections.exact && exactMappings.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">
                    These mappings have high confidence and can be applied automatically.
                  </p>
                  <button
                    onClick={handleApplyAllExact}
                    disabled={bulkApplying || exactMappings.every(m => appliedMappings.has(m.id))}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {bulkApplying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Applying...
                      </>
                    ) : exactMappings.every(m => appliedMappings.has(m.id)) ? (
                      <>
                        <Check size={16} />
                        All Applied
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Apply All Exact Matches
                      </>
                    )}
                  </button>
                </div>
                
                {exactMappings.map((mapping) => (
                  <div key={mapping.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                    appliedMappings.has(mapping.id) ? 'bg-green-50 border-green-300' : ''
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <div className="font-medium">{mapping.bacnetEquipmentName}</div>
                        <div className="text-gray-500">{mapping.bacnetEquipmentType}</div>
                      </div>
                      <ArrowRight className="text-gray-400" size={16} />
                      <div className="text-sm">
                        <div className="font-medium">{mapping.cxalloyEquipmentName}</div>
                        <div className="text-gray-500">{mapping.cxalloyCategory}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(mapping.confidence)}`}>
                        {Math.round(mapping.confidence * 100)}%
                      </span>
                      <button
                        onClick={() => handleApplySingleMapping(mapping)}
                        disabled={appliedMappings.has(mapping.id) || applyingMappings.has(mapping.id)}
                        className={`px-3 py-1 rounded transition-colors text-sm ${
                          appliedMappings.has(mapping.id)
                            ? 'bg-green-600 text-white cursor-default'
                            : applyingMappings.has(mapping.id)
                            ? 'bg-gray-300 text-gray-600 cursor-wait'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {appliedMappings.has(mapping.id) ? 'Applied' : applyingMappings.has(mapping.id) ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Mappings */}
          <div>
            <SectionHeader
              title="Suggested Matches"
              count={suggestedMappings.length}
              section="suggested"
              icon={<AlertTriangle className="text-yellow-600" size={16} />}
            />
            
            {expandedSections.suggested && suggestedMappings.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">
                    Review these suggestions before applying. Select the ones you want to apply.
                  </p>
                  <button
                    onClick={handleApplySelectedSuggestions}
                    disabled={selectedSuggestions.size === 0 || bulkApplying}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {bulkApplying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Apply Selected ({selectedSuggestions.size})
                      </>
                    )}
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {suggestedMappings.map((mapping) => (
                  <div key={mapping.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                    appliedMappings.has(mapping.id) ? 'bg-green-50 border-green-300' : ''
                  }`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.has(mapping.id)}
                        onChange={() => toggleSuggestionSelection(mapping.id)}
                        disabled={appliedMappings.has(mapping.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="text-sm">
                        <div className="font-medium">{mapping.bacnetEquipmentName}</div>
                        <div className="text-gray-500">{mapping.bacnetEquipmentType}</div>
                      </div>
                      <ArrowRight className="text-gray-400" size={16} />
                      <div className="text-sm">
                        <div className="font-medium">{mapping.cxalloyEquipmentName}</div>
                        <div className="text-gray-500">{mapping.cxalloyCategory}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(mapping.confidence)}`}>
                        {Math.round(mapping.confidence * 100)}%
                      </span>
                      <div className="text-xs text-gray-500 max-w-40 truncate">
                        {mapping.mappingReason}
                      </div>
                      <button
                        onClick={() => handleApplySingleMapping(mapping)}
                        disabled={appliedMappings.has(mapping.id) || applyingMappings.has(mapping.id)}
                        className={`px-3 py-1 rounded transition-colors text-sm ${
                          appliedMappings.has(mapping.id)
                            ? 'bg-green-600 text-white cursor-default'
                            : applyingMappings.has(mapping.id)
                            ? 'bg-gray-300 text-gray-600 cursor-wait'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {appliedMappings.has(mapping.id) ? 'Applied' : applyingMappings.has(mapping.id) ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unmatched BACnet Equipment */}
          <div>
            <SectionHeader
              title="Unmatched BACnet Equipment"
              count={unmatchedBacnet.length}
              section="unmatchedBacnet"
              icon={<div className="w-4 h-4 bg-red-200 rounded" />}
            />
            
            {expandedSections.unmatchedBacnet && unmatchedBacnet.length > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {unmatchedBacnet.map((equipment) => (
                  <div key={equipment.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div className="text-sm">
                      <div className="font-medium">{equipment.name}</div>
                      <div className="text-gray-500">{equipment.type} • {equipment.totalPoints} points</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onManualMap?.(equipment)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                      >
                        Manual Map
                      </button>
                      <button 
                        onClick={() => onCreateCxAlloyEquipment?.(equipment)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                      >
                        Create New
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unmatched CxAlloy Equipment */}
          <div>
            <SectionHeader
              title="Unmatched CxAlloy Equipment"
              count={unmatchedCxAlloy.length}
              section="unmatchedCxAlloy"
              icon={<div className="w-4 h-4 bg-gray-200 rounded" />}
            />
            
            {expandedSections.unmatchedCxAlloy && unmatchedCxAlloy.length > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {unmatchedCxAlloy.map((equipment) => (
                  <div key={equipment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="text-sm">
                      <div className="font-medium">{equipment.name}</div>
                      <div className="text-gray-500">{equipment.type} • Space: {equipment.space}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Processing completed in {stats?.processingTimeMs || 0}ms
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoMappingResultsModal;