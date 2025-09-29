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
  Plus,
  CheckCircle2,
  X
} from 'lucide-react';
import { TemplateList } from '../templates/TemplateList';
import { TemplateModal } from '../templates/TemplateModal';
import type { EquipmentTemplate } from '../../types/equipment';

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
  const { removeEquipmentMapping } = useAppStore();
  return (
    <div className="border border-border rounded-lg bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/60 transition-colors duration-200 rounded-t-lg group hover:ring-1 hover:ring-primary/20"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
          )}
          <Package className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{type}</span>
        </div>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
          {equipment.length}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border animate-in slide-in-from-top-2 duration-500">
          {equipment.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectEquipment(item)}
              className={cn(
                "w-full text-left p-3 hover:bg-muted/60 transition-colors duration-200 border-b border-border last:border-b-0 last:rounded-b-lg relative group hover:border-l-4 hover:border-l-primary/30 hover:ring-1 hover:ring-primary/10",
                // Blue outline for currently selected mapping pair - matching CxAlloy style
                selectedEquipmentId === item.id && equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && "bg-blue-50/30 ring-2 ring-blue-600 ring-offset-2 ring-offset-white border-blue-400 animate-in fade-in scale-in-95 duration-500 shadow-lg rounded-lg p-2",
                // Standard selected state (not mapped)
                selectedEquipmentId === item.id && !equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && "bg-blue-50 ring-2 ring-blue-400 ring-offset-1 animate-in fade-in scale-in-95 duration-500",
                // Green for mapped but not selected
                equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && selectedEquipmentId !== item.id && "bg-green-50/50 ring-1 ring-green-400 animate-in fade-in duration-700"
              )}
            >
              {/* Unmap button - only visible on hover, upper left corner */}
              {equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEquipmentMapping(item.id);
                  }}
                  className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <span className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 transition-shadow duration-200 hover:shadow-md animate-in fade-in slide-in-from-top-1">
                    <X className="h-2.5 w-2.5" />
                    UNMAP
                  </span>
                </div>
              )}
              
              {/* MAPPED Badge */}
              {equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && (
                <div className="absolute top-2 right-2 animate-in fade-in slide-in-from-right-2 duration-500">
                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse hover:animate-none">MAPPED</span>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-base text-foreground">{item.name}</div>
                    {equipmentMappings.some(m => m.bacnetEquipmentId === item.id) && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 animate-in fade-in scale-in-50 duration-500" />
                    )}
                  </div>
                </div>
                {item.type && (
                  <div className="text-xs text-muted-foreground">
                    {item.type === 'VAV_CONTROLLER' ? 'VVR' : item.type.replace(/_/g, ' ')}
                  </div>
                )}
                {item.description && item.description !== item.name && (
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
  const [equipmentFilter, setEquipmentFilter] = React.useState<'all' | 'mapped' | 'unmapped'>('all');
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
            className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:bg-primary/10"
          >
            {viewMode.left === 'equipment' ? (
              <Wrench className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            ) : (
              <Package className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
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
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
          <Input
            placeholder={viewMode.left === 'equipment' ? 'Search equipment...' : 'Search templates...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 transition-all duration-300 focus:scale-[1.02] focus:shadow-md"
          />
        </div>

        {/* Compact Mapping Filter - Only for equipment mode */}
        {viewMode.left === 'equipment' && (
          <div className="mt-2 flex items-center gap-1">
            <div className="text-xs text-muted-foreground mr-1">Filter:</div>
            <button
              onClick={() => setEquipmentFilter('all')}
              className={cn(
                "px-2 py-1 text-xs rounded-full transition-all duration-200 hover:bg-blue-50",
                equipmentFilter === 'all' ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : "text-muted-foreground hover:text-blue-600"
              )}
            >
              All
            </button>
            <button
              onClick={() => setEquipmentFilter('mapped')}
              className={cn(
                "px-2 py-1 text-xs rounded-full transition-all duration-200 hover:bg-green-50",
                equipmentFilter === 'mapped' ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "text-muted-foreground hover:text-green-600"
              )}
            >
              Mapped
            </button>
            <button
              onClick={() => setEquipmentFilter('unmapped')}
              className={cn(
                "px-2 py-1 text-xs rounded-full transition-all duration-200 hover:bg-gray-50",
                equipmentFilter === 'unmapped' ? "bg-gray-100 text-gray-700 ring-1 ring-gray-300" : "text-muted-foreground hover:text-gray-600"
              )}
            >
              Unmapped
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {viewMode.left === 'equipment' ? (
          <div className="space-y-3">
            {Object.entries(equipmentByType).length === 0 ? (
              <div className="text-center py-8 animate-in fade-in zoom-in-50 duration-700">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-bounce" />
                <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">No equipment detected</p>
                <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">Upload trio files to get started</p>
              </div>
            ) : (
              Object.entries(equipmentByType).map(([type, equipment]) => {
                // Apply search filter
                let filteredForType = searchTerm 
                  ? equipment.filter(eq => 
                      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      eq.description?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  : equipment;

                // Apply mapping status filter
                if (equipmentFilter === 'mapped') {
                  filteredForType = filteredForType.filter(eq => 
                    equipmentMappings.some(m => m.bacnetEquipmentId === eq.id)
                  );
                } else if (equipmentFilter === 'unmapped') {
                  filteredForType = filteredForType.filter(eq => 
                    !equipmentMappings.some(m => m.bacnetEquipmentId === eq.id)
                  );
                }

                if (filteredForType.length === 0) return null;

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
        <div className="p-4 border-t border-border bg-muted/30 animate-in slide-in-from-bottom duration-500">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between hover:scale-105 transition-transform duration-200">
              <span>Equipment Types</span>
              <span className="font-semibold animate-in fade-in scale-in-50 duration-300">{Object.keys(equipmentByType).length}</span>
            </div>
            <div className="flex justify-between hover:scale-105 transition-transform duration-200">
              <span>Total Equipment</span>
              <span className="font-semibold animate-in fade-in scale-in-50 duration-300 delay-75">{Object.values(equipmentByType).flat().length}</span>
            </div>
            {searchTerm && (
              <div className="flex justify-between text-primary hover:scale-105 transition-transform duration-200 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <span>Filtered Results</span>
                <span className="font-semibold animate-in fade-in scale-in-50 duration-300 delay-150">{filteredEquipment.length}</span>
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