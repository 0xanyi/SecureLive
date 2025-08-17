import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Call the database function to deactivate expired event bulk codes
    const { data: result, error } = await supabase
      .rpc('deactivate_expired_event_bulk_codes');

    if (error) {
      console.error('Error deactivating expired event bulk codes:', error);
      return NextResponse.json({ error: 'Failed to cleanup expired codes' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      deactivated_codes: result || 0,
      message: `Deactivated ${result || 0} expired event bulk codes`
    });
  } catch (error) {
    console.error('Error in cleanup expired POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow GET requests for scheduled jobs or health checks
export async function GET() {
  try {
    // Call the database function to deactivate expired event bulk codes
    const { data: result, error } = await supabase
      .rpc('deactivate_expired_event_bulk_codes');

    if (error) {
      console.error('Error deactivating expired event bulk codes:', error);
      return NextResponse.json({ error: 'Failed to cleanup expired codes' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      deactivated_codes: result || 0,
      message: `Deactivated ${result || 0} expired event bulk codes`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cleanup expired GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}