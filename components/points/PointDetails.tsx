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
  Save
} from 'lucide-react';
import { Button } from '../ui/button';
import { PointConfigModal } from './PointConfigModal';

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
    selectedTemplate,
    viewMode,
    templates: equipmentTemplates,
    getSelectedTemplate,
    setSelectedTemplate,
    setViewMode,
    getSelectedEquipmentPoints,
    selectedPoints,
    togglePointSelection,
    clearPointSelection,
    setShowPointConfigModal,
    showPointConfigModal,
    getSelectedPointsData,
    equipmentMappings,
    recordPointEdit,
    fetchEquipmentTemplates
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [unitsFilter, setUnitsFilter] = useState('');
  const [objectTypeFilter, setObjectTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  const points = getSelectedEquipmentPoints();
  const selectedPointsData = getSelectedPointsData();
  const isMappedEquipment = equipmentMappings?.some(m => m.bacnetEquipmentId === selectedEquipment?.id) || false;

  // Fetch templates when component mounts
  React.useEffect(() => {
    fetchEquipmentTemplates();
  }, [fetchEquipmentTemplates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setShowTemplateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleCreateTemplate = () => {
    if (selectedPoints.size > 0) {
      // Always go directly to the point configuration modal
      setShowPointConfigModal(true);
    }
  };

  const createMappingTemplateFromCurrentMapping = async () => {
    if (!selectedEquipment || !isMappedEquipment) {
      alert('Equipment must be mapped to create a mapping template');
      return;
    }

    // Find the mapping for this equipment
    const mapping = equipmentMappings?.find(m => m.bacnetEquipmentId === selectedEquipment.id);
    if (!mapping) {
      alert('Could not find equipment mapping');
      return;
    }

    // Find the CxAlloy equipment
    const { cxAlloyEquipment } = useAppStore.getState();
    const cxAlloyEq = cxAlloyEquipment.find(eq => eq.id === mapping.cxAlloyEquipmentId);
    if (!cxAlloyEq) {
      alert('Could not find CxAlloy equipment');
      return;
    }

    // Get selected points data
    const selectedPointsData = getSelectedPointsData();

    // Prompt for template name
    const templateName = prompt('Enter a name for this mapping template:', `${cxAlloyEq.type} - ${cxAlloyEq.name} Template`);
    if (!templateName?.trim()) return;

    const templateDescription = prompt('Enter a description (optional):', `Template based on ${selectedEquipment.name} → ${cxAlloyEq.name} mapping with ${selectedPointsData.length} tracked points`);

    try {
      const { UnifiedTemplateService } = await import('../../lib/services/unified-template-service');
      const template = await UnifiedTemplateService.createTemplateFromMappedEquipment(
        cxAlloyEq,
        selectedEquipment,
        selectedPointsData,
        templateName,
        templateDescription || undefined,
        'user'
      );

      console.log('[PointDetails] Mapping template created:', template);
      alert(`Mapping template "${templateName}" created successfully! You can now use it in Bulk Mapping.`);
      
      // Refresh templates in the store
      fetchEquipmentTemplates();
    } catch (error) {
      console.error('[PointDetails] Error creating mapping template:', error);
      alert('Failed to create mapping template. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setShowPointConfigModal(false);
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
        {/* Equipment Info with Template Controls */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedEquipment.name}
              </h2>
              
              {/* Template Pill/Dropdown */}
              <div className="relative" ref={templateDropdownRef}>
                {!showTemplateDropdown ? (
                  // Template Pill
                  <button
                    onClick={() => setShowTemplateDropdown(true)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      getSelectedTemplate() 
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {getSelectedTemplate()?.name || 'No Template'}
                  </button>
                ) : (
                  // Template Dropdown
                  <div className="absolute right-0 top-0 z-50 bg-white border border-border rounded-lg shadow-lg min-w-[200px]">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSelectedTemplate(null);
                          setShowTemplateDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                          !getSelectedTemplate() && "bg-muted font-medium"
                        )}
                      >
                        No Template
                      </button>
                      {equipmentTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            setShowTemplateDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                            getSelectedTemplate()?.id === template.id && "bg-muted font-medium"
                          )}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
          
          {/* Save as Template Button - Show when points are selected */}
          {selectedPoints.size > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateTemplate}
              className="flex-shrink-0"
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Template
            </Button>
          )}
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
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
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
                isTemplateActive={!!getSelectedTemplate()}
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
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateTemplate}
              >
                <Plus className="h-3 w-3 mr-1" />
                Configure
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Point Configuration Modal */}
      <PointConfigModal
        isOpen={showPointConfigModal}
        onClose={handleCloseModal}
        selectedPoints={selectedPointsData}
      />
    </div>
  );
} 