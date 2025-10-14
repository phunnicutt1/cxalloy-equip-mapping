'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ThreePanelLayout } from '../../components/layout/ThreePanelLayout';
import { EquipmentBrowser } from '../../components/equipment/EquipmentBrowser';
import { PointDetails } from '../../components/points/PointDetails';
import { CxAlloyPanel } from '../../components/mapping/CxAlloyPanel';
import AutoMappingResultsModal from '../../components/modals/AutoMappingResultsModal';
import { TemplateManagementModal } from '../../components/templates/TemplateManagementModal';
import { MissingPointsReportModal } from '../../components/modals/MissingPointsReportModal';
import { useAppStore } from '../../store/app-store';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Download, Save, TestTube, Upload, BarChart3, Zap, Copy, Layers, Paperclip } from 'lucide-react';
import { EquipmentMapping } from '../../types/auto-mapping';
import { apiAdapter } from '../../lib/api-adapter';

function DashboardHeader({ onRefresh, loading, onAutoMap, onSaveMappings, savingMappings }: {
  onRefresh: () => void;
  loading: boolean;
  onAutoMap: () => void;
  onSaveMappings: () => void;
  savingMappings: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div>
        <h1 className="text-xl font-bold">CxAlloy Equipment Mapping Interface</h1>
        <p className="text-sm text-muted-foreground">
          Building Automation Device Mapping
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
    setSelectedEquipment,
    equipmentMappings,
    selectedPoints,
    getSelectedPointsData,
    trackedPointsByEquipment
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [showExactPrompt, setShowExactPrompt] = useState(false);
  const [missingPointsReport, setMissingPointsReport] = useState<Array<{
    equipmentName: string;
    missingPoints: string[];
  }> | null>(null);

  const fetchCxAlloyEquipment = useCallback(async () => {
    try {
      // Get projectId from global variable (set by CodeIgniter) or default to 2
      const projectId = typeof window !== 'undefined'
        ? (window as any).__EQUIPMENT_MAPPING_PROJECT_ID__ || 2
        : 2;

      // Use mock data by default (set to false to use real database)
      const useMock = true;

      console.log(`[Dashboard] Fetching CxAlloy equipment for project ${projectId}... (useMock: ${useMock})`);
      const data = await apiAdapter.fetchCxAlloyEquipment(projectId, useMock);

      if (data.success && data.equipment) {
        console.log(`[Dashboard] Loaded ${data.equipment.length} CxAlloy equipment items${data.isMockData ? ' (MOCK DATA)' : ''}`);
        setCxAlloyEquipment(data.equipment);
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
      console.log('[Dashboard] Equipment mappings:', equipmentMappings.length);
      console.log('[Dashboard] Tracked points by equipment:', trackedPointsByEquipment);

      // Track missing points for reporting
      const missingPointsData: Array<{
        equipmentName: string;
        missingPoints: string[];
      }> = [];

      // Prepare mappings data with tracked points
      const mappingsToSave = await Promise.all(equipmentMappings.map(async (mapping) => {
        // Debug: Log the mapping object to see its structure
        console.log('[Dashboard] Mapping object:', mapping);

        // Fetch full equipment data with points
        let bacnetEquipment = equipment.find(eq => eq.id === mapping.bacnetEquipmentId);

        // If equipment doesn't have points, fetch them
        if (bacnetEquipment && (!bacnetEquipment.points || bacnetEquipment.points.length === 0)) {
          console.log('[Dashboard] Equipment has no points loaded, fetching...');
          try {
            const response = await fetch(`/api/equipment/${bacnetEquipment.id}`);
            const data = await response.json();
            if (data.success && data.points) {
              bacnetEquipment = {
                ...bacnetEquipment,
                points: data.points
              };
              console.log('[Dashboard] Loaded', data.points.length, 'points for equipment');
            }
          } catch (err) {
            console.error('[Dashboard] Failed to fetch equipment points:', err);
          }
        }

        console.log('[Dashboard] bacnetEquipment:', bacnetEquipment);
        console.log('[Dashboard] bacnetEquipment.points:', bacnetEquipment?.points);
        console.log('[Dashboard] bacnetEquipment.points.length:', bacnetEquipment?.points?.length);

        // Try both property names to handle different type definitions
        const cxalloyId = (mapping as any).cxalloyEquipmentId || (mapping as any).cxAlloyEquipmentId;
        const cxalloyEquipment = cxAlloyEquipment.find(eq => eq.id === cxalloyId?.toString());

        // Get tracked points for THIS specific equipment from trackedPointsByEquipment
        const trackedPointIds = trackedPointsByEquipment[mapping.bacnetEquipmentId] || new Set();
        console.log(`[Dashboard] Looking for tracked points with equipment ID: ${mapping.bacnetEquipmentId}`);
        console.log('[Dashboard] trackedPointIds for this equipment:', trackedPointIds);
        console.log('[Dashboard] trackedPointIds size:', trackedPointIds.size);

        // Track missing points for this equipment
        const missingForThisEquipment: string[] = [];

        // Convert tracked point IDs to full point data
        const trackedPoints = Array.from(trackedPointIds).map(pointId => {
          // Find the point in the equipment's points array
          const point = bacnetEquipment?.points?.find(p =>
            (p.originalPointId || p.originalName) === pointId
          );

          if (!point) {
            console.warn(`[Dashboard] Point ${pointId} not found in equipment ${mapping.bacnetEquipmentId}`);
            missingForThisEquipment.push(pointId);
            return null;
          }

          return {
            id: point.originalPointId || point.originalName,
            originalName: point.originalName,
            normalizedName: point.normalizedName,
            displayName: point.originalName,
            description: point.originalDescription || point.normalizedName,
            category: point.category || 'Unknown',
            dataType: point.dataType || 'Unknown',
            units: point.units || '',
            bacnetObjectType: point.objectType,
            bacnetObjectInstance: point.objectInstance,
            vendorName: 'Unknown'
          };
        }).filter(Boolean); // Remove null entries

        // Record missing points for this equipment if any
        if (missingForThisEquipment.length > 0) {
          missingPointsData.push({
            equipmentName: bacnetEquipment?.name || cxalloyEquipment?.name || 'Unknown Equipment',
            missingPoints: missingForThisEquipment
          });
        }

        console.log(`[Dashboard] Equipment ${bacnetEquipment?.name}: ${trackedPoints.length} tracked points`);

        return {
          bacnetEquipmentId: mapping.bacnetEquipmentId,
          bacnetEquipmentName: bacnetEquipment?.name || 'Unknown',
          cxalloyEquipmentId: cxalloyId,
          cxalloyEquipmentName: cxalloyEquipment?.name || 'Unknown',
          trackedPoints
        };
      }));
      
      console.log(`[Dashboard] Saving ${mappingsToSave.length} equipment mappings with tracked points...`);

      // Log summary of what we're sending
      mappingsToSave.forEach(m => {
        console.log(`[Dashboard] → ${m.bacnetEquipmentName} (${m.bacnetEquipmentId}) → ${m.cxalloyEquipmentName} (${m.cxalloyEquipmentId}): ${m.trackedPoints.length} points`);
      });

      console.log('[Dashboard] Full payload:', JSON.stringify(mappingsToSave, null, 2));

      const response = await fetch('/api/save-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentMappings: mappingsToSave })
      });
      
      const data = await response.json();

      if (data.success) {
        console.log('[Dashboard] Mappings saved successfully:', data.data);

        // Show missing points report if any points were not found
        if (missingPointsData.length > 0) {
          setMissingPointsReport(missingPointsData);
        }

        // Build detailed message
        let message = `Successfully saved ${data.data.equipmentMappingsSaved} equipment mappings and ${data.data.totalPointsSaved} tracked points to CxAlloy database!`;

        if (missingPointsData.length > 0) {
          const totalMissing = missingPointsData.reduce((sum, item) => sum + item.missingPoints.length, 0);
          message += `\n\n⚠️ Note: ${totalMissing} tracked points could not be found on ${missingPointsData.length} equipment(s) and were not saved. A detailed report will be shown.`;
        }

        if (data.data.totalPointsFailed > 0) {
          message += `\n\n⚠️ Warning: ${data.data.totalPointsFailed} points failed to save.`;

          // Show first few errors
          if (data.data.errors && data.data.errors.length > 0) {
            const errorSummary = data.data.errors.slice(0, 3).map((e: any) =>
              `  • ${e.equipment} - ${e.point}: ${e.error}`
            ).join('\n');
            message += `\n\nFirst errors:\n${errorSummary}`;

            if (data.data.errors.length > 3) {
              message += `\n... and ${data.data.errors.length - 3} more errors (check console for details)`;
            }
          }

          console.error('[Dashboard] Point save errors:', data.data.errors);
        }

        alert(message);
      } else {
        console.error('[Dashboard] Save mappings API error:', data);

        // Build detailed error message
        let errorMessage = data.message || data.error || 'Failed to save mappings';

        if (data.data?.errors && data.data.errors.length > 0) {
          const errorDetails = data.data.errors.slice(0, 5).map((e: any) =>
            `  • ${e.equipment} - ${e.point}: ${e.error}`
          ).join('\n');
          errorMessage += `\n\nErrors:\n${errorDetails}`;

          if (data.data.errors.length > 5) {
            errorMessage += `\n... and ${data.data.errors.length - 5} more errors`;
          }
        }

        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('[Dashboard] Save mappings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save mappings');
      alert(`Error saving mappings:\n\n${err instanceof Error ? err.message : 'Failed to save mappings'}`);
    } finally {
      setSavingMappings(false);
    }
  }, [equipmentMappings, equipment, cxAlloyEquipment, trackedPointsByEquipment]);

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
    // Initial data load - only run once on mount
    // Skip auto-refresh when embedded in CodeIgniter
    const isEmbedded = typeof (window as any).__EQUIPMENT_MAPPING_API__ !== 'undefined';

    if (!isEmbedded) {
      handleRefresh();
    } else {
      // Just load the equipment data without refresh
      fetchEquipment(1, {});
      fetchCxAlloyEquipment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <DashboardHeader
        onRefresh={handleRefresh}
        loading={isLoading || autoMappingInProgress}
        onAutoMap={handleAutoMap}
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

      {/* Missing Points Report Modal */}
      {missingPointsReport && (
        <MissingPointsReportModal
          isOpen={missingPointsReport !== null}
          onClose={() => setMissingPointsReport(null)}
          missingPointsData={missingPointsReport}
        />
      )}

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