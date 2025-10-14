'use client';

import React from 'react';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { 
  ChevronDown, 
  ChevronRight,
  Settings,
  Plus,
  Copy,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import type { EquipmentTemplate } from '../../types/equipment';

interface TemplateGroupProps {
  type: string;
  templates: EquipmentTemplate[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTemplate: (template: EquipmentTemplate) => void;
  onEditTemplate: (template: EquipmentTemplate) => void;
  onDuplicateTemplate: (template: EquipmentTemplate) => void;
  onDeleteTemplate: (template: EquipmentTemplate) => void;
  selectedTemplateId?: string | null;
}

function TemplateGroup({
  type,
  templates,
  isExpanded,
  onToggle,
  onSelectTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  selectedTemplateId
}: TemplateGroupProps) {
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
          <Settings className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{type}</span>
        </div>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
          {templates.length}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border">
          {templates.map((template) => (
            <div
              key={template.id}
              className={cn(
                "p-3 border-b border-border last:border-b-0 last:rounded-b-lg",
                selectedTemplateId === template.id && "bg-primary/10 border-l-4 border-l-primary"
              )}
            >
              <button
                onClick={() => onSelectTemplate(template)}
                className="w-full text-left hover:bg-muted/30 p-2 -m-2 rounded transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-medium text-sm text-foreground flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    {template.name}
                  </div>
                  {template.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{template.requiredPoints?.length || 0} required points</span>
                    <span>•</span>
                    <span>{template.optionalPoints?.length || 0} optional points</span>
                    {template.effectiveness && (
                      <>
                        <span>•</span>
                        <span className={cn(
                          "font-medium",
                          template.effectiveness >= 0.8 ? "text-green-600" :
                          template.effectiveness >= 0.6 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {Math.round(template.effectiveness * 100)}% effective
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
              
              {/* Template Actions */}
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditTemplate(template)}
                  className="h-7 px-2 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicateTemplate(template)}
                  className="h-7 px-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteTemplate(template)}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateListProps {
  onCreateTemplate: () => void;
  onEditTemplate: (template: EquipmentTemplate) => void;
}

export function TemplateList({ onCreateTemplate, onEditTemplate }: TemplateListProps) {
  const {
    searchTerm,
    getTemplatesByType,
    getFilteredTemplates
  } = useAppStore();

  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  const templatesByType = getTemplatesByType();
  const filteredTemplates = getFilteredTemplates();

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
      filteredTemplates.forEach(template => {
        if (template.equipmentType) typesWithResults.add(template.equipmentType);
      });
      setExpandedGroups(typesWithResults);
    }
  }, [searchTerm, filteredTemplates]);

  const handleSelectTemplate = (template: EquipmentTemplate) => {
    setSelectedTemplate(template.id);
  };

  const handleEditTemplate = (template: EquipmentTemplate) => {
    onEditTemplate(template);
  };

  const handleDuplicateTemplate = (template: EquipmentTemplate) => {
    // Create a copy of the template with a new ID and modified name
    const duplicatedTemplate: EquipmentTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // This would typically be handled by calling the API or parent component
    console.log('Duplicate template:', duplicatedTemplate);
  };

  const handleDeleteTemplate = (template: EquipmentTemplate) => {
    if (showDeleteConfirm === template.id) {
      // TODO: Implement removeEquipmentTemplate in store
      // removeEquipmentTemplate(template.id);
      console.log('Delete template:', template.id);
      setShowDeleteConfirm(null);
      if (selectedTemplate === template.id) {
        setSelectedTemplate(null);
      }
    } else {
      setShowDeleteConfirm(template.id);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Create Template Button */}
      <Button
        onClick={onCreateTemplate}
        className="w-full"
        variant="default"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create New Template
      </Button>

      {/* Template Groups */}
      {Object.entries(templatesByType).length === 0 ? (
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No templates available</p>
          <p className="text-sm text-muted-foreground">Create your first template to get started</p>
        </div>
      ) : (
        Object.entries(templatesByType).map(([type, templates]) => {
          const filteredForType = searchTerm 
            ? templates.filter(template => 
                template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                template.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : templates;

          if (searchTerm && filteredForType.length === 0) return null;

          return (
            <TemplateGroup
              key={type}
              type={type}
              templates={filteredForType as any}
              isExpanded={expandedGroups.has(type)}
              onToggle={() => toggleGroup(type)}
              onSelectTemplate={handleSelectTemplate}
              onEditTemplate={handleEditTemplate}
              onDuplicateTemplate={handleDuplicateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              selectedTemplateId={selectedTemplate}
            />
          );
        })
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-50">
          <p className="text-sm text-foreground mb-2">
            Click delete again to confirm removal
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 