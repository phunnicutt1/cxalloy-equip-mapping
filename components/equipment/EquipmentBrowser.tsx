'use client';

import React from 'react';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Equipment } from '../../types/equipment';
import { 
  Search, 
  ChevronDown, 
  ChevronRight,
  Package,
  Wrench,
  Lightbulb,
  Plus,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { TemplateList } from '../templates/TemplateList';
import { TemplateModal } from '../templates/TemplateModal';
import type { EquipmentTemplate } from '../../types/equipment';
import { findMappingSuggestions, shouldShowCreateNewOption, type NameMatchSuggestion } from '../../lib/utils/smart-matching';

interface EquipmentGroupProps {
  type: string;
  equipment: Equipment[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectEquipment: (equipment: Equipment) => void;
  selectedEquipmentId?: string;
  equipmentMappings: any[];
  cxAlloyEquipment: any[];
}

function EquipmentGroup({
  type,
  equipment,
  isExpanded,
  onToggle,
  onSelectEquipment,
  selectedEquipmentId,
  equipmentMappings,
  cxAlloyEquipment
}: EquipmentGroupProps) {
  const { addEquipmentMapping, recordEquipmentMapping } = useAppStore();

  const handleSuggestionClick = async (event: React.MouseEvent, bacnetEquipment: Equipment, suggestion: NameMatchSuggestion) => {
    event.stopPropagation(); // Prevent parent button click
    
    try {
      // Find the CxAlloy equipment
      const cxAlloyEq = cxAlloyEquipment.find(eq => eq.name === suggestion.equipmentName);
      if (!cxAlloyEq) {
        console.error('CxAlloy equipment not found:', suggestion.equipmentName);
        return;
      }

      // Create the equipment mapping
      const mapping = {
        id: `auto-${bacnetEquipment.id}-${cxAlloyEq.id}`,
        bacnetEquipmentId: bacnetEquipment.id,
        bacnetEquipmentName: bacnetEquipment.name,
        bacnetEquipmentType: bacnetEquipment.type || 'Unknown',
        cxalloyEquipmentId: cxAlloyEq.id,
        cxalloyEquipmentName: cxAlloyEq.name,
        cxalloyCategory: cxAlloyEq.type as any,
        mappingType: 'manual' as const,
        confidence: suggestion.confidence,
        mappingReason: (suggestion.reasons || []).join('; '),
        totalBacnetPoints: bacnetEquipment.totalPoints || 0,
        mappedPointsCount: 0,
        unmappedPointsCount: 0,
        isActive: true,
        isVerified: true,
        verifiedBy: 'user-suggestion-click',
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'suggestion-auto-mapping',
        mappingMethod: 'manual' as const
      };

      // Add the mapping to the store
      addEquipmentMapping(mapping);

      // Record audit trail
      await recordEquipmentMapping(
        bacnetEquipment.id,
        bacnetEquipment.name,
        cxAlloyEq.id,
        cxAlloyEq.name,
        'created',
        'manual',
        suggestion.confidence,
        bacnetEquipment.totalPoints || 0
      );

      console.log('Auto-mapped equipment:', bacnetEquipment.name, '→', cxAlloyEq.name);
    } catch (error) {
      console.error('Failed to create auto-mapping:', error);
    }
  };
  return (
    <div className="border border-border rounded-lg bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Package className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{type}</span>
        </div>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
          {equipment.length}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border">
          {equipment.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectEquipment(item)}
              className={cn(
                "w-full text-left p-3 hover:bg-muted/50 transition-all duration-200 border-b border-border last:border-b-0 last:rounded-b-lg relative",
                selectedEquipmentId === item.id && !equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && "bg-blue-50 ring-2 ring-blue-500 ring-offset-1",
                equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && selectedEquipmentId === item.id && "bg-green-50/70 ring-2 ring-green-500 ring-offset-1",
                equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && selectedEquipmentId !== item.id && "bg-green-50/50 ring-1 ring-green-400"
              )}
            >
              {/* MAPPED Badge */}
              {equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && (
                <div className="absolute top-2 right-2">
                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">MAPPED</span>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-base text-foreground">{item.name}</div>
                    {equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
                {item.type && (
                  <div className="text-xs text-muted-foreground">
                    {item.type === 'VAV_CONTROLLER' ? 'VVR' : item.type.replace(/_/g, ' ')}
                  </div>
                )}
                {item.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs">
                  {(item.totalPoints !== undefined && item.totalPoints > 0) && (
                    <div>
                      <span className="font-semibold text-foreground">{item.totalPoints} points</span>
                    </div>
                  )}
                  {equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && (
                    <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] tracking-wider">
                      ONLINE
                    </div>
                  )}
                  {item.vendor && (
                    <span className="text-muted-foreground">{item.vendor}</span>
                  )}
                </div>
                
                {/* Smart suggestions for unmapped equipment */}
                {(() => {
                  const isMapped = equipmentMappings.some(m => m.bacnetEquipmentId === item.id);
                  if (isMapped) return null;
                  
                  const suggestions = findMappingSuggestions(item.name, item.type, cxAlloyEquipment);
                  if (suggestions.length === 0) return null;
                  
                  const topSuggestion = suggestions[0];
                  if (topSuggestion.confidence < 0.6) return null;
                  
                  return (
                    <div
                      onClick={(e) => handleSuggestionClick(e, item, topSuggestion)}
                      className="mt-2 w-full p-2 bg-blue-50 rounded-md border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">
                        <Lightbulb className="h-3 w-3" />
                        <span className="font-medium">Click to Map</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-blue-600 font-medium">{topSuggestion.equipmentName}</span>
                          <span className="text-blue-500">({Math.round(topSuggestion.confidence * 100)}%)</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-blue-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      {suggestions.length > 1 && (
                        <div className="text-xs text-blue-600 mt-1">
                          +{suggestions.length - 1} more suggestions
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EquipmentBrowser() {
  const {
    viewMode,
    searchTerm,
    selectedEquipment,
    cxAlloyEquipment,
    equipmentMappings,
    setViewMode,
    setSearchTerm,
    setSelectedEquipment,
    getEquipmentByType,
    getFilteredEquipment,
    fetchEquipmentTemplates,
    getSelectedTemplate
  } = useAppStore();

  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [templateModal, setTemplateModal] = React.useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    template?: EquipmentTemplate | null;
  }>({
    isOpen: false,
    mode: 'create',
    template: null
  });

  // Load templates when switching to template mode
  React.useEffect(() => {
    if (viewMode.left === 'templates') {
      fetchEquipmentTemplates();
    }
  }, [viewMode.left, fetchEquipmentTemplates]);

  const equipmentByType = getEquipmentByType();
  const filteredEquipment = getFilteredEquipment();

  const toggleGroup = (type: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  // Auto-expand groups with filtered results
  React.useEffect(() => {
    if (searchTerm) {
      const typesWithResults = new Set<string>();
      filteredEquipment.forEach(eq => {
        if (eq.type) typesWithResults.add(eq.type);
      });
      setExpandedGroups(typesWithResults);
    }
  }, [searchTerm, filteredEquipment]);

  const handleSelectEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
  };

  const handleCreateTemplate = () => {
    setTemplateModal({
      isOpen: true,
      mode: 'create',
      template: null
    });
  };

  const handleEditTemplate = (template: EquipmentTemplate) => {
    setTemplateModal({
      isOpen: true,
      mode: 'edit',
      template
    });
  };

  const handleCloseTemplateModal = () => {
    setTemplateModal({
      isOpen: false,
      mode: 'create',
      template: null
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            {viewMode.left === 'equipment' ? 'Data Sources' : 'Templates'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('left', viewMode.left === 'equipment' ? 'templates' : 'equipment')}
            className="text-muted-foreground hover:text-foreground"
          >
            {viewMode.left === 'equipment' ? (
              <Wrench className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">
          {viewMode.left === 'equipment' 
            ? 'Browse detected equipment' 
            : 'Manage point templates'
          }
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={viewMode.left === 'equipment' ? 'Search equipment...' : 'Search templates...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode.left === 'equipment' ? (
          <div className="space-y-3">
            {Object.entries(equipmentByType).length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No equipment detected</p>
                <p className="text-sm text-muted-foreground">Upload trio files to get started</p>
              </div>
            ) : (
              Object.entries(equipmentByType).map(([type, equipment]) => {
                const filteredForType = searchTerm 
                  ? equipment.filter(eq => 
                      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      eq.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  : equipment;

                if (searchTerm && filteredForType.length === 0) return null;

                return (
                  <EquipmentGroup
                    key={type}
                    type={type}
                    equipment={filteredForType}
                    isExpanded={expandedGroups.has(type)}
                    onToggle={() => toggleGroup(type)}
                    onSelectEquipment={handleSelectEquipment}
                    selectedEquipmentId={selectedEquipment?.id}
                    equipmentMappings={equipmentMappings}
                    cxAlloyEquipment={cxAlloyEquipment}
                  />
                );
              })
            )}
          </div>
        ) : (
          <TemplateList 
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={handleEditTemplate}
          />
        )}
      </div>

      {/* Footer Stats */}
      {viewMode.left === 'equipment' && Object.keys(equipmentByType).length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Equipment Types</span>
              <span>{Object.keys(equipmentByType).length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Equipment</span>
              <span>{Object.values(equipmentByType).flat().length}</span>
            </div>
            {searchTerm && (
              <div className="flex justify-between text-primary">
                <span>Filtered Results</span>
                <span>{filteredEquipment.length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Modal */}
      <TemplateModal
        isOpen={templateModal.isOpen}
        onClose={handleCloseTemplateModal}
        template={templateModal.template}
        mode={templateModal.mode}
      />
    </div>
  );
} 