import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Equipment, 
  CxAlloyEquipment,
  EquipmentMapping 
} from '../types/equipment';
import type { UnifiedTemplate } from '../types/unified-template';
import type { NormalizedPoint } from '../types/normalized';
import type { AutoMappingResult, AutoMappingMatch } from '../lib/services/auto-mapping-service';

interface ViewMode {
  left: 'equipment' | 'templates';
  middle: 'all-points' | 'template-points';
  right: 'all' | 'mapped' | 'unmapped';
}

interface AppState {
  // Equipment Data
  equipment: Equipment[];
  selectedEquipment: Equipment | null;
  templates: UnifiedTemplate[];
  
  // CxAlloy Integration
  cxAlloyEquipment: CxAlloyEquipment[];
  equipmentMappings: EquipmentMapping[];
  
  // Template Management
  showTemplateManagementModal: boolean;
  
  // Auto-mapping State
  autoMappingResult: AutoMappingResult | null;
  autoMappingInProgress: boolean;
  
  // UI State
  viewMode: ViewMode;
  isLoading: boolean;
  searchTerm: string;
  equipmentTemplateMap: Record<string, string>; // equipment ID -> template ID
  
  // Point Selection State
  selectedPoints: Set<string>; // Point IDs selected for bulk operations
  trackedPointsByEquipment: Record<string, Set<string>>; // equipmentId -> Set of tracked point IDs
  showBulkApplyDialog: boolean;
  
  // Panel State
  leftPanelWidth: number;
  rightPanelWidth: number;
  showMobilePanels: {
    left: boolean;
    right: boolean;
  };
  
  // Actions
  setEquipment: (equipment: Equipment[]) => void;
  setSelectedEquipment: (equipment: Equipment | null) => Promise<void>;
  setCxAlloyEquipment: (equipment: CxAlloyEquipment[]) => void;
  setViewMode: (panel: keyof ViewMode, mode: ViewMode[keyof ViewMode]) => void;
  setSearchTerm: (term: string) => void;
  setSelectedTemplate: (templateId: string | null) => void;
  setEquipmentTemplate: (equipmentId: string, templateId: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Data Fetching
  fetchEquipment: (page: number, filters: Record<string, string>) => Promise<void>;
  
  // Panel Actions
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  toggleMobilePanel: (panel: 'left' | 'right') => void;
  
  // Equipment Actions
  addEquipmentMapping: (mapping: EquipmentMapping) => void;
  removeEquipmentMapping: (bacnetEquipmentId: string) => void;
  
  // Auto-mapping Actions
  performAutoMapping: () => Promise<AutoMappingResult | null>;
  applyExactMappings: (mappings: (AutoMappingMatch | EquipmentMapping)[]) => Promise<void>;
  applySuggestedMapping: (mapping: AutoMappingMatch) => void;
  clearAutoMappingResult: () => void;
  
  // Template Actions
  setTemplates: (templates: UnifiedTemplate[]) => void;
  addTemplate: (template: UnifiedTemplate) => void;
  updateTemplate: (templateId: string, updates: Partial<UnifiedTemplate>) => void;
  removeTemplate: (templateId: string) => void;
  fetchTemplates: () => Promise<void>;
  fetchEquipmentTemplates: () => Promise<void>; // Keep for backward compatibility
  
  // Template Mapping Actions
  setShowTemplateManagementModal: (show: boolean) => void;
  
  // Bulk Mapping Actions
  showBulkMappingModal: boolean;
  setShowBulkMappingModal: (show: boolean) => void;
  
  // Audit Trail Actions
  recordPointEdit: (
    pointId: string,
    equipmentId: string,
    equipmentName: string,
    changeType: 'navName' | 'units' | 'category' | 'mapping' | 'confidence',
    oldValue: string | number | null,
    newValue: string | number | null,
    source?: 'manual' | 'template' | 'auto-mapping' | 'bulk-operation'
  ) => Promise<void>;
  recordEquipmentMapping: (
    bacnetEquipmentId: string,
    bacnetEquipmentName: string,
    cxalloyEquipmentId: number,
    cxalloyEquipmentName: string,
    actionType: 'created' | 'updated' | 'deleted',
    source?: 'manual' | 'template' | 'auto-mapping' | 'bulk-operation',
    confidence?: number,
    pointMappingCount?: number,
    templateId?: string,
    templateName?: string
  ) => Promise<void>;
  
  // Point Selection Actions
  togglePointSelection: (pointId: string) => void;
  clearPointSelection: () => void;
  setShowBulkApplyDialog: (show: boolean) => void;
  getSelectedPointsData: () => NormalizedPoint[];
  
  // Computed Properties
  getEquipmentByType: () => Record<string, Equipment[]>;
  getFilteredEquipment: () => Equipment[];
  getSelectedEquipmentPoints: () => NormalizedPoint[];
  getMappedCxAlloyEquipment: () => CxAlloyEquipment[];
  getMappedCxAlloyForDataSource: (bacnetEquipmentId: string) => CxAlloyEquipment | null;
  getUnmappedCxAlloyEquipment: () => CxAlloyEquipment[];
  getTemplatesByType: () => Record<string, UnifiedTemplate[]>;
  getFilteredTemplates: () => UnifiedTemplate[];
  getSelectedTemplate: () => UnifiedTemplate | null;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial State
      equipment: [],
      selectedEquipment: null,
      templates: [],
      cxAlloyEquipment: [],
      equipmentMappings: [],
      
      // Template Management State
      showTemplateManagementModal: false,
      
      // Bulk Mapping State
      showBulkMappingModal: false,
      
      // Auto-mapping State
      autoMappingResult: null,
      autoMappingInProgress: false,
      
      viewMode: {
        left: 'equipment',
        middle: 'all-points',
        right: 'all'
      },
      
      isLoading: false,
      searchTerm: '',
      equipmentTemplateMap: {},
      
      // Point Selection State
      selectedPoints: new Set<string>(),
      trackedPointsByEquipment: {},
      showBulkApplyDialog: false,
      
      leftPanelWidth: 380,
      rightPanelWidth: 420,
      showMobilePanels: {
        left: false,
        right: false
      },
      
      // Basic Actions
      setEquipment: (equipment) => set({ equipment }),
      setSelectedEquipment: async (equipment) => {
        const currentState = get();
        
        // When switching between different equipment
        if (currentState.selectedEquipment?.id !== equipment?.id) {
          // Check if the NEW equipment being selected is mapped
          const isNewEquipmentMapped = equipment ? currentState.equipmentMappings.some(
            m => m.bacnetEquipmentId === equipment.id
          ) : false;
          
          if (isNewEquipmentMapped && equipment) {
            // Restore tracked points for this mapped equipment
            const trackedPoints = currentState.trackedPointsByEquipment[equipment.id] || new Set();
            set({ selectedPoints: new Set(trackedPoints) });
          } else {
            // Clear points for unmapped equipment or when no equipment selected
            set({ selectedPoints: new Set() });
          }
        }
        
        if (!equipment) {
          set({ selectedEquipment: null });
          return;
        }
        
        // If equipment already has points loaded, use it directly
        if (equipment.points && equipment.points.length > 0) {
          set({ selectedEquipment: equipment });
          return;
        }
        
        // Otherwise, fetch full equipment data with points from the database
        try {
          set({ isLoading: true });
          const response = await fetch(`/api/equipment/${equipment.id}`);
          const data = await response.json();
          if (data.success && data.equipment) {
            // Attach points to the equipment object
            const equipmentWithPoints = {
              ...data.equipment,
              points: data.points || []
            };
            set({ selectedEquipment: equipmentWithPoints, isLoading: false });
          } else {
            // Fallback to original equipment if fetch fails
            set({ selectedEquipment: equipment, isLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch full equipment data:', error);
          // Fallback to original equipment if fetch fails
          set({ selectedEquipment: equipment, isLoading: false });
        }
      },
      setCxAlloyEquipment: (equipment) => set({ cxAlloyEquipment: equipment }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setSelectedTemplate: (templateId) => {
        const { selectedEquipment } = get();
        if (selectedEquipment) {
          get().setEquipmentTemplate(selectedEquipment.id, templateId);
        }
      },
      
      setEquipmentTemplate: (equipmentId, templateId) =>
        set((state) => ({
          equipmentTemplateMap: {
            ...state.equipmentTemplateMap,
            [equipmentId]: templateId || ''
          }
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      
      fetchEquipment: async (page, filters) => {
        set({ isLoading: true });
        try {
          const params = new URLSearchParams({
            page: page.toString(),
            ...filters,
          });
          const response = await fetch(`/api/equipment?${params.toString()}`);
          const data = await response.json();
          if (data.success) {
            set({ equipment: data.equipment, isLoading: false });
          } else {
            throw new Error(data.error || 'Failed to fetch equipment');
          }
        } catch (error) {
          console.error('Failed to fetch equipment:', error);
          set({ isLoading: false });
        }
      },
      
      setViewMode: (panel, mode) => 
        set((state) => ({
          viewMode: {
            ...state.viewMode,
            [panel]: mode
          }
        })),
      
      // Panel Actions
      setPanelWidth: (panel, width) =>
        set((state) => ({
          [`${panel}PanelWidth`]: Math.max(
            panel === 'left' ? 300 : 350,
            Math.min(width, 600)
          )
        })),
      
      toggleMobilePanel: (panel) =>
        set((state) => ({
          showMobilePanels: {
            ...state.showMobilePanels,
            [panel]: !state.showMobilePanels[panel]
          }
        })),
      
      // Equipment Mapping Actions
      addEquipmentMapping: (mapping) =>
        set((state) => {
          const newMappings = [
            ...state.equipmentMappings.filter(
              m => m.bacnetEquipmentId !== mapping.bacnetEquipmentId
            ),
            mapping
          ];
          
          // Initialize tracked points for newly mapped equipment if there are selected points
          const newTrackedByEquipment = { ...state.trackedPointsByEquipment };
          if (state.selectedPoints.size > 0 && state.selectedEquipment?.id === mapping.bacnetEquipmentId) {
            newTrackedByEquipment[mapping.bacnetEquipmentId] = new Set(state.selectedPoints);
          }
          
          return {
            equipmentMappings: newMappings,
            trackedPointsByEquipment: newTrackedByEquipment
          };
        }),
      
      removeEquipmentMapping: (bacnetEquipmentId) =>
        set((state) => {
          const newTrackedByEquipment = { ...state.trackedPointsByEquipment };
          delete newTrackedByEquipment[bacnetEquipmentId];
          
          return {
            equipmentMappings: state.equipmentMappings.filter(
              m => m.bacnetEquipmentId !== bacnetEquipmentId
            ),
            trackedPointsByEquipment: newTrackedByEquipment
          };
        }),
      
      // Auto-mapping Actions
      performAutoMapping: async () => {
        set({ autoMappingInProgress: true });
        try {
          const response = await fetch('/api/auto-map', { method: 'POST' });
          const data = await response.json();
          
          if (data.success) {
            set({ 
              autoMappingResult: data.data,
              autoMappingInProgress: false 
            });
            return data.data;
          } else {
            throw new Error(data.error || 'Auto-mapping failed');
          }
        } catch (error) {
          console.error('Auto-mapping error:', error);
          set({ autoMappingInProgress: false });
          return null;
        }
      },
      
      applyExactMappings: async (mappings) => {
        const { recordEquipmentMapping } = get();
        
        const newMappings = mappings.map(match => {
          // Check if it's already an EquipmentMapping object or an AutoMappingMatch
          if ('bacnetEquipmentId' in match) {
            // It's already an EquipmentMapping, return as is
            return match;
          } else if ('bacnetEquipment' in match && 'cxAlloyEquipment' in match) {
            // It's an AutoMappingMatch, convert it
            return {
              id: `auto-${match.bacnetEquipment.id}-${match.cxAlloyEquipment.id}`,
              bacnetEquipmentId: match.bacnetEquipment.id,
              bacnetEquipmentName: match.bacnetEquipment.name,
              bacnetEquipmentType: match.bacnetEquipment.type || 'Unknown',
              cxalloyEquipmentId: match.cxAlloyEquipment.id,
              cxalloyEquipmentName: match.cxAlloyEquipment.name,
              cxalloyCategory: match.cxAlloyEquipment.type as any,
              mappingType: 'automatic' as const,
              confidence: match.confidence,
              mappingReason: match.reasons?.join('; ') || '',
              totalBacnetPoints: match.bacnetEquipment.totalPoints || 0,
              mappedPointsCount: 0,
              unmappedPointsCount: 0,
              isActive: true,
              isVerified: true,
              verifiedBy: 'auto-mapping',
              verifiedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'auto-mapping-service',
              mappingMethod: 'auto' as const
            };
          } else {
            // Fallback for other structures
            console.error('Unknown mapping structure:', match);
            return match as any;
          }
        });
        
        // Record audit trail for each mapping
        for (const mapping of newMappings) {
          await recordEquipmentMapping(
            mapping.bacnetEquipmentId,
            mapping.bacnetEquipmentName,
            mapping.cxalloyEquipmentId,
            mapping.cxalloyEquipmentName,
            'created',
            'auto-mapping',
            mapping.confidence,
            mapping.totalBacnetPoints
          );
        }
        
        set((state) => ({
          equipmentMappings: [
            ...state.equipmentMappings,
            ...newMappings
          ]
        }));
      },
      
      applySuggestedMapping: (mapping) => {
        const newMapping = {
          id: `suggested-${mapping.bacnetEquipment.id}-${mapping.cxAlloyEquipment.id}`,
          bacnetEquipmentId: mapping.bacnetEquipment.id,
          bacnetEquipmentName: mapping.bacnetEquipment.name,
          bacnetEquipmentType: mapping.bacnetEquipment.type || 'Unknown',
          cxalloyEquipmentId: mapping.cxAlloyEquipment.id,
          cxalloyEquipmentName: mapping.cxAlloyEquipment.name,
          cxalloyCategory: mapping.cxAlloyEquipment.type as any,
          mappingType: 'manual' as const,
          confidence: mapping.confidence,
          mappingReason: mapping.reasons.join('; '),
          totalBacnetPoints: mapping.bacnetEquipment.totalPoints || 0,
          mappedPointsCount: 0,
          unmappedPointsCount: 0,
          isActive: true,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-selection',
          mappingMethod: 'manual' as const
        };
        
        set((state) => ({
          equipmentMappings: [
            ...state.equipmentMappings.filter(
              m => m.bacnetEquipmentId !== mapping.bacnetEquipment.id
            ),
            newMapping
          ]
        }));
      },
      
      clearAutoMappingResult: () => set({ autoMappingResult: null }),
      
      // Template Actions
      setTemplates: (templates) => set({ templates }),
      
      addTemplate: (template) =>
        set((state) => ({
          templates: [...state.templates, template]
        })),
      
      updateTemplate: (templateId, updates) =>
        set((state) => ({
          templates: state.templates.map(template =>
            template.id === templateId ? { ...template, ...updates } : template
          )
        })),
      
      removeTemplate: (templateId) =>
        set((state) => ({
          templates: state.templates.filter(
            template => template.id !== templateId
          )
        })),
      
      fetchTemplates: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/templates');
          const data = await response.json();
          if (data.success) {
            set({ templates: data.templates, isLoading: false });
          } else {
            throw new Error(data.error || 'Failed to fetch templates');
          }
        } catch (error) {
          console.error('Error fetching templates:', error);
          set({ isLoading: false, error: 'Failed to fetch templates' });
        }
      },
      
      // Backward compatibility
      fetchEquipmentTemplates: async () => {
        const { fetchTemplates } = get();
        await fetchTemplates();
      },
      
      // Point Selection Actions
      togglePointSelection: (pointId) =>
        set((state) => {
          const newSelected = new Set(state.selectedPoints);
          const isSelecting = !newSelected.has(pointId);
          
          if (isSelecting) {
            newSelected.add(pointId);
          } else {
            newSelected.delete(pointId);
          }
          
          // Also update per-equipment tracking for mapped equipment
          const newTrackedByEquipment = { ...state.trackedPointsByEquipment };
          if (state.selectedEquipment) {
            const equipmentId = state.selectedEquipment.id;
            const isMapped = state.equipmentMappings.some(m => m.bacnetEquipmentId === equipmentId);
            
            if (isMapped) {
              if (!newTrackedByEquipment[equipmentId]) {
                newTrackedByEquipment[equipmentId] = new Set();
              }
              
              if (isSelecting) {
                newTrackedByEquipment[equipmentId].add(pointId);
              } else {
                newTrackedByEquipment[equipmentId].delete(pointId);
              }
            }
          }
          
          return { 
            selectedPoints: newSelected,
            trackedPointsByEquipment: newTrackedByEquipment
          };
        }),
      
      clearPointSelection: () => set({ selectedPoints: new Set() }),

      setShowBulkApplyDialog: (show) => set({ showBulkApplyDialog: show }),
      
      // Template Mapping Actions
      setShowTemplateManagementModal: (show) => set({ showTemplateManagementModal: show }),
      
      // Bulk Mapping Actions
      setShowBulkMappingModal: (show) => set({ showBulkMappingModal: show }),
      
      // Audit Trail Actions
      recordPointEdit: async (pointId, equipmentId, equipmentName, changeType, oldValue, newValue, source = 'manual') => {
        try {
          const AuditTrailService = (await import('../lib/services/audit-trail-service')).AuditTrailService;
          await AuditTrailService.recordPointEdit(
            pointId,
            equipmentId,
            equipmentName,
            changeType,
            oldValue,
            newValue,
            source
          );
        } catch (error) {
          console.error('Error recording point edit:', error);
        }
      },
      
      recordEquipmentMapping: async (bacnetEquipmentId, bacnetEquipmentName, cxalloyEquipmentId, cxalloyEquipmentName, actionType, source = 'manual', confidence = 0, pointMappingCount = 0, templateId, templateName) => {
        try {
          const AuditTrailService = (await import('../lib/services/audit-trail-service')).AuditTrailService;
          await AuditTrailService.recordEquipmentMapping(
            bacnetEquipmentId,
            bacnetEquipmentName,
            cxalloyEquipmentId,
            cxalloyEquipmentName,
            actionType,
            source,
            'user',
            confidence,
            pointMappingCount,
            templateId,
            templateName
          );
        } catch (error) {
          console.error('Error recording equipment mapping:', error);
        }
      },
      
      getSelectedPointsData: () => {
        const { selectedPoints, getSelectedEquipmentPoints } = get();
        const points = getSelectedEquipmentPoints(); // Use deduplicated points
        
        return points.filter(point => 
          selectedPoints.has(point.originalPointId || point.originalName)
        );
      },
      
      // Computed Properties
      getEquipmentByType: () => {
        const { equipment } = get();
        return equipment.reduce((acc, eq) => {
          const type = eq.type || 'Unknown';
          if (!acc[type]) acc[type] = [];
          acc[type].push(eq);
          return acc;
        }, {} as Record<string, Equipment[]>);
      },
      
      getFilteredEquipment: () => {
        const { equipment, searchTerm } = get();
        if (!searchTerm) return equipment;
        
        const term = searchTerm.toLowerCase();
        return equipment.filter(eq =>
          eq.name.toLowerCase().includes(term) ||
          eq.description?.toLowerCase().includes(term) ||
          eq.type.toLowerCase().includes(term)
        );
      },
      
      getSelectedEquipmentPoints: () => {
        const { selectedEquipment, equipmentTemplateMap, templates } = get();
        if (!selectedEquipment) return [];
        
        let points = selectedEquipment.points || [];
        
        // Deduplicate points based on originalPointId or originalName
        const seen = new Set();
        points = points.filter(point => {
          const id = point.originalPointId || point.originalName;
          if (seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        
        // Get template for current equipment
        const selectedTemplateId = equipmentTemplateMap[selectedEquipment.id];
        
        // If a template is selected, only show points that match template points
        if (selectedTemplateId && templates) {
          const template = templates.find(t => t.id === selectedTemplateId);
          if (template && template.points) {
            const templatePointNames = new Set(
              template.points.map(p => p.name)
            );
            
            return points.filter(point => 
              templatePointNames.has(point.normalizedName) || 
              templatePointNames.has(point.originalName)
            );
          }
        }
        
        return points;
      },
      
      getMappedCxAlloyEquipment: () => {
        const { cxAlloyEquipment, equipmentMappings } = get();
        const mappedIds = new Set(equipmentMappings.map(m => Number(m.cxalloyEquipmentId)));
        return cxAlloyEquipment.filter(eq => mappedIds.has(Number(eq.id)));
      },
      
      // Get mapped CxAlloy equipment for a specific BACnet data source
      getMappedCxAlloyForDataSource: (bacnetEquipmentId: string) => {
        const { cxAlloyEquipment, equipmentMappings } = get();
        const mapping = equipmentMappings.find(m => m.bacnetEquipmentId === bacnetEquipmentId);
        if (mapping) {
          return cxAlloyEquipment.find(eq => Number(eq.id) === Number(mapping.cxalloyEquipmentId));
        }
        return null;
      },
      
      getUnmappedCxAlloyEquipment: () => {
        const { cxAlloyEquipment, equipmentMappings } = get();
        const mappedIds = new Set(equipmentMappings.map(m => Number(m.cxalloyEquipmentId)));
        return cxAlloyEquipment.filter(eq => !mappedIds.has(Number(eq.id)));
      },
      
      getTemplatesByType: () => {
        const { templates } = get();
        return templates.reduce((acc, template) => {
          const type = template.equipmentType || 'Unknown';
          if (!acc[type]) acc[type] = [];
          acc[type].push(template);
          return acc;
        }, {} as Record<string, UnifiedTemplate[]>);
      },
      
      getFilteredTemplates: () => {
        const { templates, searchTerm } = get();
        if (!searchTerm) return templates;
        
        const term = searchTerm.toLowerCase();
        return templates.filter(template =>
          template.name.toLowerCase().includes(term) ||
          template.description?.toLowerCase().includes(term) ||
          template.equipmentType.toLowerCase().includes(term)
        );
      },
      
      getSelectedTemplate: () => {
        const { templates, equipmentTemplateMap, selectedEquipment } = get();
        if (!selectedEquipment) return null;
        
        const selectedTemplateId = equipmentTemplateMap[selectedEquipment.id];
        if (!selectedTemplateId) return null;
        
        return templates.find(template => template.id === selectedTemplateId) || null;
      }
    }),
    {
      name: 'app-store'
    }
  )
); 