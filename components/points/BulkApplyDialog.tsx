'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../store/app-store';
import { Button } from '../ui/button';
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
import { Switch } from '../ui/switch';
import { CheckCircle2, Circle, Copy, Info, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Equipment } from '../../types/equipment';

interface BulkApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkApplyDialog({ isOpen, onClose }: BulkApplyDialogProps) {
  const {
    selectedEquipment,
    equipment,
    equipmentMappings,
    selectedPoints,
    getSelectedPointsData,
    trackedPointsByEquipment,
  } = useAppStore();

  const [clearFirst, setClearFirst] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const sourcePoints = getSelectedPointsData();

  // Get all mapped equipment except the currently selected one
  const availableTargets = React.useMemo(() => {
    return equipment.filter(eq => {
      // Must be mapped
      const isMapped = equipmentMappings.some(m => m.bacnetEquipmentId === eq.id);
      // Must not be the currently selected equipment
      const isNotCurrent = eq.id !== selectedEquipment?.id;
      return isMapped && isNotCurrent;
    });
  }, [equipment, equipmentMappings, selectedEquipment]);

  const toggleTarget = (equipmentId: string) => {
    const newTargets = new Set(selectedTargets);
    if (newTargets.has(equipmentId)) {
      newTargets.delete(equipmentId);
    } else {
      newTargets.add(equipmentId);
    }
    setSelectedTargets(newTargets);
  };

  const getTrackedCount = (equipmentId: string): number => {
    return trackedPointsByEquipment[equipmentId]?.size || 0;
  };

  const handleApply = async () => {
    if (selectedTargets.size === 0 || !selectedEquipment) return;

    setIsApplying(true);
    try {
      // Apply tracked points to each selected target
      const updates: Record<string, Set<string>> = {};
      const pointIds = new Set(sourcePoints.map(p => p.originalPointId || p.originalName));

      for (const targetId of selectedTargets) {
        if (clearFirst) {
          // Replace: set tracked points to only the source points
          updates[targetId] = new Set(pointIds);
        } else {
          // Merge: combine existing tracked points with source points
          const existingPoints = trackedPointsByEquipment[targetId] || new Set();
          updates[targetId] = new Set([...existingPoints, ...pointIds]);
        }
      }

      // Update the store with new tracked points
      useAppStore.setState((state) => ({
        trackedPointsByEquipment: {
          ...state.trackedPointsByEquipment,
          ...updates
        }
      }));

      // Save to database
      try {
        const mappingsToSave = Array.from(selectedTargets).map(targetId => {
          const targetEquipment = equipment.find(eq => eq.id === targetId);
          const mapping = equipmentMappings.find(m => m.bacnetEquipmentId === targetId);

          if (!targetEquipment || !mapping) return null;

          const trackedPoints = Array.from(updates[targetId] || []).map(pointId => {
            const point = targetEquipment.points?.find(p =>
              (p.originalPointId || p.originalName) === pointId
            );

            if (!point) return null;

            return {
              id: point.originalPointId || point.originalName,
              originalName: point.originalName,
              normalizedName: point.normalizedName,
              displayName: point.originalName,
              description: point.originalDescription || point.normalizedName,
              category: point.category || 'Unknown',
              dataType: point.dataType || 'Unknown',
              units: point.units || '',
              bacnetObjectType: point.objectType,
              bacnetObjectInstance: point.objectInstance,
              vendorName: 'Unknown'
            };
          }).filter(Boolean);

          const cxalloyId = (mapping as any).cxalloyEquipmentId || (mapping as any).cxAlloyEquipmentId;

          return {
            bacnetEquipmentId: targetId,
            bacnetEquipmentName: targetEquipment.name,
            cxalloyEquipmentId: cxalloyId,
            cxalloyEquipmentName: '', // Will be filled by API
            trackedPoints
          };
        }).filter(Boolean);

        const response = await fetch('/api/save-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipmentMappings: mappingsToSave })
        });

        const data = await response.json();

        if (!data.success) {
          console.error('Failed to save mappings:', data.error);
        }
      } catch (saveError) {
        console.error('Error saving mappings:', saveError);
      }

      // Close dialog
      onClose();
      setSelectedTargets(new Set());
    } catch (error) {
      console.error('Failed to apply bulk points:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedTargets(new Set());
    setClearFirst(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Bulk Apply Tracked Points
          </DialogTitle>
          <DialogDescription>
            Copy {sourcePoints.length} tracked point{sourcePoints.length !== 1 ? 's' : ''} from {selectedEquipment?.name} to other mapped equipment
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Left: Source Points */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="bg-muted p-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Source Points ({sourcePoints.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                From: {selectedEquipment?.name}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sourcePoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-blue-50 border border-blue-200 rounded text-xs"
                >
                  <div className="font-medium text-blue-900">
                    {point.normalizedName || point.originalName}
                  </div>
                  {point.objectType && (
                    <div className="text-blue-600 mt-0.5">
                      {point.objectType}{point.objectInstance || ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Target Equipment Selection */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="bg-muted p-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Target Equipment ({selectedTargets.size} selected)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select equipment to receive these tracked points
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {availableTargets.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  <div className="text-center p-4">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No mapped equipment available</p>
                    <p className="text-xs mt-2">Map other equipment to CxAlloy first to use bulk apply</p>
                  </div>
                </div>
              ) : (
                availableTargets.map((eq) => {
                  const isSelected = selectedTargets.has(eq.id);
                  const currentTracked = getTrackedCount(eq.id);

                  return (
                    <button
                      key={eq.id}
                      onClick={() => toggleTarget(eq.id)}
                      className={cn(
                        "w-full p-2 border rounded text-left transition-all",
                        isSelected
                          ? "bg-green-50 border-green-300 ring-2 ring-green-400"
                          : "bg-white border-border hover:border-green-300 hover:bg-green-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="truncate">{eq.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            {eq.type} • Currently {currentTracked} tracked
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <Label htmlFor="clear-first" className="text-sm font-medium cursor-pointer">
                Clear target points first
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {clearFirst
                  ? "Target equipment tracked points will be replaced"
                  : "Source points will be added to existing tracked points"}
              </p>
            </div>
            <Switch
              id="clear-first"
              checked={clearFirst}
              onCheckedChange={setClearFirst}
            />
          </div>
        </div>

        {/* Summary Alert */}
        {selectedTargets.size > 0 && (
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Summary:</strong> {clearFirst ? "Replace" : "Add"} {sourcePoints.length} tracked point
              {sourcePoints.length !== 1 ? "s" : ""} {clearFirst ? "on" : "to"} {selectedTargets.size} equipment item
              {selectedTargets.size !== 1 ? "s" : ""}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedTargets.size === 0 || isApplying}
          >
            <Copy className="h-4 w-4 mr-2" />
            {isApplying ? "Applying..." : `Apply to ${selectedTargets.size} Equipment`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}