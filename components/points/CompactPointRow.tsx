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
  Info,
  Tag,
  Database
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
  const [showTooltip, setShowTooltip] = useState(false);
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
        "border-b border-border transition-all duration-300 w-full group relative",
        index % 2 === 0 ? "bg-background" : "bg-muted/10",
        isSelected && "bg-blue-50 border-l-4 border-l-blue-500 animate-in fade-in duration-500",
        isMapped && "bg-green-50/50 animate-in fade-in duration-300"
      )}
    >
      {/* Compact Main Row */}
      <div className="flex items-center gap-2 px-3 py-2 w-full transition-all duration-300 hover:bg-muted/20">
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-muted rounded transition-all duration-300 flex-shrink-0 hover:scale-110"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground transition-all duration-300" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground transition-all duration-300 hover:translate-x-0.5" />
          )}
        </button>

        {/* Point Icon */}
        <div className="flex-shrink-0 transition-all duration-300 hover:scale-110">
          {getPointIcon(point.objectType)}
        </div>

        {/* Column 1: NavName (Editable) - 25% width */}
        <div className="w-1/4 min-w-0 text-left relative pr-2">
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
              <span 
                className={cn(
                  "text-sm font-medium truncate transition-all duration-200 cursor-help",
                  isModified && "text-blue-600 animate-pulse"
                )}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                {navNameValue}
              </span>
              {isModified && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" title="Modified from original" />
              )}
              {isMapped && onUpdateNavName && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingNavName(true)}
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-blue-50"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Column 2: BACnet Object - 25% width */}
        <div className="w-1/4 text-left pr-2">
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded transition-all duration-200 hover:bg-slate-200 hover:scale-105">
            {point.objectType}{point.objectInstance || ''}
          </span>
        </div>

        {/* Column 3: BACnet Description - 25% width */}
        <div className="w-1/4 min-w-0 text-left pr-2">
          <span className="text-xs text-muted-foreground truncate block" title={point.expandedDescription || point.originalDescription}>
            {point.expandedDescription || point.originalDescription || 'No description'}
          </span>
        </div>

        {/* Column 4: Units - 25% width */}
        <div className="w-1/4 text-left pr-2">
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
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded border border-green-200 animate-in fade-in scale-in-95 duration-500 shadow-sm">
              <Target className="h-3 w-3 animate-pulse" />
              <span className="text-xs font-medium">Tracked</span>
            </div>
          ) : (
            <Button
              size="sm"
              variant={isSelected ? "default" : "ghost"}
              onClick={() => onTrackPoint(point.originalPointId || point.originalName)}
              className={cn(
                "h-6 text-xs px-2 transition-all duration-300 hover:scale-105 hover:shadow-md",
                isSelected && "animate-in fade-in scale-in-95 duration-500 shadow-sm"
              )}
            >
              <Target className={cn(
                "h-3 w-3 mr-1 transition-all duration-300",
                isSelected ? "animate-pulse text-white" : "group-hover:scale-110 group-hover:rotate-12"
              )} />
              {isSelected ? 'Tracked' : 'Track'}
            </Button>
          )}
        </div>
      </div>

      {/* Tooltip on Name Hover */}
      {showTooltip && !editingNavName && !isExpanded && (
        <div className={cn(
          "absolute left-32 -top-2 z-50 w-96 p-3 bg-white/98 backdrop-blur-sm rounded-lg shadow-2xl border border-border",
          "animate-in fade-in slide-in-from-left-2 duration-200",
          "before:absolute before:top-4 before:-left-2 before:w-4 before:h-4 before:bg-white before:border-l before:border-b before:border-border before:rotate-45"
        )}>
          <div className="space-y-2.5 text-xs">
            {/* Original BACnet Name */}
            <div className="bg-slate-50 p-2 rounded">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  <Database className="h-3 w-3 text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-700 mb-1">Original BACnet Name:</div>
                  <div className="font-mono text-slate-600 break-all">{point.originalName}</div>
                  {point.originalDescription && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="text-slate-500 text-xs mb-0.5">Description:</div>
                      <div className="text-slate-600 text-xs leading-relaxed">{point.originalDescription}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Normalized Name & Confidence */}
            <div className="bg-blue-50 p-2 rounded">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  <Info className="h-3 w-3 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-blue-700">Normalized Name:</span>
                    {point.confidenceScore !== undefined && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        point.confidenceScore >= 0.8 ? "bg-green-100 text-green-700" :
                        point.confidenceScore >= 0.6 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {Math.round((point.confidenceScore || 0) * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-blue-600">{point.normalizedName || navNameValue}</div>
                  {point.commonName && point.commonName !== point.normalizedName && (
                    <div className="text-xs text-blue-500 mt-1">Common: {point.commonName}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Description */}
            {point.expandedDescription && point.expandedDescription !== point.originalDescription && (
              <div className="bg-indigo-50 p-2 rounded">
                <div className="flex items-start gap-2">
                  <FileText className="h-3 w-3 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-indigo-700 mb-1">Expanded Description:</div>
                    <div className="text-indigo-600 leading-relaxed">{point.expandedDescription}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Normalization Process Applied - Compact */}
            {(point.normalizationMethod || point.normalizationRules?.length > 0 || point.hasAcronymExpansion || point.hasUnitNormalization || point.hasContextInference) && (
              <div className="bg-amber-50 px-2 py-1.5 rounded">
                <div className="flex items-start gap-2">
                  <Zap className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="text-amber-700 font-medium">Applied: </span>
                    <span className="text-amber-600">
                      {[
                        point.normalizationMethod && point.normalizationMethod,
                        point.hasAcronymExpansion && "acronym expansion",
                        point.hasUnitNormalization && "unit normalization",
                        point.hasContextInference && "context inference",
                        ...(point.normalizationRules || [])
                      ].filter(Boolean).join(" • ")}
                    </span>
                    {point.requiresManualReview && (
                      <span className="text-orange-600 font-medium ml-1">⚠ Review needed</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Metadata */}
            <div className="flex items-center gap-4 pt-1.5 border-t border-border/50">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{point.dataType || 'Unknown'}</span>
              </div>
              {unitsValue && (
                <div className="flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-slate-500" />
                  <span className="text-muted-foreground">Units:</span>
                  <span className="font-medium">{unitsValue}</span>
                </div>
              )}
              {point.haystackTags && point.haystackTags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">{point.haystackTags.length} tags</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-8 pb-3 space-y-2 bg-muted/20 border-t border-border/50 animate-in slide-in-from-top-2 fade-in duration-300">
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
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 transition-all duration-200 hover:scale-105 hover:bg-blue-200"
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