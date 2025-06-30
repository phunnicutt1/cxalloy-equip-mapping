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
  RefreshCw
} from 'lucide-react';
import { EquipmentStatus, ConnectionState } from '../../types/equipment';

function DashboardHeader() {
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
    
    // Optional: trigger a refresh to show the new data
    handleRefresh();
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => setLoading(false), 1000);
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
  const { setEquipment, setCxAlloyEquipment } = useAppStore();

  // Initialize with mock data on component mount
  React.useEffect(() => {
    // Mock BACnet equipment data
    const mockEquipment = [
      {
        id: 'vav-1',
        name: 'VVR_2.1',
        displayName: 'VAV Controller Room 2.1',
        type: 'VAV Controller',
        filename: 'VVR_2.1.trio',
        vendor: 'Johnson Controls',
        modelName: 'VMA1400',
        model: 'VMA1400',
        description: 'Variable Air Volume Controller Room 2.1',
        status: EquipmentStatus.OPERATIONAL,
        connectionState: ConnectionState.OPEN,
        connectionStatus: 'ok',
        createdAt: new Date(),
        updatedAt: new Date(),
        points: [
          {
            id: 'point-1',
            originalName: 'ROOM TEMP 4',
            normalizedName: 'Room Temperature Sensor',
            description: 'Room temperature measurement',
            objectType: 'AI',
            unit: '°F',
            dataType: 'Number',
            kind: 'Number',
            bacnetCur: 'AI39',
            haystackTags: ['sensor', 'temp', 'room', 'zone']
          },
          {
            id: 'point-2',
            originalName: 'DAMPER POS 5',
            normalizedName: 'Supply Air Damper Position',
            description: 'Supply air VAV damper position command',
            objectType: 'AO',
            unit: '%',
            dataType: 'Number',
            kind: 'Number',
            bacnetCur: 'AO0',
            writable: true,
            haystackTags: ['cmd', 'damper', 'position', 'supply', 'air']
          }
        ]
      },
      {
        id: 'lab-1',
        name: 'L_5',
        displayName: 'Lab Air Valve 5',
        type: 'Lab Air Valve',
        filename: 'L_5.trio',
        vendor: 'Belimo',
        modelName: 'LRX24-3',
        model: 'LRX24-3',
        description: 'Laboratory Exhaust Air Valve Controller',
        status: EquipmentStatus.OPERATIONAL,
        connectionState: ConnectionState.OPEN,
        connectionStatus: 'ok',
        createdAt: new Date(),
        updatedAt: new Date(),
        points: [
          {
            id: 'point-3',
            originalName: 'EX DIFF P 1',
            normalizedName: 'Extract Air Differential Pressure',
            description: 'Extract air VAV differential pressure sensor',
            objectType: 'AI',
            unit: 'inH₂O',
            dataType: 'Number',
            kind: 'Number',
            bacnetCur: 'AI744',
            haystackTags: ['sensor', 'pressure', 'diff', 'extract', 'air']
          }
        ]
      },
      {
        id: 'rtu-1',
        name: 'RTU_2',
        displayName: 'Rooftop Unit 2',
        type: 'RTU Controller',
        filename: 'RTU_2.trio',
        vendor: 'Carrier',
        modelName: 'CCN7000',
        model: 'CCN7000',
        description: 'Rooftop Unit Controller',
        status: EquipmentStatus.OPERATIONAL,
        connectionState: ConnectionState.OPEN,
        connectionStatus: 'ok',
        createdAt: new Date(),
        updatedAt: new Date(),
        points: []
      }
    ];

    // Mock CxAlloy equipment data
    const mockCxAlloyEquipment = [
      {
        id: 'cx-vav-101',
        name: 'VAV-101',
        type: 'VAV Terminal',
        description: 'Variable Air Volume Terminal Unit',
        location: 'Floor 2, Room 101',
        zone: 'Zone A',
        system: 'AHU-1'
      },
      {
        id: 'cx-vav-102',
        name: 'VAV-102',
        type: 'VAV Terminal',
        description: 'Variable Air Volume Terminal Unit',
        location: 'Floor 2, Room 102',
        zone: 'Zone A',
        system: 'AHU-1'
      },
      {
        id: 'cx-lab-201',
        name: 'LAB-201',
        type: 'Laboratory Equipment',
        description: 'Laboratory Fume Hood Controller',
        location: 'Floor 2, Lab 201',
        zone: 'Lab Zone',
        system: 'Exhaust-1'
      },
      {
        id: 'cx-rtu-roof1',
        name: 'RTU-ROOF1',
        type: 'Rooftop Unit',
        description: 'Rooftop Air Handling Unit',
        location: 'Roof, Section 1',
        zone: 'Mechanical',
        system: 'Primary HVAC'
      }
    ];

    setEquipment(mockEquipment);
    setCxAlloyEquipment(mockCxAlloyEquipment);
  }, [setEquipment, setCxAlloyEquipment]);

  return (
    <ThreePanelLayout
      header={<DashboardHeader />}
      leftPanel={<EquipmentBrowser />}
      middlePanel={<PointDetails />}
      rightPanel={<CxAlloyPanel />}
    />
  );
} 