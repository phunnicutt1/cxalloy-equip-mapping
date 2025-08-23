'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppStore } from '../../store/app-store';
import { EquipmentType, type EquipmentTemplate } from '../../types/equipment';
import { NormalizedPoint, PointFunction } from '../../types/normalized';
import { BACnetObjectType } from '../../types/point';
import { 
  X,
  CheckCircle2,
  Settings,
  FileText,
  Save,
  AlertCircle,
  Plus,
  Target
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PointConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPoints: NormalizedPoint[];
}

interface PointConfig {
  pointId: string;
  name: string;
  description: string;
  pointFunction: PointFunction;
  objectType?: BACnetObjectType;
  units?: string;
  isRequired: boolean;
  isIncluded: boolean;
}

export function PointConfigModal({ isOpen, onClose, selectedPoints }: PointConfigModalProps) {
  const { 
    addEquipmentTemplate, 
    selectedEquipment,
    clearPointSelection,
    setShowPointConfigModal,
    setSelectedTemplate 
  } = useAppStore();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  // Template form state
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    description: '',
    equipmentType: '' as EquipmentType,
    category: ''
  });
  
  // Point configurations
  const [pointConfigs, setPointConfigs] = React.useState<PointConfig[]>([]);

  // Initialize point configurations when modal opens or points change
  React.useEffect(() => {
    if (isOpen && selectedPoints.length > 0) {
      const configs = selectedPoints.map(point => ({
        pointId: point.originalPointId || point.originalName,
        name: point.normalizedName || point.originalName,
        description: point.expandedDescription || point.originalDescription || '',
        pointFunction: point.pointFunction || PointFunction.Sensor,
        objectType: point.objectType as BACnetObjectType,
        units: point.units,
        isRequired: true, // Default to required
        isIncluded: true // Default to included
      }));
      setPointConfigs(configs);
      
      // Auto-suggest template name from equipment
      if (selectedEquipment) {
        setTemplateForm(prev => ({
          ...prev,
          name: `${selectedEquipment.name} Template`,
          equipmentType: selectedEquipment.type as EquipmentType || EquipmentType.UNKNOWN,
          category: selectedEquipment.vendor || 'Custom'
        }));
      }
    }
  }, [isOpen, selectedPoints, selectedEquipment]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!templateForm.name.trim()) {
      newErrors.templateName = 'Template name is required';
    }
    
    if (!templateForm.equipmentType) {
      newErrors.equipmentType = 'Equipment type is required';
    }
    
    const includedPoints = pointConfigs.filter(config => config.isIncluded);
    if (includedPoints.length === 0) {
      newErrors.points = 'At least one point must be included in the template';
    }
    
    // Validate point names
    includedPoints.forEach(config => {
      if (!config.name.trim()) {
        newErrors[`point_${config.pointId}_name`] = 'Point name is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const includedPoints = pointConfigs.filter(config => config.isIncluded);
      const requiredPoints = includedPoints.filter(config => config.isRequired);
      const optionalPoints = includedPoints.filter(config => !config.isRequired);
      
      const templateData: EquipmentTemplate = {
        id: `template_${Date.now()}`,
        name: templateForm.name,
        description: templateForm.description,
        equipmentType: templateForm.equipmentType,
        category: templateForm.category,
        requiredPoints: requiredPoints.map(config => ({
          id: config.pointId,
          name: config.name,
          description: config.description,
          pointFunction: config.pointFunction,
          objectType: config.objectType,
          units: config.units
        })),
        optionalPoints: optionalPoints.map(config => ({
          id: config.pointId,
          name: config.name,
          description: config.description,
          pointFunction: config.pointFunction,
          objectType: config.objectType,
          units: config.units
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        effectiveness: 0,
        isBuiltIn: false
      };
      
      addEquipmentTemplate(templateData);
      
      // Auto-apply the newly created template
      setSelectedTemplate(templateData.id);
      
      clearPointSelection();
      setShowPointConfigModal(false);
      onClose();
    } catch (error) {
      console.error('Failed to create template:', error);
      setErrors({ submit: 'Failed to create template. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePointConfig = (pointId: string, updates: Partial<PointConfig>) => {
    setPointConfigs(configs => configs.map(config => 
      config.pointId === pointId ? { ...config, ...updates } : config
    ));
  };

  const toggleAllPoints = (included: boolean) => {
    setPointConfigs(configs => configs.map(config => ({ ...config, isIncluded: included })));
  };

  const setAllRequired = (required: boolean) => {
    setPointConfigs(configs => configs.map(config => 
      config.isIncluded ? { ...config, isRequired: required } : config
    ));
  };

  const includedCount = pointConfigs.filter(config => config.isIncluded).length;
  const requiredCount = pointConfigs.filter(config => config.isIncluded && config.isRequired).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create Template from Selected Points
          </DialogTitle>
          <DialogDescription>
            Configure {selectedPoints.length} selected points to create a custom equipment template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Information</CardTitle>
              <CardDescription>Basic template details and categorization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Template name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className={errors.templateName ? 'border-destructive' : ''}
                  />
                  {errors.templateName && <p className="text-sm text-destructive mt-1">{errors.templateName}</p>}
                </div>
                
                <div>
                  <Select 
                    value={templateForm.equipmentType} 
                    onValueChange={(value) => setTemplateForm({ ...templateForm, equipmentType: value as EquipmentType })}
                  >
                    <SelectTrigger className={errors.equipmentType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Equipment Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EquipmentType).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.equipmentType && <p className="text-sm text-destructive mt-1">{errors.equipmentType}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Category (optional)"
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                />
                
                <Input
                  placeholder="Template description (optional)"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Point Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Point Configuration</CardTitle>
                  <CardDescription>
                    Configure {selectedPoints.length} selected points • {includedCount} included • {requiredCount} required
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPoints(true)}
                  >
                    Include All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPoints(false)}
                  >
                    Exclude All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllRequired(true)}
                  >
                    All Required
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllRequired(false)}
                  >
                    All Optional
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {errors.points && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{errors.points}</p>
                </div>
              )}
              
              {pointConfigs.map((config) => (
                <Card key={config.pointId} className={cn(
                  "p-4 transition-all",
                  config.isIncluded ? "bg-background border-border" : "bg-muted/30 border-muted"
                )}>
                  <div className="space-y-3">
                    {/* Point Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updatePointConfig(config.pointId, { isIncluded: !config.isIncluded })}
                          className="flex-shrink-0"
                        >
                          <CheckCircle2 className={cn(
                            "h-5 w-5 transition-colors",
                            config.isIncluded ? "text-green-600" : "text-muted-foreground"
                          )} />
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {selectedPoints.find(p => (p.originalPointId || p.originalName) === config.pointId)?.originalName}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={config.isRequired ? "default" : "secondary"}>
                          {config.isRequired ? 'Required' : 'Optional'}
                        </Badge>
                        {config.objectType && (
                          <Badge variant="outline">{config.objectType}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Point Configuration */}
                    {config.isIncluded && (
                      <div className="grid grid-cols-4 gap-3 pl-8">
                        <div>
                          <Input
                            placeholder="Point name"
                            value={config.name}
                            onChange={(e) => updatePointConfig(config.pointId, { name: e.target.value })}
                            className={errors[`point_${config.pointId}_name`] ? 'border-destructive' : ''}
                          />
                          {errors[`point_${config.pointId}_name`] && (
                            <p className="text-xs text-destructive mt-1">{errors[`point_${config.pointId}_name`]}</p>
                          )}
                        </div>
                        
                        <Select 
                          value={config.pointFunction} 
                          onValueChange={(value) => updatePointConfig(config.pointId, { pointFunction: value as PointFunction })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(PointFunction).map(func => (
                              <SelectItem key={func} value={func}>{func}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Input
                          placeholder="Units"
                          value={config.units || ''}
                          onChange={(e) => updatePointConfig(config.pointId, { units: e.target.value })}
                        />
                        
                        <Select 
                          value={config.isRequired ? 'required' : 'optional'} 
                          onValueChange={(value) => updatePointConfig(config.pointId, { isRequired: value === 'required' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || includedCount === 0}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating Template...' : `Create Template (${includedCount} points)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 