import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Equipment, 
  EquipmentTemplate,
  CxAlloyEquipment,
  EquipmentMapping 
} from '../types/equipment';
import type { NormalizedPoint } from '../types/normalized';

interface ViewMode {
  left: 'equipment' | 'templates';
  middle: 'all-points' | 'template-points';
  right: 'all' | 'mapped' | 'unmapped';
}

interface AppState {
  // Equipment Data
  equipment: Equipment[];
  selectedEquipment: Equipment | null;
  equipmentTemplates: EquipmentTemplate[];
  
  // CxAlloy Integration
  cxAlloyEquipment: CxAlloyEquipment[];
  equipmentMappings: EquipmentMapping[];
  
  // UI State
  viewMode: ViewMode;
  isLoading: boolean;
  searchTerm: string;
  selectedTemplate: string | null;
  
  // Point Selection State
  selectedPoints: Set<string>; // Point IDs selected for template creation
  showPointConfigModal: boolean;
  
  // Panel State
  leftPanelWidth: number;
  rightPanelWidth: number;
  showMobilePanels: {
    left: boolean;
    right: boolean;
  };
  
  // Actions
  setEquipment: (equipment: Equipment[]) => void;
  setSelectedEquipment: (equipment: Equipment | null) => void;
  setCxAlloyEquipment: (equipment: CxAlloyEquipment[]) => void;
  setViewMode: (panel: keyof ViewMode, mode: ViewMode[keyof ViewMode]) => void;
  setSearchTerm: (term: string) => void;
  setSelectedTemplate: (templateId: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Data Fetching
  fetchEquipment: (page: number, filters: Record<string, string>) => Promise<void>;
  
  // Panel Actions
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  toggleMobilePanel: (panel: 'left' | 'right') => void;
  
  // Equipment Actions
  addEquipmentMapping: (mapping: EquipmentMapping) => void;
  removeEquipmentMapping: (bacnetEquipmentId: string) => void;
  
  // Template Actions
  setEquipmentTemplates: (templates: EquipmentTemplate[]) => void;
  addEquipmentTemplate: (template: EquipmentTemplate) => void;
  updateEquipmentTemplate: (templateId: string, updates: Partial<EquipmentTemplate>) => void;
  removeEquipmentTemplate: (templateId: string) => void;
  fetchEquipmentTemplates: () => Promise<void>;
  
  // Point Selection Actions
  togglePointSelection: (pointId: string) => void;
  clearPointSelection: () => void;
  setShowPointConfigModal: (show: boolean) => void;
  getSelectedPointsData: () => NormalizedPoint[];
  
  // Computed Properties
  getEquipmentByType: () => Record<string, Equipment[]>;
  getFilteredEquipment: () => Equipment[];
  getSelectedEquipmentPoints: () => NormalizedPoint[];
  getMappedCxAlloyEquipment: () => CxAlloyEquipment[];
  getUnmappedCxAlloyEquipment: () => CxAlloyEquipment[];
  getTemplatesByType: () => Record<string, EquipmentTemplate[]>;
  getFilteredTemplates: () => EquipmentTemplate[];
  getSelectedTemplate: () => EquipmentTemplate | null;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial State
      equipment: [],
      selectedEquipment: null,
      equipmentTemplates: [],
      cxAlloyEquipment: [],
      equipmentMappings: [],
      
      viewMode: {
        left: 'equipment',
        middle: 'all-points',
        right: 'all'
      },
      
      isLoading: false,
      searchTerm: '',
      selectedTemplate: null,
      
      // Point Selection State
      selectedPoints: new Set<string>(),
      showPointConfigModal: false,
      
      leftPanelWidth: 320,
      rightPanelWidth: 350,
      showMobilePanels: {
        left: false,
        right: false
      },
      
      // Basic Actions
      setEquipment: (equipment) => set({ equipment }),
      setSelectedEquipment: (equipment) => set({ selectedEquipment: equipment }),
      setCxAlloyEquipment: (equipment) => set({ cxAlloyEquipment: equipment }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setSelectedTemplate: (templateId) => set({ selectedTemplate: templateId }),
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
        set((state) => ({
          equipmentMappings: [
            ...state.equipmentMappings.filter(
              m => m.bacnetEquipmentId !== mapping.bacnetEquipmentId
            ),
            mapping
          ]
        })),
      
      removeEquipmentMapping: (bacnetEquipmentId) =>
        set((state) => ({
          equipmentMappings: state.equipmentMappings.filter(
            m => m.bacnetEquipmentId !== bacnetEquipmentId
          )
        })),
      
      // Template Actions
      setEquipmentTemplates: (templates) => set({ equipmentTemplates: templates }),
      
      addEquipmentTemplate: (template) =>
        set((state) => ({
          equipmentTemplates: [...state.equipmentTemplates, template]
        })),
      
      updateEquipmentTemplate: (templateId, updates) =>
        set((state) => ({
          equipmentTemplates: state.equipmentTemplates.map(template =>
            template.id === templateId ? { ...template, ...updates } : template
          )
        })),
      
      removeEquipmentTemplate: (templateId) =>
        set((state) => ({
          equipmentTemplates: state.equipmentTemplates.filter(
            template => template.id !== templateId
          )
        })),
      
      fetchEquipmentTemplates: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/templates');
          const data = await response.json();
          if (data.success) {
            set({ equipmentTemplates: data.templates, isLoading: false });
          } else {
            throw new Error(data.error || 'Failed to fetch templates');
          }
        } catch (error) {
          console.error('Failed to fetch templates:', error);
          set({ isLoading: false });
        }
      },
      
      // Point Selection Actions
      togglePointSelection: (pointId) =>
        set((state) => {
          const newSelected = new Set(state.selectedPoints);
          if (newSelected.has(pointId)) {
            newSelected.delete(pointId);
          } else {
            newSelected.add(pointId);
          }
          return { selectedPoints: newSelected };
        }),
      
      clearPointSelection: () => set({ selectedPoints: new Set() }),
      
      setShowPointConfigModal: (show) => set({ showPointConfigModal: show }),
      
      getSelectedPointsData: () => {
        const { selectedEquipment, selectedPoints } = get();
        if (!selectedEquipment?.points) return [];
        
        return selectedEquipment.points.filter(point => 
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
        const { selectedEquipment, selectedTemplate, viewMode } = get();
        if (!selectedEquipment) return [];
        
        const points = selectedEquipment.points || [];
        
        if (viewMode.middle === 'template-points' && selectedTemplate) {
          // Filter points based on selected template
          // This would need template matching logic
          return points; // Placeholder
        }
        
        return points;
      },
      
      getMappedCxAlloyEquipment: () => {
        const { cxAlloyEquipment, equipmentMappings } = get();
        const mappedIds = new Set(equipmentMappings.map(m => m.cxAlloyEquipmentId));
        return cxAlloyEquipment.filter(eq => mappedIds.has(eq.id));
      },
      
      getUnmappedCxAlloyEquipment: () => {
        const { cxAlloyEquipment, equipmentMappings } = get();
        const mappedIds = new Set(equipmentMappings.map(m => m.cxAlloyEquipmentId));
        return cxAlloyEquipment.filter(eq => !mappedIds.has(eq.id));
      },
      
      getTemplatesByType: () => {
        const { equipmentTemplates } = get();
        return equipmentTemplates.reduce((acc, template) => {
          const type = template.equipmentType || 'Unknown';
          if (!acc[type]) acc[type] = [];
          acc[type].push(template);
          return acc;
        }, {} as Record<string, EquipmentTemplate[]>);
      },
      
      getFilteredTemplates: () => {
        const { equipmentTemplates, searchTerm } = get();
        if (!searchTerm) return equipmentTemplates;
        
        const term = searchTerm.toLowerCase();
        return equipmentTemplates.filter(template =>
          template.name.toLowerCase().includes(term) ||
          template.description?.toLowerCase().includes(term) ||
          template.equipmentType.toLowerCase().includes(term)
        );
      },
      
      getSelectedTemplate: () => {
        const { equipmentTemplates, selectedTemplate } = get();
        return equipmentTemplates.find(template => template.id === selectedTemplate) || null;
      }
    }),
    {
      name: 'app-store'
    }
  )
); 