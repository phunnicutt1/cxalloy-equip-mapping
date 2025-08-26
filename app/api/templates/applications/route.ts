import { NextRequest, NextResponse } from 'next/server';
import { TemplateDbService } from '../../../../database/template-db-service';
import { UnifiedTemplateApplication } from '../../../../types/unified-template';

interface ApplicationResponse {
  success: boolean;
  applications?: UnifiedTemplateApplication[];
  application?: UnifiedTemplateApplication;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApplicationResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    
    const applications = await TemplateDbService.getTemplateApplications(templateId || undefined);
    
    return NextResponse.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Template applications GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApplicationResponse>> {
  try {
    const application = await request.json() as UnifiedTemplateApplication;
    
    if (!application.templateId || !application.targetEquipmentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await TemplateDbService.recordTemplateApplication(application);
    
    return NextResponse.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Template applications POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}