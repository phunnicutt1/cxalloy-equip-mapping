import { NextRequest, NextResponse } from 'next/server';
import { processingService } from '@/lib/services/processing-service';
import { exportToZinc, exportToSkySpark } from '../../../../lib/utils/haystack-validation';

interface ExportRequest {
  fileIds?: string[];
  format: 'json' | 'csv' | 'zinc' | 'skyspark';
  includeNormalized?: boolean;
  includeHaystackTags?: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ExportRequest = await request.json();
    const { fileIds, format, includeNormalized = true, includeHaystackTags = true } = body;

    if (!format) {
      return NextResponse.json({
        success: false,
        message: 'Export format is required',
        error: 'Missing format parameter'
      }, { status: 400 });
    }

    // Get all processing jobs if no specific fileIds provided
    const jobs = fileIds 
      ? fileIds.map(id => processingService.getProcessingStatus(id)).filter(Boolean)
      : processingService.getAllProcessingJobs();

    if (jobs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data available for export',
        error: 'No processing jobs found'
      }, { status: 404 });
    }

    // Collect all equipment data
    const validJobs = jobs.filter((job): job is NonNullable<typeof job> => 
      job !== null && job.result?.success === true && job.result.equipment.length > 0
    );
    const allEquipment = validJobs.flatMap(job => job.result!.equipment);

    if (allEquipment.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No equipment data available for export',
        error: 'No processed equipment found'
      }, { status: 404 });
    }

    // Generate export data based on format
    let exportData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify({
          exportedAt: new Date().toISOString(),
          totalEquipment: allEquipment.length,
          equipment: allEquipment.map(eq => ({
            id: eq.id,
            name: eq.name,
            displayName: eq.displayName,
            type: eq.type,
            filename: eq.filename,
            description: eq.description,
            status: eq.status,
            connectionStatus: eq.connectionStatus,
            vendor: eq.vendor,
            model: eq.model,
            createdAt: eq.createdAt,
            updatedAt: eq.updatedAt,
            points: eq.points?.map(point => ({
              id: point.id,
              originalName: point.originalName,
              normalizedName: includeNormalized ? point.normalizedName : undefined,
              description: point.description,
              objectType: point.objectType,
              unit: point.unit,
              dataType: point.dataType,
              kind: point.kind,
              bacnetCur: point.bacnetCur,
              writable: point.writable,
              haystackTags: includeHaystackTags ? point.haystackTags : undefined
            }))
          }))
        }, null, 2);
        contentType = 'application/json';
        filename = `equipment-export-${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'csv':
        // Generate CSV format
        const csvHeaders = [
          'Equipment ID',
          'Equipment Name',
          'Equipment Type',
          'Filename',
          'Point ID',
          'Original Point Name',
          ...(includeNormalized ? ['Normalized Point Name'] : []),
          'Point Description',
          'Object Type',
          'Unit',
          'Data Type',
          'BACnet Current',
          'Writable',
          ...(includeHaystackTags ? ['Haystack Tags'] : [])
        ];

        const csvRows = [csvHeaders.join(',')];
        
        for (const equipment of allEquipment) {
          if (equipment.points) {
            for (const point of equipment.points) {
              const row = [
                `"${equipment.id}"`,
                `"${equipment.name}"`,
                `"${equipment.type}"`,
                `"${equipment.filename}"`,
                `"${point.id}"`,
                `"${point.originalName}"`,
                ...(includeNormalized ? [`"${point.normalizedName || ''}"`] : []),
                `"${point.description || ''}"`,
                `"${point.objectType || ''}"`,
                `"${point.unit || ''}"`,
                `"${point.dataType || ''}"`,
                `"${point.bacnetCur || ''}"`,
                `"${point.writable || false}"`,
                ...(includeHaystackTags ? [`"${point.haystackTags?.join(';') || ''}"`] : [])
              ];
              csvRows.push(row.join(','));
            }
          }
        }

        exportData = csvRows.join('\n');
        contentType = 'text/csv';
        filename = `equipment-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'zinc':
        // Generate Haystack Zinc format
        if (!includeHaystackTags) {
          return NextResponse.json({
            success: false,
            message: 'Zinc format requires Haystack tags',
            error: 'Cannot export Zinc format without Haystack tags'
          }, { status: 400 });
        }

        const zincExports = [];
        for (const equipment of allEquipment) {
          if (equipment.points) {
            for (const point of equipment.points) {
              if (point.haystackTags && point.haystackTags.length > 0) {
                const tagSet = {
                  id: point.id,
                  dis: point.normalizedName || point.originalName,
                  markers: point.haystackTags,
                  values: {
                    equipRef: equipment.id,
                    objectType: point.objectType,
                    unit: point.unit
                  }
                } as any;
                zincExports.push(exportToZinc(tagSet));
              }
            }
          }
        }

        exportData = zincExports.join('\n---\n');
        contentType = 'text/plain';
        filename = `equipment-export-${new Date().toISOString().split('T')[0]}.zinc`;
        break;

      case 'skyspark':
        // Generate SkySpark format
        if (!includeHaystackTags) {
          return NextResponse.json({
            success: false,
            message: 'SkySpark format requires Haystack tags',
            error: 'Cannot export SkySpark format without Haystack tags'
          }, { status: 400 });
        }

        const skySparkExports = [];
        for (const equipment of allEquipment) {
          if (equipment.points) {
            for (const point of equipment.points) {
              if (point.haystackTags && point.haystackTags.length > 0) {
                const tagSet = {
                  id: point.id,
                  dis: point.normalizedName || point.originalName,
                  markers: point.haystackTags,
                  values: {
                    equipRef: equipment.id,
                    objectType: point.objectType,
                    unit: point.unit
                  }
                } as any;
                skySparkExports.push(exportToSkySpark(tagSet));
              }
            }
          }
        }

        exportData = skySparkExports.join('\n');
        contentType = 'text/plain';
        filename = `equipment-export-${new Date().toISOString().split('T')[0]}.axon`;
        break;

      default:
        return NextResponse.json({
          success: false,
          message: 'Unsupported export format',
          error: `Format '${format}' is not supported`
        }, { status: 400 });
    }

    // Return file as download
    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Export failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Equipment data export endpoint',
    supportedFormats: ['json', 'csv', 'zinc', 'skyspark'],
    method: 'POST',
    parameters: {
      fileIds: 'Array of file IDs to export (optional, exports all if not provided)',
      format: 'Export format: json, csv, zinc, or skyspark',
      includeNormalized: 'Include normalized point names (default: true)',
      includeHaystackTags: 'Include Haystack tags (default: true)'
    }
  });
} 