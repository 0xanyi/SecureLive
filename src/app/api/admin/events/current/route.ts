import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .rpc('get_current_event');

    if (error) {
      console.error('Error fetching current event:', error);
      return NextResponse.json({ error: 'Failed to fetch current event' }, { status: 500 });
    }

    const event = data && data.length > 0 ? data[0] : null;

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in current event GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}