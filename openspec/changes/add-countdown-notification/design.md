## Context
The current implementation forces users to wait on a progress page before they can add more content. This creates friction for users who want to quickly capture multiple learning points. The goal is to enable continuous content input while maintaining visibility into AI processing progress.

## Goals / Non-Goals
- Goals: Enable non-blocking content submission, provide visual feedback, maintain processing visibility, support multiple concurrent submissions
- Non-Goals: Real-time processing status updates, complex notification management, persistent notification history

## Decisions

### Notification Component Architecture
- **Decision**: Use react-hot-toast library for notification system with custom countdown component
- **Alternatives considered**: Bottom sheet modal, floating action button, status bar indicator, custom toast implementation
- **Rationale**: react-hot-toast provides reliable toast positioning, animations, and queue management out-of-the-box

### Background Processing Strategy
- **Decision**: Process content in background without blocking UI, maintain current progress page for detailed viewing
- **Alternatives considered**: Full real-time updates, client-side processing queue, WebSocket communication
- **Rationale**: Simple server-side processing with existing progress page, minimal complexity addition

### State Management Approach
- **Decision**: Use react-hot-toast's built-in state management with custom hooks for processing status
- **Alternatives considered**: Redux/Zustand, localStorage, server-side state, custom React state
- **Rationale**: react-hot-toast handles notification queue and state management automatically, reducing complexity

## Risks / Trade-offs

### Notification Management Complexity
- **Risk**: Multiple concurrent notifications could clutter the UI
- **Mitigation**: react-hot-toast automatically handles notification stacking and positioning, limit custom notifications to processing states only

### Browser Resource Usage
- **Risk**: Multiple background processing requests could impact performance
- **Mitigation**: Implement client-side request queuing, limit concurrent processing to 2-3 items

### User Experience Consistency
- **Risk**: Users might expect traditional progress page flow
- **Mitigation**: Maintain clear visual feedback, provide easy access to detailed progress view

## Migration Plan

### Phase 1: Toast Integration
1. Install and configure react-hot-toast
2. Create custom countdown toast component
3. Add Toaster component to app layout
4. Design processing status toast styles

### Phase 2: Background Processing
1. Modify homepage action to avoid redirect
2. Implement client-side processing status tracking with toast notifications
3. Update progress page to handle individual item viewing

### Phase 3: Multi-item Support
1. Leverage react-hot-toast's automatic queue management
2. Implement concurrent processing limits
3. Add error handling and retry mechanisms with custom toast types

## Open Questions
- Should notifications persist across page refreshes? (react-hot-toast doesn't support this by default)
- Custom toast animations vs react-hot-toast defaults?
- Success message duration before auto-dismiss?