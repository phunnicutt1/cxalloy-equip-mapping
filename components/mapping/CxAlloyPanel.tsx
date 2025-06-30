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
  ArrowRight
} from 'lucide-react';
import { CxAlloyEquipment } from '../../types/equipment';

interface CxAlloyEquipmentItemProps {
  equipment: CxAlloyEquipment;
  isMapped: boolean;
  onMap: () => void;
  onUnmap: () => void;
}

function CxAlloyEquipmentItem({ 
  equipment, 
  isMapped, 
  onMap, 
  onUnmap 
}: CxAlloyEquipmentItemProps) {
  return (
    <div className={cn(
      "border border-border rounded-lg p-3 bg-card transition-all duration-200",
      isMapped ? "border-green-200 bg-green-50/50" : "hover:border-primary/50"
    )}>
      <div className="space-y-2">
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
            <span>Mapped to BACnet equipment</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CxAlloyPanel() {
  const {
    selectedEquipment,
    cxAlloyEquipment,
    equipmentMappings,
    viewMode,
    setViewMode,
    addEquipmentMapping,
    removeEquipmentMapping,
    getMappedCxAlloyEquipment,
    getUnmappedCxAlloyEquipment
  } = useAppStore();

  const mappedEquipment = getMappedCxAlloyEquipment();
  const unmappedEquipment = getUnmappedCxAlloyEquipment();

  const getFilteredEquipment = () => {
    switch (viewMode.right) {
      case 'mapped':
        return mappedEquipment;
      case 'unmapped':
        return unmappedEquipment;
      default:
        return cxAlloyEquipment;
    }
  };

  const filteredEquipment = getFilteredEquipment();

  const handleMap = (cxAlloyEquipmentItem: CxAlloyEquipment) => {
    if (!selectedEquipment) return;
    
    addEquipmentMapping({
      bacnetEquipmentId: selectedEquipment.id,
      cxAlloyEquipmentId: cxAlloyEquipmentItem.id,
      mappedAt: new Date().toISOString(),
      confidence: 0.8, // This would be calculated based on similarity
      mappingType: 'manual'
    });
  };

  const handleUnmap = (cxAlloyEquipmentItem: CxAlloyEquipment) => {
    if (!selectedEquipment) return;
    removeEquipmentMapping(selectedEquipment.id);
  };

  const isEquipmentMapped = (equipmentId: string) => {
    return equipmentMappings.some(m => m.cxAlloyEquipmentId === equipmentId);
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

          {/* Filter Controls */}
          <div className="flex items-center gap-2">
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
            {filteredEquipment.map((equipment) => (
              <CxAlloyEquipmentItem
                key={equipment.id}
                equipment={equipment}
                isMapped={isEquipmentMapped(equipment.id)}
                onMap={() => handleMap(equipment)}
                onUnmap={() => handleUnmap(equipment)}
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