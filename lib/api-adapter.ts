/**
 * API Adapter - Routes API calls to CodeIgniter or Next.js depending on context
 * 
 * When running in CodeIgniter (bundled), uses the CodeIgniterAPI class
 * When running standalone Next.js, uses regular fetch to Next.js API routes
 */

// Check if we're running in CodeIgniter context
const isCodeIgniterContext = () => {
  return typeof window !== 'undefined' && 
         (window as any).__EQUIPMENT_MAPPING_API__ !== undefined;
};

// Get the CodeIgniter API instance
const getCodeIgniterAPI = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__EQUIPMENT_MAPPING_API__;
  }
  return null;
};

/**
 * Unified API Adapter
 * Routes calls to appropriate backend based on context
 */
export const apiAdapter = {
  /**
   * Fetch equipment with pagination and filters
   */
  async fetchEquipment(page: number, filters: Record<string, string>) {
    if (isCodeIgniterContext()) {
      const api = getCodeIgniterAPI();
      const data = await api.getEquipment();
      return data;
    } else {
      // Next.js standalone mode
      const params = new URLSearchParams({
        page: page.toString(),
        ...filters,
      });
      const response = await fetch(`/api/equipment?${params.toString()}`);
      return response.json();
    }
  },

  /**
   * Fetch single equipment with points
   */
  async fetchEquipmentById(equipmentId: string) {
    if (isCodeIgniterContext()) {
      const api = getCodeIgniterAPI();
      const data = await api.getEquipmentPoints(parseInt(equipmentId));
      return data;
    } else {
      const response = await fetch(`/api/equipment/${equipmentId}`);
      return response.json();
    }
  },

  /**
   * Fetch CxAlloy equipment
   */
  async fetchCxAlloyEquipment(projectId: number, useMock: boolean = false) {
    if (isCodeIgniterContext()) {
      const api = getCodeIgniterAPI();
      const data = await api.getCxAlloyEquipment();
      return data;
    } else {
      const params = new URLSearchParams({ projectId: projectId.toString() });
      if (useMock) {
        params.append('useMock', 'true');
      }
      const response = await fetch(`/api/cxalloy/equipment?${params.toString()}`);
      return response.json();
    }
  },

  /**
   * Fetch templates
   */
  async fetchTemplates() {
    if (isCodeIgniterContext()) {
      // For now, return empty array - we can implement CodeIgniter template endpoint later
      return { success: true, templates: [] };
    } else {
      const response = await fetch('/api/templates');
      return response.json();
    }
  },

  /**
   * Perform auto-mapping
   */
  async performAutoMapping(bacnetEquipment: any[], cxAlloyEquipment: any[], confidenceThreshold: number = 80) {
    if (isCodeIgniterContext()) {
      const api = getCodeIgniterAPI();
      const data = await api.autoMap(confidenceThreshold);
      return data;
    } else {
      const response = await fetch('/api/auto-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bacnetEquipment,
          cxAlloyEquipment,
          confidenceThreshold
        }),
      });
      return response.json();
    }
  },

  /**
   * Save mappings
   */
  async saveMappings(mappings: any[]) {
    if (isCodeIgniterContext()) {
      const api = getCodeIgniterAPI();
      const data = await api.saveMappings(mappings);
      return data;
    } else {
      const response = await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });
      return response.json();
    }
  },
};

