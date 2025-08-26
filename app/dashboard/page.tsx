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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Download, Save, TestTube, Upload, BarChart3, Zap, Copy, Layers, Paperclip } from 'lucide-react';
import { EquipmentMapping } from '../../types/auto-mapping';

function DashboardHeader({ onRefresh, loading, onAutoMap, onBulkMapping, onSaveMappings, savingMappings }: { 
  onRefresh: () => void; 
  loading: boolean; 
  onAutoMap: () => void;
  onBulkMapping: () => void;
  onSaveMappings: () => void;
  savingMappings: boolean;
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
         Bulk Point Templates
        </Button>
        <Button variant="outline" onClick={onSaveMappings} disabled={savingMappings}>
          <Save className={`w-4 h-4 mr-2 ${savingMappings ? 'animate-pulse' : ''}`} />
          {savingMappings ? 'Saving...' : 'Save Mappings'}
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
    cxAlloyEquipment,
    setCxAlloyEquipment,
    performAutoMapping,
    applyExactMappings,
    autoMappingResult,
    autoMappingInProgress,
    showTemplateManagementModal,
    setShowTemplateManagementModal,
    showBulkMappingModal,
    setShowBulkMappingModal,
    setSelectedEquipment,
    equipmentMappings,
    selectedPoints,
    getSelectedPointsData
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [showExactPrompt, setShowExactPrompt] = useState(false);

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

      // After data loads, run a silent auto-map to detect exact matches
      const result = await performAutoMapping();
      if (result && result.exactMappings && result.exactMappings.length > 0) {
        setShowExactPrompt(true);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, [fetchEquipment, fetchCxAlloyEquipment, performAutoMapping]);

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

  const handleSaveMappings = useCallback(async () => {
    setError(null);
    setSavingMappings(true);
    
    try {
      console.log('[Dashboard] Starting save mappings...');
      
      // Prepare mappings data with tracked points
      const mappingsToSave = equipmentMappings.map(mapping => {
        // Debug: Log the mapping object to see its structure
        console.log('[Dashboard] Mapping object:', mapping);
        
        // Get equipment names from the arrays
        const bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);
        // Try both property names to handle different type definitions
        const cxalloyId = (mapping as any).cxalloyEquipmentId || (mapping as any).cxAlloyEquipmentId;
        const cxalloyEquipment = cxAlloyEquipment.find(eq => eq.id === cxalloyId?.toString());
        
        // Get tracked points for this equipment
        const trackedPoints = getSelectedPointsData().filter(point => 
          point.equipmentId === mapping.bacnetEquipmentId
        ).map(point => ({
          id: point.originalPointId || point.originalName,
          originalName: point.originalName,
          normalizedName: point.normalizedName,
          displayName: point.originalName, // Use originalName as displayName
          description: point.originalDescription || point.normalizedName,
          category: point.category || 'Unknown',
          dataType: point.dataType || 'Unknown',
          units: point.units || '',
          bacnetObjectType: point.objectType,
          bacnetObjectInstance: point.objectInstance,
          vendorName: 'Unknown' // vendorName not available in NormalizedPoint
        }));
        
        return {
          bacnetEquipmentId: mapping.bacnetEquipmentId,
          bacnetEquipmentName: bacnetEquipment?.name || 'Unknown',
          cxalloyEquipmentId: cxalloyId,
          cxalloyEquipmentName: cxalloyEquipment?.name || 'Unknown',
          trackedPoints
        };
      });
      
      console.log(`[Dashboard] Saving ${mappingsToSave.length} equipment mappings with tracked points...`);
      
      console.log('[Dashboard] Sending mappings to API:', mappingsToSave);
      
      const response = await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentMappings: mappingsToSave })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[Dashboard] Mappings saved successfully:', data.data);
        alert(`Successfully saved ${data.data.equipmentMappingsSaved} equipment mappings and ${data.data.totalPointsSaved} tracked points to CxAlloy database!`);
      } else {
        console.error('[Dashboard] Save mappings API error:', data);
        throw new Error(data.details || data.error || 'Failed to save mappings');
      }
    } catch (err) {
      console.error('[Dashboard] Save mappings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save mappings');
    } finally {
      setSavingMappings(false);
    }
  }, [equipmentMappings, getSelectedPointsData]);

  const handleApplyMapping = async (mapping: EquipmentMapping) => {
    try {
      // TODO: Implement actual mapping persistence to database
      console.log('[Dashboard] Applying mapping:', mapping);
      // For now, just add to applied mappings in store
      await applyExactMappings([mapping as any]);
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
      await applyExactMappings(mappings as any);
    } catch (err) {
      console.error('[Dashboard] Failed to apply suggestions:', err);
    }
  };

  const handleCreateCxAlloyEquipment = async (bacnetEquipment: any) => {
    try {
      console.log('[Dashboard] Creating new CxAlloy equipment based on:', bacnetEquipment);
      
      // Extract richer information from BACnet equipment metadata and connector data
      const vendor = bacnetEquipment.vendor || 'Unknown';
      const model = bacnetEquipment.model || bacnetEquipment.modelName || 'Unknown';
      const description = bacnetEquipment.description || 
                         bacnetEquipment.metadata?.deviceName || 
                         `${bacnetEquipment.type} - ${vendor} ${model}`.trim();
      
      // Try to extract location information from various sources
      let location = 'TBD';
      let space = 'TBD';
      
      if (bacnetEquipment.location) {
        location = bacnetEquipment.location;
      } else if (bacnetEquipment.metadata?.uri) {
        // Extract building/location info from BACnet URI if available
        const uriMatch = bacnetEquipment.metadata.uri.match(/bacnet:\/\/(\d+\.\d+\.\d+\.\d+)\//);
        if (uriMatch) {
          location = `BACnet Network ${uriMatch[1]}`;
        }
      }
      
      // Use vendor description if available - it's often more detailed
      let enhancedDescription = description;
      if (bacnetEquipment.metadata?.customFields?.descriptionFromVendor) {
        enhancedDescription = bacnetEquipment.metadata.customFields.descriptionFromVendor;
      }
      
      // Create new CxAlloy equipment based on enhanced BACnet equipment data
      const newCxAlloyEquipment = {
        name: bacnetEquipment.name,
        type: bacnetEquipment.type,
        description: `${enhancedDescription} (Mapped from BACnet: ${bacnetEquipment.name})`,
        location: location,
        space: space,
        vendor: vendor,
        model: model,
        projectId: 2 // Default project ID
      };
      
      // Call API to create the equipment
      const response = await fetch('/api/cxalloy/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCxAlloyEquipment)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[Dashboard] Created new CxAlloy equipment:', data.equipment);
        
        // Refresh CxAlloy equipment list to include the new equipment
        await fetchCxAlloyEquipment();
        
        // Close the mapping modal and select the BACnet equipment for mapping
        setShowMappingModal(false);
        setSelectedEquipment(bacnetEquipment);
        
        alert(`Successfully created new CxAlloy equipment: ${data.equipment.name}`);
      } else {
        throw new Error(data.error || 'Failed to create CxAlloy equipment');
      }
    } catch (err) {
      console.error('[Dashboard] Failed to create CxAlloy equipment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create CxAlloy equipment');
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
        onSaveMappings={handleSaveMappings}
        savingMappings={savingMappings}
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
        results={autoMappingResult as any}
        onApplyMapping={handleApplyMapping}
        onApplyAllExact={handleApplyAllExact}
        onApplySelectedSuggestions={handleApplySelectedSuggestions}
        onManualMap={(equipment) => {
          // Close the modal and select the equipment for manual mapping
          setShowMappingModal(false);
          setSelectedEquipment(equipment);
        }}
        onCreateCxAlloyEquipment={handleCreateCxAlloyEquipment}
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

      {/* Exact Matches Prompt */}
      <Dialog open={showExactPrompt} onOpenChange={setShowExactPrompt}>
        <DialogContent
          style={{
            backgroundImage: "url('/clippy.webp')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right -10px bottom -10px',
            backgroundSize: '220px auto'
          }}
          className="pr-8"
        >
          <DialogHeader>
            <DialogTitle>Apply Exact Matches?</DialogTitle>
            <DialogDescription>
              We detected exact equipment name matches. Would you like to apply them now?
            </DialogDescription>
          </DialogHeader>
          {/* Clippy mini-helper */}
          <div className="relative mb-3">
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl shadow-sm max-w-[16rem] w-fit mr-auto gentle-pulse text-[12px] leading-snug">
              <div className="shrink-0 mt-0.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 clippy-wink">
                  <Paperclip className="w-4 h-4 text-amber-700" />
                </div>
              </div>
              <div className="text-amber-800 pr-1">
                <div className="font-semibold mb-0.5 text-[13px]">It looks like you're mapping some equipment…</div>
                <div>Click “Sure” to auto-apply exact matches, or "No Thanks" to review later.</div>
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-2 justify-start">
            <Button
              variant="ghost"
              onClick={() => setShowExactPrompt(false)}
            >
              No Thanks
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (autoMappingResult?.exactMappings?.length) {
                    await handleApplyAllExact();
                  }
                } finally {
                  setShowExactPrompt(false);
                }
              }}
            >
              Sure
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 