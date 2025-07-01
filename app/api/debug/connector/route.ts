import { NextRequest, NextResponse } from 'next/server';
import { connectorService } from '../../../../lib/services/connector-service';

export async function GET(request: NextRequest) {
  try {
    // Get all equipment metadata
    const allMetadata = connectorService.getAllEquipmentMetadata();
    
    // Convert Map to array for JSON serialization
    const metadataArray = Array.from(allMetadata.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
    
    // Get sample equipment metadata
    const sampleNames = ['WSHP_C1_Rm_719', 'EF_10A', 'Loop_Controller'];
    const samples = sampleNames.map(name => ({
      requestedName: name,
      metadata: connectorService.getEquipmentMetadata(name)
    }));
    
    return NextResponse.json({
      success: true,
      totalEquipment: allMetadata.size,
      samples,
      allEquipment: metadataArray.slice(0, 10) // First 10 for brevity
    });
  } catch (error) {
    console.error('[DEBUG CONNECTOR API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 