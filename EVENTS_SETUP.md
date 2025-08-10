# Events Feature Setup Instructions

## Database Setup

1. **Update Database Schema**

   - The events table and functions have been added to `supabase-schema.sql`
   - If you haven't set up the database yet, run the entire `supabase-schema.sql` file
   - If you already have the database set up, you can run just the events section (from line with "Events table for live streaming sessions" to the end)

2. **Alternative: Run Events Schema Only**
   - Use the separate `events-schema.sql` file if you prefer to add just the events functionality

## Features Added

### Admin Dashboard

- **Events Management**: New "Events" section in admin sidebar
- **Create/Edit Events**: Full CRUD operations for events
- **Event Status**: Live, upcoming, past, and inactive event tracking
- **Event Duration**: Real-time progress tracking and time remaining

### Login Page

- **Current Event Banner**: Shows active events with live indicator
- **Event Information**: Displays event title, description, and time remaining
- **Auto-refresh**: Updates every minute to show current status

### Stream Page

- **Event Info Sidebar**: Shows current event details in the stream interface
- **Progress Bar**: Visual progress indicator for event duration
- **Real-time Updates**: Time remaining updates automatically

## API Endpoints

### Admin Endpoints (Require Authentication)

- `GET /api/admin/events` - List all events
- `POST /api/admin/events` - Create new event
- `PUT /api/admin/events/[id]` - Update event
- `DELETE /api/admin/events/[id]` - Delete event
- `GET /api/admin/events/current` - Get current active event

### Public Endpoints

- `GET /api/events/current` - Get current active event (for login page)

## Usage

1. **Create an Event**

   - Go to Admin → Events
   - Click "Create New Event"
   - Fill in event details (title, description, start/end times)
   - Save the event

2. **Event Display**

   - Active events automatically appear on the login page
   - Stream page shows event information in the sidebar
   - Progress and time remaining update in real-time

3. **Event Management**
   - Edit events from the admin panel
   - Toggle events active/inactive
   - View event status (Live, Upcoming, Past, Inactive)

## Event States

- **Live**: Event is currently active (between start and end time)
- **Upcoming**: Event is scheduled for the future
- **Past**: Event has ended
- **Inactive**: Event is disabled by admin

## Technical Details

- Events are stored in the `events` table
- Real-time calculations using PostgreSQL functions
- Client-side auto-refresh every 60 seconds
- Responsive design for all screen sizes
- Full TypeScript support with proper type definitions
