import { NextRequest, NextResponse } from 'next/server';
import { processingService } from '@/lib/services/processing-service';
import type { Equipment, EquipmentStatus } from '@/types/equipment';

interface EquipmentResponse {
  success: boolean;
  message: string;
  equipment?: Equipment;
  error?: string;
}

interface EquipmentUpdateRequest {
  name?: string;
  displayName?: string;
  description?: string;
  vendor?: string;
  model?: string;
  status?: EquipmentStatus;
  connectionStatus?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<EquipmentResponse>> {
  try {
    const { id: equipmentId } = await params;

    if (!equipmentId) {
      return NextResponse.json({
        success: false,
        message: 'Equipment ID is required',
        error: 'Missing equipment ID'
      }, { status: 400 });
    }

    // Get processing status to find equipment
    const status = processingService.getProcessingStatus(equipmentId);
    
    if (!status || !status.result || !status.result.success) {
      return NextResponse.json({
        success: false,
        message: 'Equipment not found',
        error: 'Equipment not found or processing not completed'
      }, { status: 404 });
    }

    const equipment = status.result.equipment[0];
    
    if (!equipment) {
      return NextResponse.json({
        success: false,
        message: 'Equipment data not available',
        error: 'No equipment data found in processing result'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Equipment retrieved successfully',
      equipment
    });

  } catch (error) {
    console.error('Equipment GET error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve equipment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<EquipmentResponse>> {
  try {
    const { id: equipmentId } = await params;
    const updates: EquipmentUpdateRequest = await request.json();

    if (!equipmentId) {
      return NextResponse.json({
        success: false,
        message: 'Equipment ID is required',
        error: 'Missing equipment ID'
      }, { status: 400 });
    }

    // Get processing status to find equipment
    const status = processingService.getProcessingStatus(equipmentId);
    
    if (!status || !status.result || !status.result.success) {
      return NextResponse.json({
        success: false,
        message: 'Equipment not found',
        error: 'Equipment not found or processing not completed'
      }, { status: 404 });
    }

    const equipment = status.result.equipment[0];
    
    if (!equipment) {
      return NextResponse.json({
        success: false,
        message: 'Equipment data not available',
        error: 'No equipment data found in processing result'
      }, { status: 404 });
    }

    // Update equipment properties
    const updatedEquipment: Equipment = {
      ...equipment,
      ...updates,
      updatedAt: new Date()
    };

    // Update the processing result (in a real application, this would be saved to a database)
    status.result.equipment[0] = updatedEquipment;

    return NextResponse.json({
      success: true,
      message: 'Equipment updated successfully',
      equipment: updatedEquipment
    });

  } catch (error) {
    console.error('Equipment PUT error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update equipment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean; message: string; error?: string }>> {
  try {
    const { id: equipmentId } = await params;

    if (!equipmentId) {
      return NextResponse.json({
        success: false,
        message: 'Equipment ID is required',
        error: 'Missing equipment ID'
      }, { status: 400 });
    }

    // Get processing status to check if equipment exists
    const status = processingService.getProcessingStatus(equipmentId);
    
    if (!status) {
      return NextResponse.json({
        success: false,
        message: 'Equipment not found',
        error: 'Equipment not found'
      }, { status: 404 });
    }

    // In a real application, this would delete from database
    // For now, we'll just mark the processing job as deleted
    status.status = 'failed';
    status.error = 'Equipment deleted by user';
    status.endTime = new Date();

    return NextResponse.json({
      success: true,
      message: 'Equipment deleted successfully'
    });

  } catch (error) {
    console.error('Equipment DELETE error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete equipment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 