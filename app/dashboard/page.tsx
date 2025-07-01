'use client';

import React, { useState } from 'react';
import { ThreePanelLayout } from '../../components/layout/ThreePanelLayout';
import { EquipmentBrowser } from '../../components/equipment/EquipmentBrowser';
import { PointDetails } from '../../components/points/PointDetails';
import { CxAlloyPanel } from '../../components/mapping/CxAlloyPanel';
import { Button } from '../../components/ui/button';
import { FileUploadDialog } from '../../components/ui/file-upload-dialog';
import { useAppStore } from '../../store/app-store';
import { 
  Upload, 
  Settings, 
  Download,
  RefreshCw,
  TestTube
} from 'lucide-react';
import Link from 'next/link';
import { EquipmentStatus, ConnectionState } from '../../types/equipment';

function DashboardHeader({ onRefresh }: { onRefresh: () => void }) {
  const { isLoading, setLoading } = useAppStore();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleUpload = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadComplete = (results: any[]) => {
    console.log('Upload completed:', results);
    // Here you can update the equipment store or trigger a refresh
    // For now, we'll just close the dialog and show a success message
    setUploadDialogOpen(false);
    
    // Optional: trigger a refresh to show the new data after a short delay
    // This prevents rapid API calls immediately after upload
    setTimeout(() => {
      if (!isLoading) { // Only refresh if not already loading
        onRefresh();
      }
    }, 1000); // 1 second delay
  };

  const handleRefresh = () => {
    onRefresh();
  };

  const handleExport = () => {
    // This would trigger export functionality
    console.log('Export mappings');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            CxAlloy Equipment Mapping
          </h1>
          <p className="text-sm text-muted-foreground">
            Building Automation Equipment Mapping for BACnet trio files
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/test">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              title="Test Dashboard"
            >
              <TestTube className="h-4 w-4" />
              Tests
            </Button>
          </Link>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          <Button
            onClick={handleUpload}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Trio Files
          </Button>
        </div>
      </div>

      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { setEquipment, setCxAlloyEquipment, setLoading, isLoading } = useAppStore();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load equipment data on component mount with request deduplication
  React.useEffect(() => {
    // Prevent multiple simultaneous requests
    if (hasInitialized || isLoading) {
      return;
    }

    const fetchEquipment = async () => {
      setHasInitialized(true);
      setLoading(true);
      
      try {
        const response = await fetch('/api/equipment?limit=100');
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limit exceeded, retrying in 2 seconds...');
            // Retry after a delay for rate limiting
            setTimeout(() => {
              setHasInitialized(false);
              setLoading(false);
            }, 2000);
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.equipment) {
          setEquipment(data.equipment);
        } else {
          console.error('Failed to load equipment data:', data.error);
          setEquipment([]);
        }
      } catch (error) {
        console.error('Error fetching equipment:', error);
        setEquipment([]);
        // Reset initialization flag on error so user can retry
        setHasInitialized(false);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [setEquipment, setLoading, hasInitialized, isLoading]);

  // Create a refresh function for the header
  const handleRefresh = React.useCallback(() => {
    // Reset initialization flag to allow fresh data fetch
    setHasInitialized(false);
  }, []);

  return (
    <ThreePanelLayout
      header={<DashboardHeader onRefresh={handleRefresh} />}
      leftPanel={<EquipmentBrowser />}
      middlePanel={<PointDetails />}
      rightPanel={<CxAlloyPanel />}
    />
  );
} 