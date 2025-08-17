import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const eventId = url.searchParams.get('event_id');

    // Get available bulk codes (active bulk codes that are not expired)
    let query = supabase
      .from('access_codes')
      .select(`
        id,
        code,
        name,
        usage_count,
        max_usage_count,
        expires_at,
        event_id,
        created_at
      `)
      .eq('type', 'bulk')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // If event_id is provided, also include codes already linked to this event
    if (eventId) {
      query = query.or(`event_id.is.null,event_id.eq.${eventId}`);
    } else {
      query = query.is('event_id', null);
    }

    const { data: bulkCodes, error } = await query;

    if (error) {
      console.error('Error fetching bulk codes:', error);
      return NextResponse.json({ error: 'Failed to fetch bulk codes' }, { status: 500 });
    }

    // Filter out expired codes and add computed fields
    const now = new Date();
    const availableCodes = (bulkCodes || [])
      .filter(code => !code.expires_at || new Date(code.expires_at) > now)
      .map(code => ({
        ...code,
        capacity_percentage: code.max_usage_count > 0 
          ? Math.round((code.usage_count / code.max_usage_count) * 100) 
          : 0,
        is_linked_to_event: !!code.event_id,
        is_linked_to_current_event: code.event_id === eventId
      }));

    return NextResponse.json({ bulk_codes: availableCodes });
  } catch (error) {
    console.error('Error in bulk codes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}