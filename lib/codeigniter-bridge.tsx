/**
 * CodeIgniter Bridge for Equipment Mapping
 * 
 * Bridges React application to CodeIgniter backend endpoints
 * All calls route to Otto_equipment_mapping.php controller
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';// tailwind & globals (will be injected into shadow)


export interface EquipmentMapping {
  equipmentpoint_id?: number;
  equipment_id: number;
  bacnet_object: string;
  bacnet_instance: string;
  cxalloy_point_name: string;
  point_type: string;
  confidence_score?: number;
  is_tracked: boolean;
}

export interface AutoMapResult {
  exact_matches: number;
  suggested_matches: number;
  unmatched_bacnet: number;
  unmatched_cxalloy: number;
}

export interface SaveResult {
  success: number;
  errors: number;
  error_details?: any[];
}

export class CodeIgniterAPI {
  private baseUrl: string;
  private projectId: number;

  constructor(baseUrl: string, projectId: number) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.projectId = projectId;
  }

  /**
   * Make AJAX request to CodeIgniter
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/project/${this.projectId}/settings/otto_equipment_mapping/${endpoint}`;
    
    const defaultOptions: RequestInit = {
      credentials: 'include', // Include cookies for CI session
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // CI checks for this
      },
    };

    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all equipment for project
   */
  async getEquipment() {
    return this.request('ajax_get_equipment');
  }

  /**
   * Get BACnet equipment from local database
   */
  async getBACnetEquipment() {
    return this.request('ajax_get_bacnet_equipment');
  }

  /**
   * Get CxAlloy equipment from SkySpark
   */
  async getCxAlloyEquipment() {
    return this.request('ajax_get_cxalloy_equipment');
  }

  /**
   * Get points for specific equipment
   */
  async getEquipmentPoints(equipmentId: number) {
    return this.request(`ajax_get_equipment_points?equipment_id=${equipmentId}`);
  }

  /**
   * Get existing mappings for project
   */
  async getMappings(equipmentId?: number) {
    const endpoint = equipmentId 
      ? `ajax_get_mappings?equipment_id=${equipmentId}`
      : 'ajax_get_mappings';
    return this.request(endpoint);
  }

  /**
   * Run auto-mapping algorithm
   */
  async autoMap(confidenceThreshold: number = 80): Promise<AutoMapResult> {
    return this.request('ajax_auto_map', {
      method: 'POST',
      body: JSON.stringify({ confidence_threshold: confidenceThreshold }),
    });
  }

  /**
   * Save mappings
   */
  async saveMappings(mappings: EquipmentMapping[]): Promise<SaveResult> {
    return this.request('ajax_save_mappings', {
      method: 'POST',
      body: JSON.stringify({ mappings }),
    });
  }

  /**
   * Delete mapping
   */
  async deleteMapping(equipmentpointId: number) {
    return this.request('ajax_delete_mapping', {
      method: 'POST',
      body: JSON.stringify({ equipmentpoint_id: equipmentpointId }),
    });
  }

  /**
   * Bulk apply tracked points from one equipment to others
   */
  async bulkApplyTrackedPoints(sourceEquipmentId: number, targetEquipmentIds: number[]) {
    return this.request('ajax_bulk_apply_tracked', {
      method: 'POST',
      body: JSON.stringify({
        source_equipment_id: sourceEquipmentId,
        target_equipment_ids: targetEquipmentIds,
      }),
    });
  }

  /**
   * Get SkySpark points for equipment
   */
  async getSkySparKPoints(equipmentRef: string) {
    return this.request(`ajax_get_skyspark_points?equipment_ref=${encodeURIComponent(equipmentRef)}`);
  }

  /**
   * Export mappings
   */
  async exportMappings(format: 'csv' | 'json' = 'csv') {
    const url = `${this.baseUrl}/project/${this.projectId}/settings/otto/export_mappings?format=${format}`;
    window.location.href = url; // Trigger download
  }
}

/**
 * Initialize the Equipment Mapping React app
 * Called from the CI modal view
 */
export function initEquipmentMapping(
  containerId: string,
  baseUrl: string,
  projectId: number
) {
  const api = new CodeIgniterAPI(baseUrl, projectId);
  
  // Store globally for React components to access
  (window as any).__EQUIPMENT_MAPPING_API__ = api;
  (window as any).__EQUIPMENT_MAPPING_PROJECT_ID__ = projectId;
  
  // Import React, ReactDOM, and the dashboard
  Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./codeigniter-dashboard-entry')
  ]).then(([React, ReactDOMClient, dashboardModule]) => {
    const CodeIgniterDashboardEntry = dashboardModule.default;
    const container = document.getElementById(containerId);

    if (container) {
      // Mount React app
      const root = ReactDOMClient.createRoot(container);
      root.render(
        React.createElement(CodeIgniterDashboardEntry, { api, projectId })
      );
    }
  });
}

// Make available globally
(window as any).initEquipmentMapping = initEquipmentMapping;
