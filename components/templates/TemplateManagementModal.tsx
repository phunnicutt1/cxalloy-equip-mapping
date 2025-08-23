'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Copy, Trash2, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MappingTemplate, TemplateMatchingOptions } from '../../types/template-mapping';
import { CxAlloyEquipment, Equipment } from '../../types/equipment';
import { NormalizedPoint } from '../../types/normalized';
import { TemplateMappingService } from '../../lib/services/template-mapping-service';
import { useAppStore } from '../../store/app-store';

interface TemplateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated?: (template: MappingTemplate) => void;
}

export const TemplateManagementModal: React.FC<TemplateManagementModalProps> = ({
  isOpen,
  onClose,
  onTemplateCreated
}) => {
  const { getMappedCxAlloyEquipment, equipmentMappings, equipment } = useAppStore();
  
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MappingTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    sourceEquipmentId: '',
    templateName: '',
    templateDescription: ''
  });
  const [loading, setLoading] = useState(false);

  const mappedCxAlloyEquipment = getMappedCxAlloyEquipment();

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await TemplateMappingService.getTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!createForm.sourceEquipmentId || !createForm.templateName.trim()) {
      return;
    }

    setLoading(true);
    try {
      const selectedCxAlloyEquipment = mappedCxAlloyEquipment.find(
        eq => eq.id.toString() === createForm.sourceEquipmentId
      );
      
      if (!selectedCxAlloyEquipment) {
        throw new Error('Selected equipment not found');
      }

      // Find the corresponding BACnet equipment and its points
      const mapping = equipmentMappings.find(m => m.cxalloyEquipmentId === selectedCxAlloyEquipment.id);
      if (!mapping) {
        throw new Error('Equipment mapping not found');
      }

      const bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);
      if (!bacnetEquipment) {
        throw new Error('BACnet equipment not found');
      }

      const bacnetPoints = bacnetEquipment.points || [];

      const template = await TemplateMappingService.createTemplateFromMappedEquipment(
        selectedCxAlloyEquipment,
        bacnetEquipment,
        bacnetPoints,
        createForm.templateName,
        createForm.templateDescription,
        'user'
      );

      await loadTemplates();
      setCreateForm({ sourceEquipmentId: '', templateName: '', templateDescription: '' });
      setIsCreating(false);
      
      if (onTemplateCreated) {
        onTemplateCreated(template);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await TemplateMappingService.deleteTemplate(templateId);
      await loadTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Template Management</h2>
            <p className="text-gray-600 mt-1">Create and manage mapping templates from existing equipment mappings</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Template List */}
          <div className="w-1/2 border-r">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Available Templates</h3>
                <Button
                  onClick={() => setIsCreating(true)}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus size={16} />
                  New Template
                </Button>
              </div>

              {/* Create Template Form */}
              {isCreating && (
                <div className="space-y-3 p-3 bg-white rounded border">
                  <div>
                    <Label htmlFor="sourceEquipment">Source Equipment (Mapped)</Label>
                    <Select value={createForm.sourceEquipmentId} onValueChange={(value) => 
                      setCreateForm(prev => ({ ...prev, sourceEquipmentId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mapped CxAlloy equipment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mappedCxAlloyEquipment.map(eq => (
                          <SelectItem key={eq.id} value={eq.id.toString()}>
                            {eq.name} ({eq.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={createForm.templateName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, templateName: e.target.value }))}
                      placeholder="Enter template name..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="templateDescription">Description (Optional)</Label>
                    <Input
                      id="templateDescription"
                      value={createForm.templateDescription}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, templateDescription: e.target.value }))}
                      placeholder="Describe this template..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateTemplate} 
                      disabled={loading || !createForm.sourceEquipmentId || !createForm.templateName.trim()}
                      size="sm"
                    >
                      {loading ? 'Creating...' : 'Create Template'}
                    </Button>
                    <Button 
                      onClick={() => setIsCreating(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-y-auto h-full">
              {templates.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Copy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No templates created yet</p>
                  <p className="text-sm">Create templates from mapped equipment to reuse point configurations</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {template.equipmentType} • {template.pointMappings.length} points
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Used {template.usageCount} times • {Math.round(template.successRate * 100)}% success
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Details */}
          <div className="w-1/2">
            {selectedTemplate ? (
              <div className="h-full overflow-y-auto">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Source: {selectedTemplate.sourceEquipmentName}</span>
                    <span>Type: {selectedTemplate.equipmentType}</span>
                    <span>Points: {selectedTemplate.pointMappings.length}</span>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-medium mb-3">Point Mappings</h4>
                  <div className="space-y-2">
                    {selectedTemplate.pointMappings.map((mapping, index) => (
                      <div key={mapping.id} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{mapping.navName}</span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">{mapping.bacnetCur}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{mapping.bacnetDesc}</div>
                        {mapping.units && (
                          <div className="text-xs text-blue-600 mt-1">Units: {mapping.units}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                  <div className="text-xs text-gray-500">
                    Created by {selectedTemplate.createdBy} on {selectedTemplate.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Select a template to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};