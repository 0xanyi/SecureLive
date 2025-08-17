# Implementation Plan

- [x] 1. Update database schema and types for bulk access codes

  - Add new columns (usage_count, max_usage_count) to access_codes table via migration
  - Update type constraint to include 'bulk' option
  - Create bulk code capacity validation function in database
  - Update TypeScript interfaces in src/types/database.ts to include new fields
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2. Implement bulk code validation and capacity checking logic

  - Create check_bulk_code_capacity database function with atomic operations
  - Update existing check_concurrent_sessions function to handle bulk codes
  - Write unit tests for database functions using test framework
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. Extend code generation API to support bulk codes

  - Modify src/app/api/admin/codes/generate/route.ts to handle bulk code type
  - Add validation for max_usage_count parameter (1-400 range)
  - Implement automatic 24-hour expiration setting for bulk codes
  - Add error handling for invalid bulk code parameters
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 4. Update authentication API for bulk code usage tracking

  - Modify src/app/api/auth/code-login/route.ts to handle bulk code capacity checking
  - Implement usage counter increment on successful login
  - Add capacity exceeded error response handling
  - Implement atomic transaction for capacity check and usage increment
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Create bulk code usage tracking and monitoring APIs

  - Create new API endpoint src/app/api/admin/bulk-codes/usage/route.ts for real-time usage data
  - Implement bulk code status endpoint with remaining capacity calculation
  - Add usage decrement logic for session cleanup
  - Write API tests for usage tracking endpoints
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Enhance CodeGenerator component for bulk code creation

  - Add 'bulk' option to type selection in src/components/admin/CodeGenerator.tsx
  - Create capacity input field with 1-400 validation
  - Add automatic 24-hour expiration display for bulk codes
  - Implement form validation for bulk code specific fields
  - _Requirements: 1.1, 1.2_

- [x] 7. Create bulk code management and monitoring UI components

  - Create BulkCodeMonitor component for real-time usage display
  - Implement capacity progress bar and percentage indicators
  - Add warning indicators for codes at 80% capacity
  - Create time remaining countdown display
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Update admin dashboard to display bulk code information

  - Modify src/components/admin/DashboardStats.tsx to include bulk code metrics
  - Add bulk codes section to admin codes table
  - Implement real-time updates for bulk code usage
  - Add capacity alerts and notifications for near-full codes
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 9. Implement session cleanup for bulk codes

  - Update cleanup_inactive_sessions function to handle bulk code usage decrements
  - Add automatic deactivation for expired bulk codes
  - Implement session termination when bulk codes expire
  - Create cleanup job for expired bulk codes and associated sessions
  - _Requirements: 4.1, 4.2_

- [x] 10. Add bulk code integration with events system

  - Modify event creation to support bulk code association
  - Update src/app/api/admin/events/route.ts to handle bulk code linking
  - Implement automatic bulk code deactivation when events end
  - Add bulk code users to event attendance metrics
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Create comprehensive error handling for bulk codes

  - Implement specific error types for capacity exceeded, expired codes
  - Add user-friendly error messages in authentication flow
  - Create error logging for bulk code usage failures
  - Add error recovery mechanisms for failed capacity updates
  - _Requirements: 2.3, 2.4, 4.1_

- [x] 12. Write integration tests for bulk code functionality

  - Create end-to-end test for bulk code creation and usage flow
  - Test concurrent user login scenarios up to capacity limit
  - Verify capacity exceeded rejection and error handling
  - Test automatic expiration and session cleanup
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 4.1_

- [x] 13. Implement performance optimizations for high-capacity usage

  - Add database indexes for bulk code queries
  - Optimize usage counter updates for concurrent access
  - Implement caching for frequently accessed bulk code data
  - Add performance monitoring for bulk code operations
  - _Requirements: 2.1, 2.2_

- [x] 14. Add bulk code analytics and reporting features
  - Create analytics endpoint for bulk code usage patterns
  - Implement usage history tracking and reporting
  - Add capacity utilization metrics to admin dashboard
  - Create export functionality for bulk code usage data
  - _Requirements: 3.1, 3.2, 5.3_
