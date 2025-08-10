import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, htmlContent, textContent, category, isActive, variables } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Name, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    // For now, just return success since we don't have a templates table
    // In a real implementation, you would update in database
    const updatedTemplate = {
      id: params.id,
      name,
      subject,
      htmlContent,
      textContent: textContent || '',
      variables: variables || [],
      category: category || 'notification',
      isActive: isActive !== false,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // For now, just return success since we don't have a templates table
    // In a real implementation, you would delete from database
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}