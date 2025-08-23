'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ThreePanelLayout } from '../../components/layout/ThreePanelLayout';
import { EquipmentBrowser } from '../../components/equipment/EquipmentBrowser';
import { PointDetails } from '../../components/points/PointDetails';
import { CxAlloyPanel } from '../../components/mapping/CxAlloyPanel';
import AutoMappingResultsModal from '../../components/modals/AutoMappingResultsModal';
import { TemplateManagementModal } from '../../components/templates/TemplateManagementModal';
import { BulkMappingModal } from '../../components/templates/BulkMappingModal';
import { useAppStore } from '../../store/app-store';
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Settings, TestTube, Upload, BarChart3, Zap, Copy, Layers } from 'lucide-react';
import { EquipmentMapping } from '../../types/auto-mapping';

function DashboardHeader({ onRefresh, loading, onAutoMap, onBulkMapping }: { 
  onRefresh: () => void; 
  loading: boolean; 
  onAutoMap: () => void;
  onBulkMapping: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div>
        <h1 className="text-xl font-bold">CxAlloy Equipment Mapping</h1>
        <p className="text-sm text-muted-foreground">
          Building Automation Equipment Mapping for BACnet trio files
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={onRefresh} disabled={loading} className="font-bold">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Processing...' : 'Re-process Data'}
        </Button>
        <Button variant="outline" onClick={onAutoMap} disabled={loading}>
          <Zap className={`w-4 h-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Auto Mapping...' : 'Auto Map Equipment'}
        </Button>
        <Button variant="outline" onClick={onBulkMapping}>
          <Layers className="w-4 h-4 mr-2" />
          Bulk Mapping
        </Button>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { 
    equipment, 
    fetchEquipment, 
    isLoading, 
    setCxAlloyEquipment,
    performAutoMapping,
    applyExactMappings,
    autoMappingResult,
    autoMappingInProgress,
    showTemplateManagementModal,
    setShowTemplateManagementModal,
    showBulkMappingModal,
    setShowBulkMappingModal,
    setSelectedEquipment
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);

  const fetchCxAlloyEquipment = useCallback(async () => {
    try {
      console.log('[Dashboard] Fetching CxAlloy equipment for project 2...');
      const response = await fetch('/api/cxalloy/equipment?projectId=2');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.equipment) {
          console.log(`[Dashboard] Loaded ${data.equipment.length} CxAlloy equipment items`);
          setCxAlloyEquipment(data.equipment);
        }
      } else {
        console.error('[Dashboard] Failed to fetch CxAlloy equipment');
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching CxAlloy equipment:', err);
    }
  }, [setCxAlloyEquipment]);

  const handleRefresh = useCallback(async () => {
    setError(null);
    try {
      // First try to auto-process sample files
      console.log('[Dashboard] Starting auto-process of sample files...');
      const autoProcessRes = await fetch('/api/auto-process', { method: 'POST' });
      
      if (autoProcessRes.ok) {
        const autoProcessData = await autoProcessRes.json();
        console.log('[Dashboard] Auto-process completed:', {
          files: autoProcessData.summary?.totalFiles || 0,
          equipment: autoProcessData.summary?.totalEquipment || 0,
          points: autoProcessData.summary?.totalPoints || 0,
          enhanced: autoProcessData.csvEnhancement?.enabled || false
        });
      } else {
        // If auto-process fails, fall back to regular refresh
        console.log('[Dashboard] Auto-process not available, using regular refresh...');
        const refreshRes = await fetch('/api/refresh');
        if (!refreshRes.ok) {
          const data = await refreshRes.json();
          throw new Error(data.error || 'Failed to refresh data');
        }
      }
      
      // Re-fetch equipment data after processing
      await fetchEquipment(1, {});
      
      // Also fetch CxAlloy equipment
      await fetchCxAlloyEquipment();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, [fetchEquipment, fetchCxAlloyEquipment]);

  const handleAutoMap = useCallback(async () => {
    setError(null);
    try {
      console.log('[Dashboard] Starting auto-mapping...');
      const result = await performAutoMapping();
      
      if (result) {
        console.log('[Dashboard] Auto-mapping completed:', result.stats);
        setShowMappingModal(true);
      } else {
        throw new Error('Auto-mapping failed');
      }
    } catch (err) {
      console.error('[Dashboard] Auto-mapping error:', err);
      setError(err instanceof Error ? err.message : 'Auto-mapping failed');
    }
  }, [performAutoMapping]);

  const handleApplyMapping = async (mapping: EquipmentMapping) => {
    try {
      // TODO: Implement actual mapping persistence to database
      console.log('[Dashboard] Applying mapping:', mapping);
      // For now, just add to applied mappings in store
      await applyExactMappings([mapping]);
    } catch (err) {
      console.error('[Dashboard] Failed to apply mapping:', err);
    }
  };

  const handleApplyAllExact = async () => {
    if (autoMappingResult?.exactMappings) {
      try {
        console.log('[Dashboard] Applying all exact mappings');
        await applyExactMappings(autoMappingResult.exactMappings);
      } catch (err) {
        console.error('[Dashboard] Failed to apply exact mappings:', err);
      }
    }
  };

  const handleApplySelectedSuggestions = async (mappings: EquipmentMapping[]) => {
    try {
      console.log('[Dashboard] Applying selected suggestions:', mappings);
      await applyExactMappings(mappings);
    } catch (err) {
      console.error('[Dashboard] Failed to apply suggestions:', err);
    }
  };

  useEffect(() => {
    // Initial data load
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <DashboardHeader 
        onRefresh={handleRefresh} 
        loading={isLoading || autoMappingInProgress} 
        onAutoMap={handleAutoMap}
        onBulkMapping={() => setShowBulkMappingModal(true)}
      />
      <main className="flex-1 p-4 overflow-hidden">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        <ThreePanelLayout
          leftPanel={<EquipmentBrowser />}
          middlePanel={<PointDetails />}
          rightPanel={<CxAlloyPanel />}
        />
      </main>
      
      <AutoMappingResultsModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        results={autoMappingResult}
        onApplyMapping={handleApplyMapping}
        onApplyAllExact={handleApplyAllExact}
        onApplySelectedSuggestions={handleApplySelectedSuggestions}
        onManualMap={(equipment) => {
          // Close the modal and select the equipment for manual mapping
          setShowMappingModal(false);
          setSelectedEquipment(equipment);
        }}
      />
      
      <TemplateManagementModal
        isOpen={showTemplateManagementModal}
        onClose={() => setShowTemplateManagementModal(false)}
        onTemplateCreated={(template) => {
          console.log('[Dashboard] Template created:', template);
          // Optionally refresh templates or show success message
        }}
      />
      
      <BulkMappingModal
        isOpen={showBulkMappingModal}
        onClose={() => setShowBulkMappingModal(false)}
        onBulkMappingComplete={(results) => {
          console.log('[Dashboard] Bulk mapping completed:', results);
          // Refresh equipment data to show new mappings
          fetchEquipment(1, {});
        }}
      />
    </div>
  );
} 