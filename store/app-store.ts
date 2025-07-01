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
  
  // Panel Actions
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  toggleMobilePanel: (panel: 'left' | 'right') => void;
  
  // Equipment Actions
  addEquipmentMapping: (mapping: EquipmentMapping) => void;
  removeEquipmentMapping: (bacnetEquipmentId: string) => void;
  
  // Computed Properties
  getEquipmentByType: () => Record<string, Equipment[]>;
  getFilteredEquipment: () => Equipment[];
  getSelectedEquipmentPoints: () => NormalizedPoint[];
  getMappedCxAlloyEquipment: () => CxAlloyEquipment[];
  getUnmappedCxAlloyEquipment: () => CxAlloyEquipment[];
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
      }
    }),
    {
      name: 'app-store'
    }
  )
); 