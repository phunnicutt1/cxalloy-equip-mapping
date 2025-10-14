'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';
import { NormalizedPoint } from '../../types/normalized';
import { PointCategory } from '../../types/point';
import { CompactPointRow } from './CompactPointRow';
import { Input } from '../ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Info,
  List,
  Filter,
  FileText,
  Zap,
  Gauge,
  ToggleLeft,
  Target,
  Plus,
  CheckCircle2,
  Settings,
  X,
  Search,
  FilterX,
  Copy
} from 'lucide-react';
import { Button } from '../ui/button';
import { BulkApplyDialog } from './BulkApplyDialog';
import { findMappingSuggestions, type NameMatchSuggestion } from '../../lib/utils/smart-matching';
import { Link2, ArrowRight } from 'lucide-react';

interface PointRowProps {
  point: NormalizedPoint;
  index: number;
  isSelected: boolean;
  onTrackPoint: (pointId: string) => void;
}

function PointRow({ point, index, isSelected, onTrackPoint }: PointRowProps) {
  const getPointIcon = (objectType?: string) => {
    switch (objectType) {
      case 'AI':
      case 'AV':
        return <Gauge className="h-4 w-4 text-blue-500" />;
      case 'AO':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'BI':
      case 'BV':
        return <ToggleLeft className="h-4 w-4 text-green-500" />;
      case 'BO':
        return <ToggleLeft className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUnitDisplay = (unit?: string) => {
    if (!unit) return null;
    return (
      <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
        {unit}
      </span>
    );
  };

  return (
    <div 
      className={cn(
        "border-b border-border p-3 hover:bg-muted/30 transition-colors",
        index % 2 === 0 ? "bg-background" : "bg-muted/10"
      )}
    >
      {/* Two-Level Layout */}
      <div className="space-y-2">
        {/* Top Level: Point Name + Metadata + Unit/Object Type */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon and Point Name */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0" style={{ minWidth: '200px', maxWidth: '300px' }}>
            {getPointIcon(point.objectType)}
            <div className="min-w-0">
              <div className="font-medium text-sm text-foreground truncate">
                {point.normalizedName || point.originalName}
              </div>
              {point.normalizedName && point.originalName !== point.normalizedName && (
                <div className="text-xs text-muted-foreground font-mono truncate">
                  Original: {point.originalName}
                </div>
              )}
            </div>
          </div>

          {/* Center: Point Metadata */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground whitespace-nowrap flex-1">
            {point.dataType && (
              <span>Type: {point.dataType}</span>
            )}
            {point.objectName && (
              <>
                <span>•</span>
                <span>BACnet: {point.objectName}</span>
              </>
            )}
            {point.category === PointCategory.COMMAND && (
              <>
                <span>•</span>
                <span className="text-orange-600">Writable</span>
              </>
            )}
          </div>

          {/* Right: Unit and Object Type + Track Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {point.units && getUnitDisplay(point.units)}
            {point.objectType && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono">
                {point.objectType}
              </span>
            )}
            <Button
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => onTrackPoint(point.originalPointId || point.originalName)}
              className="ml-2"
            >
              <Target className="h-3 w-3 mr-1" />
              {isSelected ? 'Tracked' : 'Track'}
            </Button>
          </div>
        </div>

        {/* Bottom Level: Description + Haystack Tags */}
        {(point.expandedDescription || (point.haystackTags && point.haystackTags.length > 0)) && (
          <div className="flex items-start justify-between gap-4 pl-6">
            {/* Left: Description */}
            <div className="text-xs text-muted-foreground flex-1 min-w-0">
              {point.expandedDescription || point.originalDescription}
            </div>

            {/* Right: Haystack Tags */}
            {point.haystackTags && point.haystackTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap justify-end flex-shrink-0">
                {point.haystackTags.map((tag, idx: number) => (
                  <span 
                    key={idx}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap"
                  >
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PointDetails() {
  const {
    selectedEquipment,
    getSelectedEquipmentPoints,
    selectedPoints,
    togglePointSelection,
    clearPointSelection,
    setShowBulkApplyDialog,
    showBulkApplyDialog,
    cxAlloyEquipment,
    addEquipmentMapping,
    recordEquipmentMapping,
    getSelectedPointsData,
    equipmentMappings,
    recordPointEdit,
    trackedPointsByEquipment
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [unitsFilter, setUnitsFilter] = useState('');
  const [objectTypeFilter, setObjectTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const points = getSelectedEquipmentPoints();
  const selectedPointsData = getSelectedPointsData();
  const isMappedEquipment = equipmentMappings?.some(m => m.bacnetEquipmentId === selectedEquipment?.id) || false;

  // Sync tracked points when equipment changes
  // This effect is handled by setSelectedEquipment in the store, so we don't need it here
  // Removing this useEffect to prevent infinite loops


  // Filter points based on search and filter criteria
  const filteredPoints = useMemo(() => {
    return points.filter(point => {
      // Search term filter
      if (searchTerm && !point.normalizedName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !point.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !point.expandedDescription?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Units filter
      if (unitsFilter && point.units !== unitsFilter) {
        return false;
      }

      // Object type filter
      if (objectTypeFilter && point.objectType !== objectTypeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter && point.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [points, searchTerm, unitsFilter, objectTypeFilter, categoryFilter]);

  // Get unique values for filter dropdowns
  const uniqueUnits = useMemo(() => 
    [...new Set(points.map(p => p.units).filter(Boolean))].sort(), [points]);
  const uniqueObjectTypes = useMemo(() => 
    [...new Set(points.map(p => p.objectType).filter(Boolean))].sort(), [points]);
  const uniqueCategories = useMemo(() => 
    [...new Set(points.map(p => p.category).filter(Boolean))].sort(), [points]);

  const handleTrackPoint = (pointId: string) => {
    togglePointSelection(pointId);
  };

  const handleBulkApply = () => {
    if (selectedPoints.size > 0) {
      setShowBulkApplyDialog(true);
    }
  };

  // Handle smart suggestion click
  const handleSuggestionClick = async (suggestion: NameMatchSuggestion) => {
    if (!selectedEquipment) return;

    try {
      // Find the CxAlloy equipment
      const cxAlloyEq = cxAlloyEquipment.find(eq => eq.name === suggestion.equipmentName);
      if (!cxAlloyEq) {
        console.error('CxAlloy equipment not found:', suggestion.equipmentName);
        return;
      }

      // Create the equipment mapping
      const mapping = {
        id: `suggestion-${selectedEquipment.id}-${cxAlloyEq.id}`,
        bacnetEquipmentId: selectedEquipment.id,
        bacnetEquipmentName: selectedEquipment.name,
        bacnetEquipmentType: selectedEquipment.type || 'Unknown',
        cxalloyEquipmentId: Number(cxAlloyEq.id),
        cxAlloyEquipmentName: cxAlloyEq.name,
        cxalloyCategory: cxAlloyEq.type as any,
        mappingType: 'automatic' as const,
        confidence: suggestion.confidence,
        mappingReason: suggestion.matchReason || 'Suggestion mapping',
        totalBacnetPoints: selectedEquipment.totalPoints || 0,
        mappedPointsCount: 0,
        unmappedPointsCount: 0,
        isActive: true,
        isVerified: suggestion.confidence >= 0.8,
        verifiedBy: suggestion.confidence >= 0.8 ? 'auto-suggestion' : undefined,
        verifiedAt: suggestion.confidence >= 0.8 ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'suggestion-mapping',
        mappingMethod: 'automatic' as const,
        mappedAt: new Date()
      };

      // Add the mapping to the store
      addEquipmentMapping(mapping as any);

      // Save to database
      try {
        const saveResponse = await fetch('/api/save-mappings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            equipmentMappings: [{
              bacnetEquipmentId: selectedEquipment.id,
              bacnetEquipmentName: selectedEquipment.name,
              cxalloyEquipmentId: Number(cxAlloyEq.id),
              cxalloyEquipmentName: cxAlloyEq.name,
              trackedPoints: []
            }]
          })
        });

        const saveResult = await saveResponse.json();
        if (!saveResult.success) {
          console.error('Failed to save mapping:', saveResult.error);
        } else {
          console.log('Mapping saved successfully for:', selectedEquipment.name);
        }
      } catch (saveError) {
        console.error('Error saving mapping:', saveError);
      }

      // Record audit trail
      await recordEquipmentMapping(
        selectedEquipment.id,
        selectedEquipment.name,
        typeof cxAlloyEq.id === 'string' ? parseInt(cxAlloyEq.id) : cxAlloyEq.id,
        cxAlloyEq.name,
        'created',
        'manual',
        suggestion.confidence,
        selectedEquipment.totalPoints || 0
      );

      console.log('Auto-mapped equipment:', selectedEquipment.name, '→', cxAlloyEq.name);
    } catch (error) {
      console.error('Failed to create auto-mapping:', error);
    }
  };

  const handleUpdateNavName = async (pointId: string, newNavName: string) => {
    if (!selectedEquipment) return;
    
    // Find the point to get the old value
    const point = points.find(p => (p.originalPointId || p.originalName) === pointId);
    if (!point) return;
    
    const oldNavName = point.normalizedName || point.originalName || '';
    
    // Record the audit trail
    await recordPointEdit(
      pointId,
      selectedEquipment.id,
      selectedEquipment.name,
      'navName',
      oldNavName,
      newNavName,
      'manual'
    );
    
    // TODO: Update the point in the store/database
    console.log('[Audit] NavName updated:', { pointId, oldNavName, newNavName });
  };

  const handleUpdateUnits = async (pointId: string, newUnits: string) => {
    if (!selectedEquipment) return;
    
    // Find the point to get the old value
    const point = points.find(p => (p.originalPointId || p.originalName) === pointId);
    if (!point) return;
    
    const oldUnits = point.units || '';
    
    // Record the audit trail
    await recordPointEdit(
      pointId,
      selectedEquipment.id,
      selectedEquipment.name,
      'units',
      oldUnits,
      newUnits,
      'manual'
    );
    
    // TODO: Update the point in the store/database
    console.log('[Audit] Units updated:', { pointId, oldUnits, newUnits });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setUnitsFilter('');
    setObjectTypeFilter('');
    setCategoryFilter('');
  };

  const activeFiltersCount = [searchTerm, unitsFilter, objectTypeFilter, categoryFilter]
    .filter(Boolean).length;

  if (!selectedEquipment) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <List className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Select Data Source</h3>
            <p className="text-muted-foreground">
              Choose a data source from the left panel to view point details
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background space-y-3">
        {/* Equipment Info with Bulk Apply Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedEquipment.name}
              </h2>

              {/* Bulk Apply Tracked Points Button - Show when has tracked points */}
              {selectedPoints.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkApply}
                  className="flex items-center gap-2"
                  title="Copy tracked points to other mapped CxAlloy equipment"
                >
                  <Copy className="h-4 w-4" />
                  Bulk Apply Tracked Points
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedEquipment.description || 'Data source points and configuration'}
              {isMappedEquipment && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  Mapped
                </span>
              )}
            </p>
          </div>
          
          {/* Smart Suggestions - Show for unmapped equipment */}
          {selectedEquipment && !isMappedEquipment && (() => {
            const suggestions = findMappingSuggestions(
              selectedEquipment.name,
              selectedEquipment.type,
              cxAlloyEquipment.map(eq => ({
                id: typeof eq.id === 'string' ? parseInt(eq.id) : eq.id,
                name: eq.name,
                type: eq.type,
                description: eq.description || '',
                space: eq.space || ''
              }))
            );
            const topSuggestion = suggestions[0];

            if (!topSuggestion || topSuggestion.confidence < 0.6) return null;

            return (
              <button
                onClick={() => handleSuggestionClick(topSuggestion)}
                className="px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 group cursor-pointer animate-in fade-in slide-in-from-right-2 duration-500"
              >
                <div className="flex items-center gap-2 text-xs">
                  <Link2 className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-blue-700 font-medium">Suggested:</span>
                  <span className="text-blue-600 font-medium">{topSuggestion.equipmentName}</span>
                  <span className="text-blue-500">({Math.round(topSuggestion.confidence * 100)}%)</span>
                  <ArrowRight className="h-3 w-3 text-blue-500 group-hover:text-blue-600 transition-colors duration-200" />
                </div>
              </button>
            );
          })()}
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          {/* Search Bar - Full Width */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search points..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 w-full"
            />
          </div>

          {/* Filter Dropdowns Row */}
          <div className="flex items-center gap-2">
            {/* Units Filter */}
            <Select value={unitsFilter || 'all'} onValueChange={(value) => setUnitsFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 flex-1">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {uniqueUnits.map(unit => (
                  <SelectItem key={unit} value={unit || ''}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Object Type Filter */}
            <Select value={objectTypeFilter || 'all'} onValueChange={(value) => setObjectTypeFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 flex-1">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueObjectTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-8 flex-1">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 px-3"
              >
                <FilterX className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            {/* Results Count */}
            <div className="text-sm text-muted-foreground whitespace-nowrap px-2">
              <span className="font-medium">{filteredPoints.length}</span>
              <span className="text-muted-foreground">/{points.length}</span>
              {selectedPoints.size > 0 && (
                <span className="ml-1 text-primary font-medium">
                  ({selectedPoints.size})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      {filteredPoints.length > 0 && (
        <div className="px-3 py-2 bg-muted/20 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="w-4"></div> {/* Expand button space */}
            <div className="w-4"></div> {/* Icon space */}
            <div className="w-1/4 pr-2 text-left">NavName</div>
            <div className="w-1/4 pr-2 text-left">BACnet Object</div>
            <div className="w-1/4 pr-2 text-left">Description</div>
            <div className="w-1/4 pr-2 text-left">Units</div>
            <div className="w-20 text-right ml-auto">Action</div>
          </div>
        </div>
      )}

      {/* Points List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPoints.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Filter className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-foreground">No Points</h3>
                <p className="text-muted-foreground">
                  {points.length === 0 ? 'This data source has no points' : 'No points match current filters'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="group">
            {filteredPoints.map((point, index) => (
              <CompactPointRow 
                key={`${point.originalPointId || point.originalName || 'point'}-${index}`} 
                point={point} 
                index={index}
                isSelected={selectedPoints.has(point.originalPointId || point.originalName)}
                isMapped={isMappedEquipment}
                onTrackPoint={handleTrackPoint}
                onUpdateNavName={isMappedEquipment ? handleUpdateNavName : undefined}
                onUpdateUnits={isMappedEquipment ? handleUpdateUnits : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="space-x-4">
            <span>Points: {filteredPoints.length}</span>
            <span>Tracked: {selectedPoints.size}</span>
            {isMappedEquipment && (
              <span className="text-green-600">Editable</span>
            )}
          </div>
          
          {selectedPoints.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearPointSelection}
              >
                <X className="h-3 w-3 mr-1" />
                Clear ({selectedPoints.size})
              </Button>
              {isMappedEquipment && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkApply}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Bulk Apply
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bulk Apply Dialog */}
      <BulkApplyDialog
        isOpen={showBulkApplyDialog}
        onClose={() => setShowBulkApplyDialog(false)}
      />
    </div>
  );
} 