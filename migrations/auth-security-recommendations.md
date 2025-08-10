# Auth Security Recommendations

Based on the Supabase linter warnings, here are the recommended auth security improvements:

## 1. Enable Leaked Password Protection

**Issue**: Leaked password protection is currently disabled.

**Fix**: In your Supabase dashboard:
1. Go to Authentication > Settings
2. Find "Password Protection" section
3. Enable "Check against HaveIBeenPwned database"

This will prevent users from using passwords that have been compromised in data breaches.

## 2. Enable Additional MFA Options

**Issue**: Insufficient MFA options are enabled.

**Fix**: In your Supabase dashboard:
1. Go to Authentication > Settings
2. Find "Multi-Factor Authentication" section
3. Enable additional MFA methods such as:
   - TOTP (Time-based One-Time Password)
   - SMS (if needed)
   - Phone verification

**Current Status**: Your project likely only has basic authentication enabled.

**Recommended**: Enable at least TOTP for better security.

## Implementation Notes

These are configuration changes that need to be made in the Supabase dashboard, not through SQL migrations. They affect the authentication service configuration rather than the database schema.

### Priority
- **High**: Enable leaked password protection (easy win for security)
- **Medium**: Enable TOTP MFA (improves account security significantly)
- **Low**: Additional MFA methods (SMS, etc.) - only if needed for your use case

### Impact
- No breaking changes to existing functionality
- Users with compromised passwords will be prompted to change them
- MFA will be optional for users unless you enforce it in your application logic