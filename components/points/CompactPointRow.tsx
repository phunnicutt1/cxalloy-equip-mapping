'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { NormalizedPoint } from '../../types/normalized';
import { PointCategory } from '../../types/point';
import { 
  ChevronDown,
  ChevronRight,
  Gauge,
  ToggleLeft,
  Zap,
  FileText,
  Target,
  Edit3,
  Check,
  X,
  ExternalLink
} from 'lucide-react';

interface CompactPointRowProps {
  point: NormalizedPoint;
  index: number;
  isSelected: boolean;
  isMapped: boolean;
  isTemplateActive?: boolean;
  onTrackPoint: (pointId: string) => void;
  onUpdateNavName?: (pointId: string, newNavName: string) => void;
  onUpdateUnits?: (pointId: string, newUnits: string) => void;
}

export function CompactPointRow({ 
  point, 
  index, 
  isSelected, 
  isMapped,
  isTemplateActive = false,
  onTrackPoint,
  onUpdateNavName,
  onUpdateUnits
}: CompactPointRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNavName, setEditingNavName] = useState(false);
  const [editingUnits, setEditingUnits] = useState(false);
  const [navNameValue, setNavNameValue] = useState(point.normalizedName || point.originalName || '');
  const [unitsValue, setUnitsValue] = useState(point.units || '');

  const getPointIcon = (objectType?: string) => {
    switch (objectType) {
      case 'AI':
      case 'AV':
        return <Gauge className="h-3 w-3 text-blue-500" />;
      case 'AO':
        return <Zap className="h-3 w-3 text-orange-500" />;
      case 'BI':
      case 'BV':
        return <ToggleLeft className="h-3 w-3 text-green-500" />;
      case 'BO':
        return <ToggleLeft className="h-3 w-3 text-red-500" />;
      default:
        return <FileText className="h-3 w-3 text-gray-500" />;
    }
  };

  const handleSaveNavName = () => {
    if (onUpdateNavName && navNameValue !== (point.normalizedName || point.originalName)) {
      onUpdateNavName(point.originalPointId || point.originalName, navNameValue);
    }
    setEditingNavName(false);
  };

  const handleSaveUnits = () => {
    if (onUpdateUnits && unitsValue !== point.units) {
      onUpdateUnits(point.originalPointId || point.originalName, unitsValue);
    }
    setEditingUnits(false);
  };

  const handleCancelNavName = () => {
    setNavNameValue(point.normalizedName || point.originalName || '');
    setEditingNavName(false);
  };

  const handleCancelUnits = () => {
    setUnitsValue(point.units || '');
    setEditingUnits(false);
  };

  // Check if point has been modified from original
  const isModified = (point.normalizedName && point.normalizedName !== point.originalName) ||
                    (point.units && point.units !== point.originalDescription);

  return (
    <div 
      className={cn(
        "border-b border-border transition-all duration-200 w-full",
        index % 2 === 0 ? "bg-background" : "bg-muted/10",
        isSelected && "bg-blue-50 border-l-4 border-l-blue-500",
        isMapped && "bg-green-50/50"
      )}
    >
      {/* Compact Main Row */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 w-full">
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Point Icon */}
        <div className="flex-shrink-0">
          {getPointIcon(point.objectType)}
        </div>

        {/* NavName (Editable) - Left Aligned */}
        <div className="flex-1 min-w-0 text-left">
          {editingNavName && isMapped ? (
            <div className="flex items-center gap-1">
              <Input
                value={navNameValue}
                onChange={(e) => setNavNameValue(e.target.value)}
                className="h-6 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNavName();
                  if (e.key === 'Escape') handleCancelNavName();
                }}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveNavName} className="h-6 w-6 p-0">
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelNavName} className="h-6 w-6 p-0">
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-sm font-medium truncate",
                isModified && "text-blue-600"
              )}>
                {navNameValue}
              </span>
              {isModified && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" title="Modified from original" />
              )}
              {isMapped && onUpdateNavName && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingNavName(true)}
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* BACnet Object (bacnetCur) - Left Aligned */}
        <div className="flex-shrink-0 w-16 text-left">
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">
            {point.objectType}{point.objectInstance || ''}
          </span>
        </div>

        {/* BACnet Description (bacnetDesc) - Left Aligned */}
        <div className="flex-1 min-w-0 max-w-[250px] text-left">
          <span className="text-xs text-muted-foreground truncate block" title={point.expandedDescription || point.originalDescription}>
            {point.expandedDescription || point.originalDescription || 'No description'}
          </span>
        </div>

        {/* Units (Editable) - Left Aligned */}
        <div className="flex-shrink-0 w-16 text-left">
          {editingUnits && isMapped ? (
            <div className="flex items-center gap-1">
              <Input
                value={unitsValue}
                onChange={(e) => setUnitsValue(e.target.value)}
                className="h-6 text-xs w-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveUnits();
                  if (e.key === 'Escape') handleCancelUnits();
                }}
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveUnits} className="h-6 w-6 p-0">
                <Check className="h-3 w-3 text-green-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground min-w-0 truncate">
                {unitsValue || '-'}
              </span>
              {isMapped && onUpdateUnits && unitsValue && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingUnits(true)}
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Track Button - Right Aligned */}
        <div className="flex-shrink-0 ml-auto">
          {isTemplateActive ? (
            // When template is active, show all points as tracked with visual indicator
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200">
              <Target className="h-3 w-3" />
              <span className="text-xs font-medium">Tracked</span>
            </div>
          ) : (
            <Button
              size="sm"
              variant={isSelected ? "default" : "ghost"}
              onClick={() => onTrackPoint(point.originalPointId || point.originalName)}
              className="h-6 text-xs px-2"
            >
              <Target className="h-3 w-3 mr-1" />
              {isSelected ? 'Tracked' : 'Track'}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-8 pb-3 space-y-2 bg-muted/20 border-t border-border/50">
          {/* BACnet Description */}
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground min-w-16">Description:</span>
            <span className="text-xs text-foreground flex-1">
              {point.expandedDescription || point.originalDescription || 'No description available'}
            </span>
          </div>

          {/* Original vs Current Name */}
          {point.normalizedName && point.normalizedName !== point.originalName && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-16">Original:</span>
              <span className="text-xs text-muted-foreground font-mono flex-1">
                {point.originalName}
              </span>
            </div>
          )}

          {/* Additional Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Data Type:</span>
              <span className="text-foreground">{point.dataType || 'Unknown'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Category:</span>
              <span className="text-foreground">{point.category || 'Unknown'}</span>
            </div>
          </div>

          {/* Haystack Tags */}
          {point.haystackTags && point.haystackTags.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-16">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {point.haystackTags.slice(0, 8).map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200"
                  >
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
                {point.haystackTags.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{point.haystackTags.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}