'use client';

import React from 'react';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';
import { NormalizedPoint } from '../../types/normalized';
import { PointCategory } from '../../types/point';
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
  ToggleLeft
} from 'lucide-react';

interface PointRowProps {
  point: NormalizedPoint;
  index: number;
}

function PointRow({ point, index }: PointRowProps) {
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

          {/* Right: Unit and Object Type */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {point.units && getUnitDisplay(point.units)}
            {point.objectType && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono">
                {point.objectType}
              </span>
            )}
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
    setSelectedTemplate,
    setViewMode,
    getSelectedEquipmentPoints
  } = useAppStore();

  const points = getSelectedEquipmentPoints();

  if (!selectedEquipment) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <List className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Select Equipment</h3>
            <p className="text-muted-foreground">
              Choose equipment from the left panel to view point details
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="space-y-3">
          {/* Equipment Info */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {selectedEquipment.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedEquipment.description || 'Equipment details and point configuration'}
            </p>
          </div>

          {/* Equipment Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              <span>Type: {selectedEquipment.type}</span>
            </div>
            {selectedEquipment.vendor && (
              <div>Vendor: {selectedEquipment.vendor}</div>
            )}
            {selectedEquipment.model && (
              <div>Model: {selectedEquipment.model}</div>
            )}
            <div>{points.length} points</div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select
                value={viewMode.middle}
                onValueChange={(value: 'all-points' | 'template-points') => setViewMode('middle', value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-points">All Points</SelectItem>
                  <SelectItem value="template-points">Template Points</SelectItem>
                </SelectContent>
              </Select>

              {viewMode.middle === 'template-points' && (
                <Select
                  value={selectedTemplate || ''}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vav-standard">VAV Standard</SelectItem>
                    <SelectItem value="vav-reheat">VAV with Reheat</SelectItem>
                    <SelectItem value="ahu-basic">AHU Basic</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {points.length} points
            </div>
          </div>
        </div>
      </div>

      {/* Points List */}
      <div className="flex-1 overflow-y-auto">
        {points.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <Filter className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-foreground">No Points</h3>
                <p className="text-muted-foreground">
                  {viewMode.middle === 'template-points' 
                    ? 'No points match the selected template'
                    : 'This equipment has no points'
                  }
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {points.map((point, index) => (
              <PointRow 
                key={point.originalPointId || `${point.originalName}-${index}`} 
                point={point} 
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {points.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="space-x-4">
              <span>Points: {points.length}</span>
              <span>Normalized: {points.filter(p => p.normalizedName).length}</span>
              <span>Tagged: {points.filter(p => p.haystackTags && p.haystackTags.length > 0).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Sensor</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>Command</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Binary</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 