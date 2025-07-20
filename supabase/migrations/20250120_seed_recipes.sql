-- Seed initial system recipes for all workspaces
INSERT INTO recipes (title, prompt, description, phases, workspace_id, created_by, is_system)
SELECT 
  'Review Test Coverage',
  'What to do: Review Test Coverage for Software Development
How:
Phase 1: Focus on authentication and core business logic, covering authentication flow tests and data integrity tests.

Phase 2: Concentrate on user experience testing, including command palette tests, issue management tests, and navigation tests.

Phase 3: Ensure comprehensive component testing by covering UI components and layout components.

Phase 4: Perform advanced testing for performance and edge cases, such as performance tests and error handling tests.

Utilize testing patterns by component type and mock strategies for Supabase, routers, and test data factories.',
  'Phase 1: Critical Path Testing (Week 1-2)

Focus on authentication and core business logic

Authentication Flow Tests
Email login component (validation, error states, success flow)
Create user form (validation, duplicate handling, success)
Create workspace form (validation, error handling)
Middleware protection (route guards, redirects)
Session management (persistence, expiration)
Data Integrity Tests
Issue CRUD operations
Workspace access control
User permissions
Database transaction handling
Phase 2: User Experience Testing (Week 3-4)

Focus on interactive features and user flows

Command Palette Tests
Search functionality
Command execution
Keyboard navigation
Mode switching
Performance under load
Issue Management Tests
List rendering and pagination
Filtering and sorting
Issue details loading
Kanban board interactions
Create/edit forms
Navigation Tests
Global keyboard shortcuts
Router navigation
Deep linking
Back/forward behavior
Phase 3: Component Coverage (Week 5-6)

Comprehensive component testing

UI Component Tests
All component variants
Accessibility (ARIA, keyboard nav)
Error boundaries
Loading states
Empty states
Layout Component Tests
Responsive behavior
Conditional rendering
Mobile navigation
Header interactions
Phase 4: Advanced Testing (Week 7-8)

Performance and edge cases

Performance Tests
Large data set rendering
Infinite scroll performance
Search debouncing
Cache effectiveness
Error Handling Tests
Network failures
Invalid data handling
Timeout scenarios
Concurrent user actions',
  ARRAY[
    'Phase 1: Focus on authentication and core business logic, covering authentication flow tests and data integrity tests.',
    'Phase 2: Concentrate on user experience testing, including command palette tests, issue management tests, and navigation tests.',
    'Phase 3: Ensure comprehensive component testing by covering UI components and layout components.',
    'Phase 4: Perform advanced testing for performance and edge cases, such as performance tests and error handling tests.'
  ],
  w.id,
  w.owner_id,
  true
FROM workspaces w;

INSERT INTO recipes (title, prompt, description, phases, workspace_id, created_by, is_system)
SELECT 
  'Security Audit Checklist',
  'What to do: Perform a comprehensive security audit of your application
How:
Review authentication and authorization mechanisms
Check for common vulnerabilities (OWASP Top 10)
Audit API endpoints and data validation
Review sensitive data handling and encryption
Test for security misconfigurations',
  'A comprehensive security audit helps identify vulnerabilities before they can be exploited. This recipe guides you through a systematic review of your application''s security posture.',
  ARRAY[
    'Authentication & Authorization: Review login flows, session management, and permission systems',
    'Input Validation: Check all user inputs for proper validation and sanitization',
    'API Security: Audit endpoints for authentication, rate limiting, and data exposure',
    'Data Protection: Review encryption at rest and in transit, and sensitive data handling'
  ],
  w.id,
  w.owner_id,
  true
FROM workspaces w;

INSERT INTO recipes (title, prompt, description, phases, workspace_id, created_by, is_system)
SELECT 
  'Performance Optimization',
  'What to do: Optimize application performance
How:
Analyze current performance metrics
Identify bottlenecks using profiling tools
Implement caching strategies
Optimize database queries
Review and optimize frontend bundle size',
  'Performance optimization is crucial for user experience. This recipe provides a structured approach to identifying and fixing performance issues in your application.',
  ARRAY[
    'Baseline Metrics: Measure current performance using tools like Lighthouse and Web Vitals',
    'Backend Optimization: Profile API endpoints, optimize database queries, implement caching',
    'Frontend Optimization: Reduce bundle size, implement code splitting, optimize images',
    'Monitoring: Set up performance monitoring to track improvements over time'
  ],
  w.id,
  w.owner_id,
  true
FROM workspaces w;

INSERT INTO recipes (title, prompt, description, phases, workspace_id, created_by, is_system)
SELECT 
  'API Documentation',
  'What to do: Create comprehensive API documentation
How:
Document all endpoints with request/response examples
Include authentication requirements
Add error codes and handling
Provide code examples in multiple languages
Set up interactive documentation (e.g., Swagger)',
  'Good API documentation is essential for both internal developers and external users. This recipe helps you create clear, comprehensive documentation for your APIs.',
  ARRAY[
    'Endpoint Documentation: List all endpoints with HTTP methods, parameters, and responses',
    'Authentication Guide: Document how to authenticate and use API keys/tokens',
    'Examples & Tutorials: Provide code examples and common use case tutorials',
    'Interactive Documentation: Set up tools like Swagger for testing endpoints'
  ],
  w.id,
  w.owner_id,
  true
FROM workspaces w;

INSERT INTO recipes (title, prompt, description, phases, workspace_id, created_by, is_system)
SELECT 
  'Database Migration Strategy',
  'What to do: Plan and execute database migrations safely
How:
Create a backup strategy before migrations
Write both up and down migrations
Test migrations in a staging environment
Plan for zero-downtime deployments
Document migration procedures',
  'Database migrations are critical operations that need careful planning. This recipe provides a safe, systematic approach to planning and executing database schema changes.',
  ARRAY[
    'Planning: Analyze required changes and their impact on existing data',
    'Backup & Testing: Create backups and test migrations in non-production environments',
    'Migration Scripts: Write reversible migrations with proper error handling',
    'Deployment: Execute migrations with monitoring and rollback procedures ready'
  ],
  w.id,
  w.owner_id,
  true
FROM workspaces w;

INSERT INTO recipes (title, prompt, description, phases, workspace_id, created_by, is_system)
SELECT 
  'Search for potential Race Conditions',
  'What to do: Analyze potential race conditions in the codebase
How:
1. Review asynchronous operations that may lead to data conflicts
2. Identify shared resources accessed by multiple threads or processes
3. Look for instances where the order of execution impacts results
4. Consider implementing locking mechanisms or synchronization techniques
5. Prioritize testing under various concurrency scenarios',
  'A race condition occurs when multiple threads or processes access shared resources simultaneously, and the program''s behavior depends on the unpredictable timing of their execution. This can lead to data corruption, inconsistent results, or system crashes when operations that should be atomic are interrupted partway through. Common examples include two threads trying to increment the same counter or multiple processes writing to the same file without proper synchronization.',
  ARRAY[
    'Review asynchronous operations that may lead to data conflicts',
    'Identify shared resources accessed by multiple threads or processes',
    'Look for instances where the order of execution impacts results',
    'Consider implementing locking mechanisms or synchronization techniques',
    'Prioritize testing under various concurrency scenarios'
  ],
  w.id,
  w.owner_id,
  true
FROM workspaces w;