# Order Dispute Feature

## Overview
This feature allows users to dispute orders that are not of type "non-phygitals". The dispute functionality is integrated as a new tab in the order details page, following the same pattern as other e-commerce platforms.

## Implementation Details

### Components Added

1. **OrderDispute.tsx** - Main dispute form component
   - Displays dispute guidelines
   - Shows order information
   - Provides a comprehensive form for dispute submission
   - Validates form inputs
   - Handles different dispute categories and priorities

2. **useDispute.ts** - Custom hook for dispute management
   - Handles dispute submission state
   - Manages error and success states
   - Provides reset functionality

3. **disputeActions.ts** - Server actions for dispute API calls
   - `createOrderDispute()` - Submits a new dispute
   - `getOrderDisputes()` - Retrieves dispute history (for future use)

### Modified Components

1. **OrderTabs.tsx** - Added dispute tab
   - Conditionally shows dispute tab based on order type
   - Integrates OrderDispute component

2. **order-details.tsx** - Main order page
   - Integrated dispute hook
   - Added dispute submission handler
   - Added success/error notification modals

## Business Logic

### Dispute Eligibility
- Only orders with `orderType !== 'non-phygitals'` can be disputed
- This excludes digital-only products from the dispute process

### Dispute Categories
- Item Not Received
- Item Damaged/Defective
- Wrong Item Received
- Quality Issues
- Shipping Problems
- Seller Communication Issues
- Payment Problems
- Other

### Priority Levels
- Low (Green)
- Medium (Orange) - Default
- High (Red)

### Form Validation
- Category selection is required
- Brief reason is required
- Detailed description is required (minimum 20 characters)
- Priority level defaults to "medium"

## API Integration

### Endpoint
```
POST /api/v5/orders/{orderId}/dispute
```

### Request Body
```json
{
  "reason": "Brief summary of the issue",
  "category": "item_damaged",
  "description": "Detailed description of the issue",
  "priority": "medium"
}
```

### Response
```json
{
  "success": true,
  "message": "Dispute submitted successfully!",
  "disputeId": "dispute_123"
}
```

## User Experience

1. **Access**: Users can access the dispute feature through a new "Dispute Order" tab
2. **Guidance**: Clear guidelines are provided before the form
3. **Information**: Order details are displayed for context
4. **Validation**: Real-time form validation with helpful error messages
5. **Feedback**: Success/error notifications via modal dialogs
6. **State Management**: Form resets after successful submission

## Future Enhancements

1. **Dispute History**: Show previous disputes for the order
2. **File Uploads**: Allow users to attach images/documents
3. **Real-time Updates**: WebSocket integration for dispute status updates
4. **Admin Panel**: Backend interface for dispute management
5. **Email Notifications**: Automated email updates on dispute status changes

## Testing

To test the dispute feature:

1. Navigate to an order with `orderType !== 'non-phygitals'`
2. Click on the "Dispute Order" tab
3. Fill out the dispute form with valid information
4. Submit the dispute
5. Verify success/error handling

## Notes

- The feature follows the existing codebase patterns and conventions
- Error handling is comprehensive with user-friendly messages
- The implementation is modular and easily extensible
- The UI/UX matches the existing design system
