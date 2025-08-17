# Quick Database Fix for Bulk Code Authentication Error

The authentication error `BULK_CODE_DATABASE_ERROR` indicates that the required bulk code database functions are missing. Here's how to fix it:

## Option 1: Run Migrations in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run these migrations in order:

### Step 1: Add Bulk Code Support
Copy and paste the contents of `migrations/add-bulk-access-codes.sql` into the SQL editor and run it.

### Step 2: Add Optimized Functions
Copy and paste the contents of `migrations/optimize-bulk-code-functions.sql` into the SQL editor and run it.

## Option 2: Use Supabase CLI (if you have it set up)

```bash
# Apply the bulk code migrations
supabase db push

# Or apply specific migrations
supabase db reset --linked
```

## Option 3: Manual SQL Execution

If you prefer to run the SQL manually, here are the key functions that need to exist:

### Check if functions exist:
```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'check_bulk_code_capacity_optimized',
  'increment_bulk_code_usage_optimized', 
  'decrement_bulk_code_usage_optimized'
);
```

### Check if bulk type is supported:
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'access_codes_type_check'
);
```

## Verification

After running the migrations, verify the setup:

1. Check that `access_codes` table has these columns:
   - `usage_count` (integer)
   - `max_usage_count` (integer)
   - `type` constraint includes 'bulk'

2. Check that these functions exist:
   - `check_bulk_code_capacity_optimized(uuid)`
   - `increment_bulk_code_usage_optimized(uuid)`
   - `decrement_bulk_code_usage_optimized(uuid)`

## Test the Fix

After applying the migrations, try logging in with a bulk code again. The authentication should work without the database error.

## Common Issues

1. **Permission errors**: Make sure you're running the SQL with service role permissions
2. **Function conflicts**: If functions already exist but are outdated, the migrations will replace them
3. **Type constraints**: The migration will update the type constraint to include 'bulk'

## Next Steps

Once the database is fixed:
1. Restart your Next.js application
2. Test bulk code authentication
3. Monitor the logs for any remaining issues