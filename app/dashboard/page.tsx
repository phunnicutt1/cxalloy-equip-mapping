'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ThreePanelLayout } from '../../components/layout/ThreePanelLayout';
import { EquipmentBrowser } from '../../components/equipment/EquipmentBrowser';
import { PointDetails } from '../../components/points/PointDetails';
import { CxAlloyPanel } from '../../components/mapping/CxAlloyPanel';
import { useAppStore } from '../../store/app-store';
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Settings, TestTube, Upload } from 'lucide-react';

function DashboardHeader({ onRefresh, loading }: { onRefresh: () => void; loading: boolean; }) {
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
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
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
  const { equipment, fetchEquipment, isLoading } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/refresh');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to refresh data');
      }
      // Re-fetch equipment data after refresh
      await fetchEquipment(1, {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, [fetchEquipment]);

  useEffect(() => {
    // Initial data load
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <DashboardHeader onRefresh={handleRefresh} loading={isLoading} />
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
    </div>
  );
} 