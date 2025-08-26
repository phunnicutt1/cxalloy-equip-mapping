'use client';

import React from 'react';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Link as LinkIcon, 
  CheckCircle,
  Circle,
  Building,
  Filter,
  MapPin,
  ArrowRight,
  Search,
  Save,
  Plus,
  X
} from 'lucide-react';
import { Input } from '../ui/input';
import { CxAlloyEquipment, Equipment } from '../../types/equipment';
import { UnifiedTemplateService } from '../../lib/services/unified-template-service';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';

interface CxAlloyEquipmentItemProps {
  equipment: CxAlloyEquipment;
  isMapped: boolean;
  isHighlighted?: boolean;
  mappedBacnetName?: string;
  isMappedToSelectedSource?: boolean;
  selectedSourceName?: string;
  trackedPointsCount?: number;
  onMap: () => void;
  onUnmap: () => void;
}

function CxAlloyEquipmentItem({ 
  equipment, 
  isMapped, 
  isHighlighted = false,
  mappedBacnetName,
  isMappedToSelectedSource = false,
  selectedSourceName,
  trackedPointsCount = 0,
  onMap, 
  onUnmap 
}: CxAlloyEquipmentItemProps) {
  return (
    <div className={cn(
      "border border-border rounded-lg p-2 bg-card transition-all duration-200 relative group",
      isMapped && !isMappedToSelectedSource ? "border-green-200 bg-green-50/50" : !isMapped && "hover:border-primary/50",
      isMappedToSelectedSource && "ring-2 ring-blue-600 ring-offset-2 ring-offset-white border-blue-400 bg-blue-50/30 shadow-lg"
    )}>
      {/* Currently Selected Badge */}
      {isMappedToSelectedSource && selectedSourceName && (
        <div className="absolute -top-4 right-2 z-10">
          <div className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            CURRENTLY SELECTED
          </div>
        </div>
      )}
      
      <div className="space-y-1.5">
        {/* Mapping Status Bar - Prominent at top */}
        {isMapped && (
          <div className={cn(
            "text-xs px-2 py-1 rounded-md flex items-center justify-between font-medium",
            isMappedToSelectedSource 
              ? "text-blue-800 bg-blue-200 border border-blue-300" 
              : "text-green-700 bg-green-100 border border-green-200"
          )}>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              <span>MAPPED{mappedBacnetName ? `: ${mappedBacnetName}` : ''}</span>
            </div>
            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs border border-blue-200">
              {trackedPointsCount} Tracked
            </span>
          </div>
        )}

        {/* Equipment Info - Compact single line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {!isMapped && (
              <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">
                {equipment.name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{equipment.type}</span>
                {equipment.location && (
                  <>
                    <span>•</span>
                    <span className="truncate">{equipment.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {isMapped ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={onUnmap}
              className="text-[10px] h-5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full"
            >
              <X className="h-2.5 w-2.5 mr-0.5" />
              UNMAP
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={onMap}
              className="text-xs h-7 px-2"
            >
              <LinkIcon className="h-3 w-3 mr-1" />
              Map
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CxAlloyPanel() {
  const {
    selectedEquipment,
    equipment,
    cxAlloyEquipment,
    setCxAlloyEquipment,
    equipmentMappings,
    viewMode,
    setViewMode,
    addEquipmentMapping,
    removeEquipmentMapping,
    getMappedCxAlloyEquipment,
    getMappedCxAlloyForDataSource,
    getUnmappedCxAlloyEquipment,
    recordEquipmentMapping,
    selectedPoints,
    getSelectedPointsData,
    trackedPointsByEquipment,
    getSelectedTemplate,
    equipmentTemplateMap
  } = useAppStore();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [showCreateTemplate, setShowCreateTemplate] = React.useState(false);
  const [lastMappedEquipment, setLastMappedEquipment] = React.useState<{bacnet: Equipment, cxalloy: CxAlloyEquipment} | null>(null);
  const [creatingNewEquipment, setCreatingNewEquipment] = React.useState(false);
  
  // Force a re-render when equipment mappings change
  React.useEffect(() => {
    // This effect will trigger when equipmentMappings change
    console.log('[CxAlloyPanel] Equipment mappings updated:', equipmentMappings.length);
  }, [equipmentMappings]);

  const mappedEquipment = getMappedCxAlloyEquipment();
  const unmappedEquipment = getUnmappedCxAlloyEquipment();
  
  // Get the mapped CxAlloy equipment for the currently selected data source
  const highlightedEquipment = selectedEquipment ? getMappedCxAlloyForDataSource(selectedEquipment.id) : null;

  // Helper functions (need to be declared before use)
  const isEquipmentMapped = (equipmentId: string | number) => {
    return equipmentMappings.some(m => Number((m as any).cxalloyEquipmentId || (m as any).cxAlloyEquipmentId) === Number(equipmentId));
  };

  const getMappedBacnetName = (cxAlloyEquipmentId: string | number): string | undefined => {
    const mapping = equipmentMappings.find(m => Number((m as any).cxalloyEquipmentId || (m as any).cxAlloyEquipmentId) === Number(cxAlloyEquipmentId));
    if (!mapping) return undefined;
    
    const bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);
    return bacnetEquipment?.name;
  };

  // Get all CxAlloy equipment mapped to the selected data source
  const getAllMappedToSelectedSource = () => {
    if (!selectedEquipment) return [];
    return cxAlloyEquipment.filter(eq => 
      equipmentMappings.some(m => 
        m.bacnetEquipmentId === selectedEquipment.id && Number((m as any).cxalloyEquipmentId || (m as any).cxAlloyEquipmentId) === Number(eq.id)
      )
    );
  };

  // Check if a CxAlloy equipment is mapped to the selected data source
  const isMappedToSelectedSource = (cxAlloyEquipmentId: string | number): boolean => {
    if (!selectedEquipment) return false;
    return equipmentMappings.some(m => 
      m.bacnetEquipmentId === selectedEquipment.id && Number((m as any).cxalloyEquipmentId || (m as any).cxAlloyEquipmentId) === Number(cxAlloyEquipmentId)
    );
  };

  // Get tracked points count for a specific CxAlloy equipment
  const getTrackedPointsCount = (cxAlloyEquipmentId: string | number): number => {
    const mapping = equipmentMappings.find(m => Number((m as any).cxalloyEquipmentId || (m as any).cxAlloyEquipmentId) === Number(cxAlloyEquipmentId));
    if (!mapping) return 0;
    
    // Find the BACnet equipment for this mapping
    const bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);
    if (!bacnetEquipment) return 0;
    
    // Check if this equipment has a template applied
    const templateId = equipmentTemplateMap[bacnetEquipment.id];
    if (templateId) {
      // If a template is active, tracked count should reflect the template point count
      const template = useAppStore.getState().getSelectedTemplate();
      if (template && template.id === templateId) {
        return template.points?.length || 0;
      }
      return 0;
    }
    
    // If no template, count individually tracked points from persistent storage
    const trackedPointsSet = trackedPointsByEquipment[mapping.bacnetEquipmentId] || new Set();
    return trackedPointsSet.size;
  };

  // Get total tracked points across all equipment mappings
  const getTotalTrackedPointsCount = (): number => {
    return equipmentMappings.reduce((total, mapping) => {
      const bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);
      if (!bacnetEquipment) return total;
      
      // Check if this equipment has a template applied
      const templateId = equipmentTemplateMap[bacnetEquipment.id];
      if (templateId) {
        // If template is active, count template-defined points
        const template = useAppStore.getState().getSelectedTemplate();
        if (template && template.id === templateId) {
          return total + (template.points?.length || 0);
        }
        return total;
      }
      
      // If no template, count individually tracked points from persistent storage
      const trackedPointsSet = trackedPointsByEquipment[mapping.bacnetEquipmentId] || new Set();
      return total + trackedPointsSet.size;
    }, 0);
  };

  const getFilteredEquipment = () => {
    let equipment;
    switch (viewMode.right) {
      case 'mapped':
        equipment = mappedEquipment;
        break;
      case 'unmapped':
        equipment = unmappedEquipment;
        break;
      default:
        equipment = cxAlloyEquipment;
    }

    // Apply search filter
    if (searchTerm) {
      equipment = equipment.filter(eq => 
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.space?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Only apply special sorting when a data source is selected
    if (selectedEquipment) {
      // Sort to bring equipment mapped to the selected data source to the top
      equipment = equipment.sort((a, b) => {
        const aMappedToSelected = isMappedToSelectedSource(a.id);
        const bMappedToSelected = isMappedToSelectedSource(b.id);
        
        // Priority: equipment mapped to currently selected data source
        if (aMappedToSelected && !bMappedToSelected) return -1;
        if (!aMappedToSelected && bMappedToSelected) return 1;
        
        // Otherwise, maintain alphabetical order
        return a.name.localeCompare(b.name);
      });
    } else {
      // No data source selected - just use alphabetical order
      equipment = equipment.sort((a, b) => a.name.localeCompare(b.name));
    }

    return equipment;
  };

  const filteredEquipment = getFilteredEquipment();

  const handleMap = async (cxAlloyEquipmentItem: CxAlloyEquipment) => {
    if (!selectedEquipment) return;
    
    try {
      // Create the equipment mapping
      const mapping = {
        id: `manual-${selectedEquipment.id}-${cxAlloyEquipmentItem.id}`,
        bacnetEquipmentId: selectedEquipment.id,
        bacnetEquipmentName: selectedEquipment.name,
        bacnetEquipmentType: selectedEquipment.type || 'Unknown',
        cxalloyEquipmentId: Number(cxAlloyEquipmentItem.id),
        cxAlloyEquipmentName: cxAlloyEquipmentItem.name,
        cxalloyCategory: cxAlloyEquipmentItem.type as any,
        mappingType: 'manual' as const,
        confidence: 0.8,
        mappingReason: 'Manual mapping from CxAlloy panel',
        totalBacnetPoints: selectedEquipment.totalPoints || 0,
        mappedPointsCount: 0,
        unmappedPointsCount: 0,
        isActive: true,
        isVerified: true,
        verifiedBy: 'user-manual-map',
        verifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'manual-mapping',
        mappingMethod: 'manual' as const,
        mappedAt: new Date()
      };

      // Add the mapping to the store
      addEquipmentMapping(mapping);

      // Record audit trail
      await recordEquipmentMapping(
        selectedEquipment.id,
        selectedEquipment.name,
        Number(cxAlloyEquipmentItem.id),
        cxAlloyEquipmentItem.name,
        'created',
        'manual',
        0.8,
        selectedEquipment.totalPoints || 0
      );

      console.log('[CxAlloyPanel] Manual mapping created:', selectedEquipment.name, '→', cxAlloyEquipmentItem.name);
      
      // Store the mapped equipment for template creation
      if (selectedPoints.size > 0) {
        setLastMappedEquipment({
          bacnet: selectedEquipment,
          cxalloy: cxAlloyEquipmentItem
        });
        setShowCreateTemplate(true);
      }
    } catch (error) {
      console.error('[CxAlloyPanel] Failed to create mapping:', error);
    }
  };

  const handleUnmap = async (cxAlloyEquipmentItem: CxAlloyEquipment) => {
    if (!selectedEquipment) return;
    
    try {
      // Record audit trail before removing
      await recordEquipmentMapping(
        selectedEquipment.id,
        selectedEquipment.name,
        Number(cxAlloyEquipmentItem.id),
        cxAlloyEquipmentItem.name,
        'deleted',
        'manual'
      );

      removeEquipmentMapping(selectedEquipment.id);
      console.log('[CxAlloyPanel] Mapping removed:', selectedEquipment.name, '→', cxAlloyEquipmentItem.name);
    } catch (error) {
      console.error('[CxAlloyPanel] Failed to remove mapping:', error);
    }
  };

  const handleCreateNewEquipment = async () => {
    if (!selectedEquipment) return;
    
    setCreatingNewEquipment(true);
    
    try {
      console.log('[CxAlloyPanel] Creating new CxAlloy equipment based on:', selectedEquipment);
      
      // Extract richer information from BACnet equipment metadata and connector data
      const vendor = selectedEquipment.vendor || 'Unknown';
      const model = selectedEquipment.model || selectedEquipment.modelName || 'Unknown';
      const description = selectedEquipment.description || 
                         selectedEquipment.metadata?.deviceName || 
                         `${selectedEquipment.type} - ${vendor} ${model}`.trim();
      
      // Try to extract location information from various sources
      let location = 'TBD';
      let space = 'TBD';
      
      if (selectedEquipment.location) {
        location = selectedEquipment.location;
      } else if (selectedEquipment.metadata?.uri) {
        // Extract building/location info from BACnet URI if available
        const uriMatch = selectedEquipment.metadata.uri.match(/bacnet:\/\/(\d+\.\d+\.\d+\.\d+)\//);
        if (uriMatch) {
          location = `BACnet Network ${uriMatch[1]}`;
        }
      }
      
      // Use vendor description if available - it's often more detailed and descriptive
      let enhancedDescription = description;
      if (selectedEquipment.metadata?.customFields?.descriptionFromVendor) {
        enhancedDescription = selectedEquipment.metadata.customFields.descriptionFromVendor;
      }
      
      // For BACnet device name, use the more descriptive name if available
      let deviceName = selectedEquipment.name;
      if (selectedEquipment.metadata?.deviceName && selectedEquipment.metadata.deviceName !== selectedEquipment.name) {
        deviceName = selectedEquipment.metadata.deviceName;
      }
      
      // Create new CxAlloy equipment based on enhanced BACnet equipment data
      const newCxAlloyEquipment = {
        name: selectedEquipment.name, // Keep original name for consistency
        type: selectedEquipment.type,
        description: `${enhancedDescription} (Mapped from BACnet: ${deviceName})`,
        location: location,
        space: space,
        vendor: vendor,
        model: model,
        projectId: 2 // Default project ID
      };
      
      // Call API to create the equipment
      const response = await fetch('/api/cxalloy/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCxAlloyEquipment)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[CxAlloyPanel] Created new CxAlloy equipment:', data.equipment);
        
        // Refresh CxAlloy equipment list to include the new equipment
        const equipmentResponse = await fetch('/api/cxalloy/equipment?projectId=2');
        const equipmentData = await equipmentResponse.json();
        if (equipmentData.success) {
          setCxAlloyEquipment(equipmentData.equipment);
        }
        
        alert(`Successfully created new CxAlloy equipment: ${data.equipment.name}`);
        
        // Automatically map the new equipment if desired
        const newEquipment = data.equipment;
        await handleMap(newEquipment);
        
      } else {
        throw new Error(data.error || 'Failed to create CxAlloy equipment');
      }
    } catch (error) {
      console.error('[CxAlloyPanel] Failed to create CxAlloy equipment:', error);
      alert(`Failed to create CxAlloy equipment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingNewEquipment(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">CxAlloy Mapping</h2>
            <Building className="h-5 w-5 text-primary" />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Map BACnet equipment to CxAlloy project equipment
          </p>

          {/* Search and Filter Controls */}
          <div className="space-y-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search CxAlloy equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Filter Dropdown */}
            <Select
              value={viewMode.right}
              onValueChange={(value: 'all' | 'mapped' | 'unmapped') => setViewMode('right', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Equipment</SelectItem>
                <SelectItem value="mapped">Mapped Only</SelectItem>
                <SelectItem value="unmapped">Unmapped Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Equipment: {cxAlloyEquipment.length}</span>
            <span>Mapped: {mappedEquipment.length}</span>
            <span>Unmapped: {unmappedEquipment.length}</span>
            <span>Tracked: {getTotalTrackedPointsCount()}</span>
          </div>
        </div>
      </div>

      {/* Selected Equipment Info */}
      {selectedEquipment && (
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Selected for Mapping:</div>
                <div className="text-muted-foreground">{selectedEquipment.name}</div>
                <div className="text-xs text-muted-foreground">{selectedEquipment.type}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateNewEquipment}
                disabled={creatingNewEquipment}
                className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 flex-shrink-0"
                title="Create new CxAlloy equipment based on this BACnet equipment"
              >
                <Plus className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">
                  {creatingNewEquipment ? 'Creating...' : 'Add New'}
                </span>
              </Button>
            </div>
            
            {/* Show mapped CxAlloy equipment if any */}
            {(() => {
              const mappedEquipment = getAllMappedToSelectedSource();
              if (mappedEquipment.length > 0) {
                return (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-xs font-medium text-green-700 mb-1">
                      Mapped to CxAlloy Equipment:
                    </div>
                    <div className="space-y-1">
                      {mappedEquipment.map((eq, idx) => (
                        <div key={eq.id} className="flex items-center gap-2 text-xs bg-green-50 px-2 py-1 rounded border border-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span className="font-medium text-green-800">{eq.name}</span>
                          <span className="text-green-600">({eq.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {/* Equipment List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {filteredEquipment.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Filter className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  {viewMode.right === 'mapped' ? 'No Mapped Equipment' : 
                   viewMode.right === 'unmapped' ? 'No Unmapped Equipment' : 
                   'No Equipment Available'}
                </h3>
                <p className="text-muted-foreground">
                  {viewMode.right === 'mapped' ? 'No equipment has been mapped yet' :
                   viewMode.right === 'unmapped' ? 'All equipment has been mapped' :
                   'CxAlloy equipment data will appear here'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEquipment.map((equip) => (
              <CxAlloyEquipmentItem
                key={equip.id}
                equipment={equip}
                isMapped={isEquipmentMapped(equip.id)}
                isHighlighted={highlightedEquipment?.id === equip.id || isMappedToSelectedSource(equip.id)}
                mappedBacnetName={getMappedBacnetName(equip.id)}
                isMappedToSelectedSource={isMappedToSelectedSource(equip.id)}
                selectedSourceName={selectedEquipment?.name}
                trackedPointsCount={getTrackedPointsCount(equip.id)}
                onMap={() => handleMap(equip)}
                onUnmap={() => handleUnmap(equip)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="space-y-2">
          {/* Mapping Instructions */}
          {!selectedEquipment ? (
            <div className="text-xs text-muted-foreground text-center">
              Select BACnet equipment from the left panel to enable mapping
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center">
              Click &quot;Map&quot; to link {selectedEquipment.name} to CxAlloy equipment
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Mapping Progress</span>
            <span>
              {mappedEquipment.length} / {cxAlloyEquipment.length} 
              ({cxAlloyEquipment.length > 0 ? Math.round((mappedEquipment.length / cxAlloyEquipment.length) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Template Creation Dialog */}
      <CreateMappingTemplateDialog
        isOpen={showCreateTemplate}
        onClose={() => {
          setShowCreateTemplate(false);
          setLastMappedEquipment(null);
        }}
        bacnetEquipment={lastMappedEquipment?.bacnet || null}
        cxalloyEquipment={lastMappedEquipment?.cxalloy || null}
        selectedPoints={getSelectedPointsData()}
      />
    </div>
  );
}

// Template Creation Dialog Component
function CreateMappingTemplateDialog({
  isOpen,
  onClose,
  bacnetEquipment,
  cxalloyEquipment,
  selectedPoints
}: {
  isOpen: boolean;
  onClose: () => void;
  bacnetEquipment: Equipment | null;
  cxalloyEquipment: CxAlloyEquipment | null;
  selectedPoints: any[];
}) {
  const { fetchTemplates } = useAppStore();
  const { setSelectedTemplate } = useAppStore();
  const [templateName, setTemplateName] = React.useState('');
  const [templateDescription, setTemplateDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && cxalloyEquipment) {
      setTemplateName(`${cxalloyEquipment.type} - ${cxalloyEquipment.name} Template`);
      setTemplateDescription(`Template based on ${bacnetEquipment?.name} → ${cxalloyEquipment.name} mapping with ${selectedPoints.length} tracked points`);
    }
  }, [isOpen, cxalloyEquipment, bacnetEquipment, selectedPoints]);

  const handleSave = async () => {
    console.log('[CreateMappingTemplateDialog] handleSave called');
    console.log('[CreateMappingTemplateDialog] bacnetEquipment:', bacnetEquipment);
    console.log('[CreateMappingTemplateDialog] cxalloyEquipment:', cxalloyEquipment);
    console.log('[CreateMappingTemplateDialog] selectedPoints:', selectedPoints);
    console.log('[CreateMappingTemplateDialog] templateName:', templateName);
    
    if (!bacnetEquipment || !cxalloyEquipment || !templateName.trim()) {
      setError('Please provide a template name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('[CreateMappingTemplateDialog] Calling createTemplateFromMappedEquipment...');
      const template = await UnifiedTemplateService.createTemplateFromMappedEquipment(
        cxalloyEquipment,
        bacnetEquipment,
        selectedPoints,
        templateName,
        templateDescription,
        'user'
      );

      console.log('[CreateMappingTemplateDialog] Template created successfully:', template);
      
      // Refresh templates in the store so it shows up in bulk mapping
      await fetchTemplates();
      
      alert(`Template "${templateName}" created successfully!`);
      // Auto-apply this template for current equipment
      setSelectedTemplate(template.id);
      onClose();
    } catch (err) {
      console.error('[CreateMappingTemplateDialog] Error creating template:', err);
      setError(`Failed to create template: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Save Mapping as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from this equipment mapping with {selectedPoints.length} tracked points.
            This template can be used for bulk mapping similar equipment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Equipment Info */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div><strong>BACnet:</strong> {bacnetEquipment?.name}</div>
                <div><strong>CxAlloy:</strong> {cxalloyEquipment?.name}</div>
                <div><strong>Type:</strong> {cxalloyEquipment?.type}</div>
                <div><strong>Points:</strong> {selectedPoints.length} tracked</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Template Name */}
          <div className="grid gap-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name..."
              disabled={saving}
            />
          </div>

          {/* Template Description */}
          <div className="grid gap-2">
            <Label htmlFor="template-desc">Description (optional)</Label>
            <Input
              id="template-desc"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Enter template description..."
              disabled={saving}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !templateName.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 