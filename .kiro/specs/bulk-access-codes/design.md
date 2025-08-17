# Design Document

## Overview

The bulk access codes feature extends the existing access code system to support high-capacity, time-limited codes that can accommodate up to 400 users. This feature addresses the challenge of managing large-scale events by providing a single code that multiple users can share, while maintaining proper usage tracking and capacity management.

The design leverages the existing database schema and authentication patterns, introducing a new code type and enhanced tracking mechanisms to support bulk usage scenarios.

## Architecture

### Database Schema Extensions

The existing `access_codes` table will be extended to support bulk codes through:

1. **New Code Type**: Add `'bulk'` to the existing type enum (`'center' | 'individual' | 'bulk'`)
2. **Usage Tracking**: New `usage_count` column to track current usage
3. **Capacity Management**: New `max_usage_count` column to define capacity limit
4. **Enhanced Expiration**: Leverage existing `expires_at` column with automatic 24-hour setting

```sql
-- Schema modifications needed:
ALTER TABLE access_codes 
ADD COLUMN usage_count INTEGER DEFAULT 0,
ADD COLUMN max_usage_count INTEGER DEFAULT 1;

-- Update type constraint
ALTER TABLE access_codes 
DROP CONSTRAINT IF EXISTS access_codes_type_check,
ADD CONSTRAINT access_codes_type_check 
CHECK (type IN ('center', 'individual', 'bulk'));
```

### Session Management Strategy

Bulk codes require a different session management approach:

- **Individual Session Tracking**: Each user gets their own session record
- **Shared Code Reference**: All sessions reference the same bulk access code
- **Usage Counter**: Increment on successful login, decrement on logout/expiration
- **Capacity Validation**: Check usage_count < max_usage_count before allowing new sessions

## Components and Interfaces

### 1. Database Layer Extensions

**Updated AccessCode Interface:**
```typescript
export interface AccessCode {
  id: string
  code: string
  type: 'center' | 'individual' | 'bulk'
  name: string
  email?: string
  max_concurrent_sessions: number
  usage_count?: number          // New field
  max_usage_count?: number      // New field
  is_active: boolean
  created_by: string
  created_at: string
  expires_at?: string
}
```

**New Bulk Code Validation Function:**
```sql
CREATE OR REPLACE FUNCTION check_bulk_code_capacity(p_code_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_access_code access_codes%ROWTYPE;
BEGIN
    SELECT * INTO v_access_code FROM access_codes 
    WHERE id = p_code_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- For bulk codes, check usage count against max capacity
    IF v_access_code.type = 'bulk' THEN
        RETURN v_access_code.usage_count < v_access_code.max_usage_count;
    END IF;
    
    -- For other types, use existing logic
    RETURN check_concurrent_sessions(p_code_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. API Layer Components

**Bulk Code Generation Endpoint:**
- Extend existing `/api/admin/codes/generate` to support bulk type
- Add validation for max_usage_count (1-400 range)
- Automatic 24-hour expiration setting

**Enhanced Authentication Endpoint:**
- Modify `/api/auth/code-login` to handle bulk code capacity checking
- Implement usage counter increment/decrement logic
- Add capacity exceeded error handling

**Usage Tracking Endpoints:**
- New endpoint for real-time usage monitoring
- Bulk code status endpoint with remaining capacity

### 3. UI Components

**Enhanced Code Generator:**
- Add "Bulk Code" option to existing CodeGenerator component
- Capacity input field (1-400 users)
- Automatic 24-hour expiration display
- Visual indicators for bulk code characteristics

**Bulk Code Management Interface:**
- Real-time usage display (e.g., "127/400 used")
- Progress bar for capacity visualization
- Warning indicators at 80% capacity
- Time remaining countdown

**Admin Dashboard Integration:**
- Bulk codes section in existing dashboard
- Usage analytics for bulk codes
- Capacity alerts and notifications

## Data Models

### Enhanced Access Code Model

```typescript
interface BulkAccessCode extends AccessCode {
  type: 'bulk'
  usage_count: number
  max_usage_count: number
  expires_at: string  // Always set for bulk codes
  capacity_percentage: number  // Computed field
  time_remaining_hours: number // Computed field
}
```

### Usage Tracking Model

```typescript
interface BulkCodeUsage {
  code_id: string
  current_usage: number
  max_capacity: number
  active_sessions: number
  capacity_percentage: number
  is_near_capacity: boolean  // >= 80%
  is_expired: boolean
  time_remaining_minutes: number
}
```

## Error Handling

### Capacity Management Errors

1. **Capacity Exceeded**: When usage_count >= max_usage_count
   - Error code: `BULK_CODE_CAPACITY_EXCEEDED`
   - Message: "This access code has reached its maximum capacity of {max_usage_count} users"

2. **Code Expired**: When current time > expires_at
   - Error code: `BULK_CODE_EXPIRED`
   - Message: "This access code expired on {expiration_date}"

3. **Invalid Bulk Code**: When code doesn't exist or is inactive
   - Error code: `BULK_CODE_INVALID`
   - Message: "Invalid or inactive access code"

### Concurrent Access Handling

- **Atomic Operations**: Use database transactions for usage counter updates
- **Race Condition Prevention**: Implement optimistic locking for capacity checks
- **Rollback Mechanism**: Decrement counter if session creation fails after increment

## Testing Strategy

### Unit Tests

1. **Database Functions**:
   - `check_bulk_code_capacity()` function with various scenarios
   - Usage counter increment/decrement operations
   - Expiration validation logic

2. **API Endpoints**:
   - Bulk code generation with valid/invalid parameters
   - Authentication with capacity checking
   - Usage tracking and status endpoints

3. **UI Components**:
   - Bulk code generator form validation
   - Real-time usage display updates
   - Capacity warning indicators

### Integration Tests

1. **End-to-End Scenarios**:
   - Create bulk code → Multiple users login → Capacity reached → New user rejected
   - Bulk code expiration → All active sessions terminated
   - Usage counter accuracy across concurrent logins

2. **Performance Tests**:
   - Concurrent login attempts (simulate 50+ simultaneous users)
   - Database performance with high usage counts
   - UI responsiveness with real-time updates

### Load Testing

1. **Capacity Stress Tests**:
   - 400 concurrent users attempting to use same bulk code
   - Database performance under high concurrent access
   - Session cleanup efficiency

2. **Expiration Handling**:
   - Bulk code expiration with active sessions
   - Cleanup of expired bulk codes and associated sessions

## Security Considerations

### Access Control

- **Admin-Only Creation**: Only administrators can create bulk codes
- **Usage Monitoring**: Track all bulk code usage for audit purposes
- **Automatic Expiration**: Enforce 24-hour maximum validity

### Abuse Prevention

- **Rate Limiting**: Prevent rapid-fire login attempts with same bulk code
- **IP Tracking**: Monitor for suspicious usage patterns
- **Capacity Limits**: Hard limit of 400 users per bulk code

### Data Privacy

- **Session Isolation**: Each user maintains separate session data
- **Usage Analytics**: Aggregate usage data without exposing individual user information
- **Audit Trail**: Maintain logs of bulk code creation and usage patterns

## Implementation Phases

### Phase 1: Database Schema Updates
- Add new columns to access_codes table
- Create bulk code validation functions
- Update existing constraints and indexes

### Phase 2: API Layer Extensions
- Modify code generation endpoint
- Update authentication logic
- Add usage tracking endpoints

### Phase 3: UI Components
- Enhance code generator interface
- Create bulk code management views
- Add real-time usage monitoring

### Phase 4: Testing and Optimization
- Comprehensive testing suite
- Performance optimization
- Security validation

This design maintains compatibility with the existing system while adding the necessary functionality for bulk access codes, ensuring scalability and proper resource management for large events.