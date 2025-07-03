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
  Wrench
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
}

function EquipmentGroup({
  type,
  equipment,
  isExpanded,
  onToggle,
  onSelectEquipment,
  selectedEquipmentId
}: EquipmentGroupProps) {
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
                "w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 last:rounded-b-lg",
                selectedEquipmentId === item.id && "bg-primary/10 border-l-4 border-l-primary"
              )}
            >
              <div className="space-y-1">
                <div className="font-medium text-sm text-foreground">{item.name}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.points && (
                    <span>{item.points.length} points</span>
                  )}
                  {item.vendor && (
                    <>
                      <span>•</span>
                      <span>{item.vendor}</span>
                    </>
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
            {viewMode.left === 'equipment' ? 'Equipment' : 'Templates'}
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