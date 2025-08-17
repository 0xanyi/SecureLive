import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Get event attendance using the database function
    const { data: attendance, error } = await supabase
      .rpc('get_event_attendance', { p_event_id: params.id });

    if (error) {
      console.error('Error fetching event attendance:', error);
      return NextResponse.json({ error: 'Failed to fetch event attendance' }, { status: 500 });
    }

    // The function returns an array, but we want the first (and only) result
    const attendanceData = attendance && attendance.length > 0 ? attendance[0] : {
      event_id: params.id,
      event_title: 'Unknown Event',
      total_attendees: 0,
      bulk_code_attendees: 0,
      individual_attendees: 0,
      center_attendees: 0,
      active_sessions: 0
    };

    return NextResponse.json({ attendance: attendanceData });
  } catch (error) {
    console.error('Error in event attendance GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}