# Quick Database Setup Guide

## 🚨 Database Tables Missing

The errors show that your Supabase database doesn't have the required tables yet. Here's how to fix it:

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

## Step 2: Run the Database Schema

1. Open the `supabase-schema.sql` file in this project
2. Copy ALL the contents of the file
3. Paste it into the Supabase SQL Editor
4. Click "Run" to execute the SQL

This will create:
- ✅ `admin_users` table
- ✅ `access_codes` table  
- ✅ `sessions` table
- ✅ `attendance_logs` table
- ✅ `email_logs` table
- ✅ `system_settings` table
- ✅ `events` table (NEW!)
- ✅ All required functions and views
- ✅ Row Level Security policies
- ✅ Indexes for performance

## Step 3: Verify Setup

After running the schema, refresh your application and:

1. Go to `/admin/events` - should load without errors
2. Try creating a test event
3. Check the login page for event display

## Alternative: Step-by-Step Setup

If you prefer to add just the events functionality to an existing database:

1. Find the section in `supabase-schema.sql` that starts with:
   ```sql
   -- Events table for live streaming sessions
   ```

2. Copy everything from that line to the end of the file

3. Run just that portion in the SQL Editor

## Troubleshooting

If you get permission errors:
- Make sure you're using the correct Supabase project
- Ensure you have admin access to the database
- Check that your environment variables are correct

If tables already exist:
- The schema uses `CREATE TABLE` (not `CREATE TABLE IF NOT EXISTS`)
- You may need to drop existing tables first, or modify the schema

## Environment Variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

## Next Steps

Once the database is set up:
1. ✅ Events management will work in admin panel
2. ✅ Login page will show active events  
3. ✅ Stream page will display event info
4. ✅ All API endpoints will function properly

The events feature is fully implemented - it just needs the database tables to exist!