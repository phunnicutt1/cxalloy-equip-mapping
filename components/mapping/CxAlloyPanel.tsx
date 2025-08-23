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
  Link, 
  Unlink,
  CheckCircle,
  Circle,
  Building,
  Filter,
  MapPin,
  ArrowRight,
  Search
} from 'lucide-react';
import { Input } from '../ui/input';
import { CxAlloyEquipment } from '../../types/equipment';

interface CxAlloyEquipmentItemProps {
  equipment: CxAlloyEquipment;
  isMapped: boolean;
  isHighlighted?: boolean;
  mappedBacnetName?: string;
  onMap: () => void;
  onUnmap: () => void;
}

function CxAlloyEquipmentItem({ 
  equipment, 
  isMapped, 
  isHighlighted = false,
  mappedBacnetName,
  onMap, 
  onUnmap 
}: CxAlloyEquipmentItemProps) {
  return (
    <div className={cn(
      "border border-border rounded-lg p-3 bg-card transition-all duration-200 relative",
      isMapped ? "border-green-200 bg-green-50/50" : "hover:border-primary/50",
      isHighlighted && "ring-2 ring-blue-500 ring-opacity-50 border-blue-300 bg-blue-50/30 shadow-lg"
    )}>
      <div className="space-y-2">
        {/* Highlighted Badge */}
        {isHighlighted && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              SELECTED MAPPING
            </div>
          </div>
        )}

        {/* Equipment Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isMapped ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium text-sm text-foreground">
                {equipment.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {equipment.type}
              </div>
            </div>
          </div>
          
          <Button
            size="sm"
            variant={isMapped ? "outline" : "default"}
            onClick={isMapped ? onUnmap : onMap}
            className={cn(
              "text-xs",
              isMapped && "text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            )}
          >
            {isMapped ? (
              <>
                <Unlink className="h-3 w-3 mr-1" />
                Unmap
              </>
            ) : (
              <>
                <Link className="h-3 w-3 mr-1" />
                Map
              </>
            )}
          </Button>
        </div>

        {/* Equipment Details */}
        {equipment.description && (
          <div className="text-xs text-muted-foreground">
            {equipment.description}
          </div>
        )}

        {/* Equipment Metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {equipment.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{equipment.location}</span>
            </div>
          )}
          {equipment.zone && (
            <span>Zone: {equipment.zone}</span>
          )}
          {equipment.system && (
            <span>System: {equipment.system}</span>
          )}
        </div>

        {/* Mapping Info */}
        {isMapped && (
          <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            <span>Mapped to BACnet equipment{mappedBacnetName ? `: ${mappedBacnetName}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CxAlloyPanel() {
  const {
    selectedEquipment,
    equipment,
    cxAlloyEquipment,
    equipmentMappings,
    viewMode,
    setViewMode,
    addEquipmentMapping,
    removeEquipmentMapping,
    getMappedCxAlloyEquipment,
    getMappedCxAlloyForDataSource,
    getUnmappedCxAlloyEquipment,
    recordEquipmentMapping
  } = useAppStore();

  const [searchTerm, setSearchTerm] = React.useState('');
  
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
  const isEquipmentMapped = (equipmentId: string) => {
    return equipmentMappings.some(m => m.cxAlloyEquipmentId === equipmentId);
  };

  const getMappedBacnetName = (cxAlloyEquipmentId: string): string | undefined => {
    const mapping = equipmentMappings.find(m => m.cxAlloyEquipmentId === cxAlloyEquipmentId);
    if (!mapping) return undefined;
    
    const bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);
    return bacnetEquipment?.name;
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

    // Smart sorting: if there's a highlighted equipment (mapped to selected data source),
    // bring it to the top of the list for better visibility
    if (highlightedEquipment) {
      const highlighted = equipment.find(eq => eq.id === highlightedEquipment.id);
      if (highlighted) {
        const remaining = equipment.filter(eq => eq.id !== highlightedEquipment.id);
        equipment = [highlighted, ...remaining];
      }
    }

    // Secondary sort: within each group, sort mapped equipment before unmapped
    equipment = equipment.sort((a, b) => {
      const aMapped = isEquipmentMapped(a.id);
      const bMapped = isEquipmentMapped(b.id);
      
      // If one is mapped and the other isn't, prioritize the mapped one
      if (aMapped && !bMapped) return -1;
      if (!aMapped && bMapped) return 1;
      
      // Otherwise, maintain alphabetical order
      return a.name.localeCompare(b.name);
    });

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
        cxalloyEquipmentId: cxAlloyEquipmentItem.id,
        cxalloyEquipmentName: cxAlloyEquipmentItem.name,
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
        mappingMethod: 'manual' as const
      };

      // Add the mapping to the store
      addEquipmentMapping(mapping);

      // Record audit trail
      await recordEquipmentMapping(
        selectedEquipment.id,
        selectedEquipment.name,
        cxAlloyEquipmentItem.id,
        cxAlloyEquipmentItem.name,
        'created',
        'manual',
        0.8,
        selectedEquipment.totalPoints || 0
      );

      console.log('[CxAlloyPanel] Manual mapping created:', selectedEquipment.name, '→', cxAlloyEquipmentItem.name);
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
        cxAlloyEquipmentItem.id,
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
            <span>Total: {cxAlloyEquipment.length}</span>
            <span>Mapped: {mappedEquipment.length}</span>
            <span>Unmapped: {unmappedEquipment.length}</span>
          </div>
        </div>
      </div>

      {/* Selected Equipment Info */}
      {selectedEquipment && (
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="text-sm">
            <div className="font-medium text-foreground">Selected for Mapping:</div>
            <div className="text-muted-foreground">{selectedEquipment.name}</div>
            <div className="text-xs text-muted-foreground">{selectedEquipment.type}</div>
          </div>
        </div>
      )}

      {/* Equipment List */}
      <div className="flex-1 overflow-y-auto p-4">
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
          <div className="space-y-3">
            {filteredEquipment.map((equip) => (
              <CxAlloyEquipmentItem
                key={equip.id}
                equipment={equip}
                isMapped={isEquipmentMapped(equip.id)}
                isHighlighted={highlightedEquipment?.id === equip.id}
                mappedBacnetName={getMappedBacnetName(equip.id)}
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
    </div>
  );
} 