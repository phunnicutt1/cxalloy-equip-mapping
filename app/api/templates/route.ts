import { NextRequest, NextResponse } from 'next/server';
import { TemplateDbService } from '../../../database/template-db-service';
import {
  UnifiedTemplate,
  CreateUnifiedTemplateRequest,
  UpdateUnifiedTemplateRequest
} from '../../../types/unified-template';

interface TemplateResponse {
  success: boolean;
  templates?: UnifiedTemplate[];
  template?: UnifiedTemplate;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const equipmentType = searchParams.get('type');

    if (templateId) {
      // Get specific template
      const template = await TemplateDbService.getTemplateById(templateId);
      
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        template
      });
    }

    // Get all templates or filter by equipment type
    let templates: UnifiedTemplate[];
    
    if (equipmentType) {
      templates = await TemplateDbService.getTemplatesByEquipmentType(equipmentType);
    } else {
      templates = await TemplateDbService.getAllTemplates();
    }

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const body = await request.json() as CreateUnifiedTemplateRequest;
    console.log('[TEMPLATES API][POST] Incoming template create:', {
      name: body?.name,
      type: body?.equipmentType,
      points: Array.isArray(body?.points) ? body.points.length : 0
    });
    
    if (!body.name || !body.equipmentType || !body.points) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Guard against long-running DB operations
    const TIMEOUT_MS = 20000;
    const template = await Promise.race([
      TemplateDbService.createTemplate(body),
      new Promise<UnifiedTemplate>((_, reject) => setTimeout(() => reject(new Error('Template creation timed out')), TIMEOUT_MS))
    ]);

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('[TEMPLATES API][POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<TemplateResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const updates = await request.json() as UpdateUnifiedTemplateRequest;
    const updatedTemplate = await TemplateDbService.updateTemplate(templateId, updates);

    return NextResponse.json({
      success: true,
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Templates PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const deleted = await TemplateDbService.deleteTemplate(templateId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Template not found or is built-in' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Templates DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 