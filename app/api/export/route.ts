import { NextRequest, NextResponse } from 'next/server';
import { getAllEquipment } from '../../../lib/stores/equipment-store';
import type { Equipment } from '../../../types/equipment';
import type { NormalizedPoint } from '../../../types/normalized';

interface ExportRequest {
  equipmentIds?: string[];
  format: 'csv' | 'json' | 'trio' | 'haystack';
  includePoints?: boolean;
  includeMetadata?: boolean;
}

interface ExportResponse {
  success: boolean;
  data?: string;
  filename?: string;
  contentType?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExportResponse | ArrayBuffer>> {
  try {
    const body = await request.json() as ExportRequest;
    const { equipmentIds, format, includePoints = true, includeMetadata = true } = body;

    if (!format) {
      return NextResponse.json(
        { success: false, error: 'Export format is required' },
        { status: 400 }
      );
    }

    // Get equipment data
    const allEquipmentResult = await getAllEquipment();
    const allEquipment = allEquipmentResult.equipment;
    const equipment = equipmentIds 
      ? allEquipment.filter(eq => equipmentIds.includes(eq.id))
      : allEquipment;

    if (equipment.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No equipment found to export' },
        { status: 404 }
      );
    }

    // Generate export data based on format
    switch (format) {
      case 'json':
        return exportAsJSON(equipment, includePoints, includeMetadata);
      
      case 'csv':
        return exportAsCSV(equipment, includePoints, includeMetadata);
      
      case 'trio':
        return exportAsTrio(equipment, includePoints);
      
      case 'haystack':
        return exportAsHaystack(equipment, includePoints);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported export format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

function exportAsJSON(
  equipment: Equipment[], 
  includePoints: boolean, 
  includeMetadata: boolean
): NextResponse<ExportResponse> {
  const exportData = {
    metadata: includeMetadata ? {
      exportedAt: new Date().toISOString(),
      equipmentCount: equipment.length,
      format: 'json',
      version: '1.0'
    } : undefined,
    equipment: equipment.map(eq => ({
      ...eq,
      pointCount: includePoints && eq.points ? eq.points.length : undefined
    }))
  };

  const jsonData = JSON.stringify(exportData, null, 2);
  const filename = `equipment_export_${Date.now()}.json`;

  return NextResponse.json({
    success: true,
    data: jsonData,
    filename,
    contentType: 'application/json'
  });
}

function exportAsCSV(
  equipment: Equipment[], 
  includePoints: boolean, 
  includeMetadata: boolean
): NextResponse<ExportResponse> {
  const headers = [
    'Equipment ID',
    'Name',
    'Type',
    'Vendor',
    'Model',
    'Description'
  ];

  if (includePoints) {
    headers.push('Point Count');
  }

  let csvContent = headers.join(',') + '\n';

  // Add metadata as comments if requested
  if (includeMetadata) {
    csvContent = `# Equipment Export\n# Generated: ${new Date().toISOString()}\n# Equipment Count: ${equipment.length}\n\n` + csvContent;
  }

  // Add equipment data
  for (const eq of equipment) {
    const row = [
      `"${eq.id}"`,
      `"${eq.name}"`,
      `"${eq.type}"`,
      `"${eq.vendor || ''}"`,
      `"${eq.model || ''}"`,
      `"${eq.description || ''}"`
    ];

    if (includePoints) {
      row.push(eq.points?.length.toString() || '0');
    }

    csvContent += row.join(',') + '\n';
  }

  const filename = `equipment_export_${Date.now()}.csv`;

  return NextResponse.json({
    success: true,
    data: csvContent,
    filename,
    contentType: 'text/csv'
  });
}

function exportAsTrio(
  equipment: Equipment[], 
  includePoints: boolean
): NextResponse<ExportResponse> {
  let trioContent = '';

  // Add header comment
  trioContent += `// Equipment Export - Trio Format\n`;
  trioContent += `// Generated: ${new Date().toISOString()}\n`;
  trioContent += `// Equipment Count: ${equipment.length}\n\n`;

  for (const eq of equipment) {
    // Equipment record
    trioContent += `id:${eq.id}\n`;
    trioContent += `dis:"${eq.name}"\n`;
    trioContent += `equipType:"${eq.type}"\n`;
    if (eq.vendor) trioContent += `vendor:"${eq.vendor}"\n`;
    if (eq.model) trioContent += `model:"${eq.model}"\n`;
    if (eq.description) trioContent += `desc:"${eq.description}"\n`;
    trioContent += `equip\n`;
    trioContent += `point\n`;
    trioContent += `---\n`;

    // Add placeholder for points if requested
    if (includePoints && eq.points && eq.points.length > 0) {
      trioContent += `// Points for ${eq.name} (${eq.points.length} total)\n`;
      trioContent += `// Point details would be added here\n\n`;
    }
  }

  const filename = `equipment_export_${Date.now()}.trio`;

  return NextResponse.json({
    success: true,
    data: trioContent,
    filename,
    contentType: 'text/plain'
  });
}

function exportAsHaystack(
  equipment: Equipment[], 
  includePoints: boolean
): NextResponse<ExportResponse> {
  const haystackData = {
    meta: {
      ver: "3.0",
      format: "json",
      ts: new Date().toISOString(),
      generator: "CxAlloy Equipment Mapping"
    },
    cols: [
      { name: "id" },
      { name: "dis" },
      { name: "equip", meta: { marker: {} } },
      { name: "equipType" },
      { name: "vendor" },
      { name: "model" },
      { name: "description" }
    ],
    rows: equipment.map(eq => ({
      id: `r:${eq.id}`,
      dis: `s:${eq.name}`,
      equip: "m:",
      equipType: `s:${eq.type}`,
      vendor: eq.vendor ? `s:${eq.vendor}` : null,
      model: eq.model ? `s:${eq.model}` : null,
      description: eq.description ? `s:${eq.description}` : null
    }))
  };

  const jsonData = JSON.stringify(haystackData, null, 2);
  const filename = `equipment_export_haystack_${Date.now()}.json`;

  return NextResponse.json({
    success: true,
    data: jsonData,
    filename,
    contentType: 'application/json'
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  return NextResponse.json({
    message: 'Export endpoint',
    supportedFormats: ['json', 'csv', 'trio', 'haystack'],
    usage: 'POST with format and optional equipmentIds',
    example: {
      format: format || 'json',
      equipmentIds: ['optional-array-of-ids'],
      includePoints: true,
      includeMetadata: true
    }
  });
} 