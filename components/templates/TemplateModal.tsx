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
import { PointFunction } from '../../types/normalized';
import { BACnetObjectType } from '../../types/point';
import { 
  X,
  Plus,
  Settings,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: EquipmentTemplate | null;
  mode: 'create' | 'edit';
}

interface PointTemplateForm {
  id: string;
  name: string;
  description: string;
  pointFunction: PointFunction;
  objectType?: BACnetObjectType;
  units?: string;
  isRequired: boolean;
}

export function TemplateModal({ isOpen, onClose, template, mode }: TemplateModalProps) {
  const { addEquipmentTemplate, updateEquipmentTemplate } = useAppStore();
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    equipmentType: '' as EquipmentType,
    category: ''
  });
  
  const [requiredPoints, setRequiredPoints] = React.useState<PointTemplateForm[]>([]);
  const [optionalPoints, setOptionalPoints] = React.useState<PointTemplateForm[]>([]);

  // Initialize form with template data when editing
  React.useEffect(() => {
    if (template && mode === 'edit') {
      setFormData({
        name: template.name,
        description: template.description || '',
        equipmentType: template.equipmentType,
        category: template.category || ''
      });
      
      setRequiredPoints(template.requiredPoints?.map(point => ({
        id: point.id || `req_${Date.now()}_${Math.random()}`,
        name: point.name,
        description: point.description || '',
        pointFunction: point.pointFunction,
        objectType: point.objectType,
        units: point.units,
        isRequired: true
      })) || []);
      
      setOptionalPoints(template.optionalPoints?.map(point => ({
        id: point.id || `opt_${Date.now()}_${Math.random()}`,
        name: point.name,
        description: point.description || '',
        pointFunction: point.pointFunction,
        objectType: point.objectType,
        units: point.units,
        isRequired: false
      })) || []);
    } else {
      // Reset form for new template
      setFormData({
        name: '',
        description: '',
        equipmentType: '' as EquipmentType,
        category: ''
      });
      setRequiredPoints([]);
      setOptionalPoints([]);
    }
    setErrors({});
  }, [template, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (!formData.equipmentType) {
      newErrors.equipmentType = 'Equipment type is required';
    }
    
    if (requiredPoints.length === 0) {
      newErrors.requiredPoints = 'At least one required point is needed';
    }
    
    // Validate all points
    [...requiredPoints, ...optionalPoints].forEach((point, index) => {
      if (!point.name.trim()) {
        newErrors[`point_${point.id}_name`] = 'Point name is required';
      }
      if (!point.pointFunction) {
        newErrors[`point_${point.id}_function`] = 'Point function is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const templateData: EquipmentTemplate = {
        id: template?.id || `template_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        equipmentType: formData.equipmentType,
        category: formData.category,
        requiredPoints: requiredPoints.map(point => ({
          id: point.id,
          name: point.name,
          description: point.description,
          pointFunction: point.pointFunction,
          objectType: point.objectType,
          units: point.units
        })),
        optionalPoints: optionalPoints.map(point => ({
          id: point.id,
          name: point.name,
          description: point.description,
          pointFunction: point.pointFunction,
          objectType: point.objectType,
          units: point.units
        })),
        createdAt: template?.createdAt || new Date(),
        updatedAt: new Date(),
        effectiveness: template?.effectiveness || 0
      };
      
      if (mode === 'create') {
        addEquipmentTemplate(templateData);
      } else {
        updateEquipmentTemplate(templateData.id, templateData);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors({ submit: 'Failed to save template. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const addPoint = (isRequired: boolean) => {
    const newPoint: PointTemplateForm = {
      id: `${isRequired ? 'req' : 'opt'}_${Date.now()}_${Math.random()}`,
      name: '',
      description: '',
      pointFunction: PointFunction.Sensor,
      isRequired
    };
    
    if (isRequired) {
      setRequiredPoints([...requiredPoints, newPoint]);
    } else {
      setOptionalPoints([...optionalPoints, newPoint]);
    }
  };

  const updatePoint = (id: string, updates: Partial<PointTemplateForm>, isRequired: boolean) => {
    if (isRequired) {
      setRequiredPoints(points => points.map(point => 
        point.id === id ? { ...point, ...updates } : point
      ));
    } else {
      setOptionalPoints(points => points.map(point => 
        point.id === id ? { ...point, ...updates } : point
      ));
    }
  };

  const removePoint = (id: string, isRequired: boolean) => {
    if (isRequired) {
      setRequiredPoints(points => points.filter(point => point.id !== id));
    } else {
      setOptionalPoints(points => points.filter(point => point.id !== id));
    }
  };

  const PointEditor = ({ point, isRequired }: { point: PointTemplateForm; isRequired: boolean }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <Badge variant={isRequired ? "default" : "secondary"}>
            {isRequired ? 'Required' : 'Optional'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removePoint(point.id, isRequired)}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid gap-3">
        <div>
          <Input
            placeholder="Point name (e.g., Room Temperature)"
            value={point.name}
            onChange={(e) => updatePoint(point.id, { name: e.target.value }, isRequired)}
            className={errors[`point_${point.id}_name`] ? 'border-destructive' : ''}
          />
          {errors[`point_${point.id}_name`] && (
            <p className="text-sm text-destructive mt-1">{errors[`point_${point.id}_name`]}</p>
          )}
        </div>
        
        <Input
          placeholder="Description (optional)"
          value={point.description}
          onChange={(e) => updatePoint(point.id, { description: e.target.value }, isRequired)}
        />
        
        <div className="grid grid-cols-2 gap-2">
          <Select 
            value={point.pointFunction} 
            onValueChange={(value) => updatePoint(point.id, { pointFunction: value as PointFunction }, isRequired)}
          >
            <SelectTrigger className={errors[`point_${point.id}_function`] ? 'border-destructive' : ''}>
              <SelectValue placeholder="Point Function" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PointFunction).map(func => (
                <SelectItem key={func} value={func}>{func}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={point.objectType || ''} 
            onValueChange={(value) => updatePoint(point.id, { objectType: value as BACnetObjectType }, isRequired)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Object Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(BACnetObjectType).map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Input
          placeholder="Units (e.g., °F, %, kW)"
          value={point.units || ''}
          onChange={(e) => updatePoint(point.id, { units: e.target.value }, isRequired)}
        />
      </div>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {mode === 'create' ? 'Create New Template' : 'Edit Template'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Define a new equipment template with required and optional points'
              : 'Modify the existing template configuration'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Template name, type, and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Template name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select 
                    value={formData.equipmentType} 
                    onValueChange={(value) => setFormData({ ...formData, equipmentType: value as EquipmentType })}
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
                
                <Input
                  placeholder="Category (optional)"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              
              <Input
                placeholder="Template description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Required Points */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Required Points</CardTitle>
                  <CardDescription>Points that must be present in equipment</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPoint(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Required Point
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.requiredPoints && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{errors.requiredPoints}</p>
                </div>
              )}
              {requiredPoints.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No required points defined. Add at least one required point.
                </p>
              ) : (
                requiredPoints.map(point => (
                  <PointEditor key={point.id} point={point} isRequired={true} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Optional Points */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Optional Points</CardTitle>
                  <CardDescription>Points that may be present in equipment</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPoint(false)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Optional Point
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {optionalPoints.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No optional points defined. You can add optional points to improve template flexibility.
                </p>
              ) : (
                optionalPoints.map(point => (
                  <PointEditor key={point.id} point={point} isRequired={false} />
                ))
              )}
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
          <Button onClick={handleSubmit} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Template' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 