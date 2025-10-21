## 1. React Hot Toast Integration
- [x] 1.1 Install react-hot-toast package: `npm install react-hot-toast`
- [x] 1.2 Add Toaster component to app root layout
- [x] 1.3 Create custom ProcessingToast component with countdown timer
- [x] 1.4 Create custom SuccessToast and ErrorToast components
- [x] 1.5 Configure toast positioning and styling to match app theme

## 2. Homepage Integration
- [x] 2.1 Modify homepage action to return JSON instead of redirect
- [x] 2.2 Integrate toast notification with form submission using useFetcher
- [x] 2.3 Implement toast.success on successful content submission
- [x] 2.4 Implement toast.error on submission failure
- [x] 2.5 Clear input form and show processing toast immediately after submission

## 3. Background Processing with Toast Updates
- [x] 3.1 Create custom hook for processing status tracking
- [x] 3.2 Use react-hot-toast's built-in queue management for multiple toasts
- [x] 3.3 Implement status polling with toast.dismiss and toast.loading updates
- [x] 3.4 Add onClick handlers to processing toasts for navigation to progress page
- [x] 3.5 Handle completion with toast.success and auto-dismiss timing

## 4. Progress Page Updates
- [x] 4.1 Update progress page to handle individual item viewing
- [x] 4.2 Add breadcrumb navigation back to homepage
- [x] 4.3 Modify progress page to work with notification links
- [x] 4.4 Update auto-redirect logic for better UX

## 5. Error Handling & Edge Cases
- [x] 5.1 Handle network errors with toast.error messages
- [x] 5.2 Manage processing failures with retry buttons in error toasts
- [x] 5.3 Leverage react-hot-toast's automatic toast stacking
- [ ] 5.4 Handle browser tab visibility with toast.pause and toast.play
- [x] 5.5 Add accessibility features for screen readers

## 6. Testing & Validation
- [x] 6.1 Test multiple concurrent submissions
- [x] 6.2 Validate notification dismissal timing
- [x] 6.3 Test error scenarios and recovery
- [x] 6.4 Verify mobile responsiveness of notifications
- [ ] 6.5 Test browser compatibility (Chrome, Safari, WeChat)

## 7. Polish & Optimization
- [x] 7.1 Customize react-hot-toast animations to match app theme
- [x] 7.2 Optimize toast rendering performance
- [x] 7.3 Add keyboard navigation for toast interactions
- [ ] 7.4 Implement custom sound effects for completion (optional)
- [ ] 7.5 Add user preference settings for toast duration and position