# Order Details Module

This module has been refactored to follow e-commerce best practices inspired by platforms like Amazon, with a focus on modularity, maintainability, and performance.

## Architecture Overview

### 📁 Directory Structure

```
components/order/orderId/
├── README.md                     # This documentation
├── index.ts                      # Main exports
├── order-details.tsx            # Main component (refactored)
├── types/
│   └── order.types.ts           # TypeScript interfaces and types
├── constants/
│   └── order.constants.ts       # Constants and configuration
├── utils/
│   └── order.utils.ts           # Utility functions
├── hooks/
│   ├── useOrderData.ts          # Order data fetching hook
│   └── useShippingUpdate.ts     # Shipping update hook
└── components/
    ├── OrderHeader.tsx          # Order header with status and actions
    ├── OrderItemsTable.tsx      # Product table with pricing summary
    ├── OrderTimeline.tsx        # Order processing timeline
    ├── CustomerDetails.tsx      # Customer/seller information
    ├── ProductDetails.tsx       # Product descriptions and details
    ├── ShippingUpdateModal.tsx  # Shipping update modal
    ├── OrderTabs.tsx           # Tab navigation component
    └── LoadingState.tsx        # Loading and error states
```

## Key Improvements

### 🔧 **Separation of Concerns**
- **Types**: Centralized in `types/order.types.ts`
- **Constants**: Moved to `constants/order.constants.ts`
- **Utilities**: Helper functions in `utils/order.utils.ts`
- **Business Logic**: Custom hooks for data management
- **UI Components**: Focused, single-responsibility components

### 🚀 **Performance Optimizations**
- **Memoization**: Components wrapped with `React.memo`
- **Custom Hooks**: Efficient data fetching and state management
- **Lazy Loading**: Components only render when needed
- **Optimized Re-renders**: Proper dependency arrays and callbacks

### 🎯 **User Experience**
- **Role-based UI**: Different views for buyers vs sellers
- **Progressive Loading**: Skeleton states and error boundaries
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Proper ARIA labels and keyboard navigation

### 🛠 **Developer Experience**
- **TypeScript**: Full type safety throughout
- **Modular Imports**: Easy to import specific components
- **Consistent Patterns**: Standardized component structure
- **Documentation**: Clear interfaces and JSDoc comments

## Usage Examples

### Basic Usage
```tsx
import { OrderPage } from '@/components/order/orderId';

export default function OrderDetailsPage() {
  return <OrderPage />;
}
```

### Using Individual Components
```tsx
import {
  OrderHeader,
  OrderItemsTable,
  useOrderData
} from '@/components/order/orderId';

export default function CustomOrderView() {
  const { order, nfts, userRole, isLoading } = useOrderData(orderId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <OrderHeader
        order={order}
        userRole={userRole}
        onMarkComplete={handleComplete}
      />
      <OrderItemsTable nfts={nfts} order={order} />
    </div>
  );
}
```

### Custom Hook Usage
```tsx
import { useOrderData, useShippingUpdate } from '@/components/order/orderId';

export default function OrderManagement() {
  const { order, refetchOrder } = useOrderData(orderId);
  const { handleShippingUpdate } = useShippingUpdate();

  const updateShipping = () => {
    handleShippingUpdate(orderId, refetchOrder);
  };

  return (
    <button onClick={updateShipping}>
      Update Shipping
    </button>
  );
}
```

## Component API

### OrderHeader
```tsx
interface OrderHeaderProps {
  order: OrderData;
  userRole: UserRole;
  isCompleted: boolean;
  isUpdating: boolean;
  onMarkComplete: () => void;
  onUpdateShipping: () => void;
}
```

### OrderItemsTable
```tsx
interface OrderItemsTableProps {
  nfts: NFT[] | null;
  order: OrderData;
}
```

### OrderTimeline
```tsx
interface OrderTimelineProps {
  stages: ProcessingStage[];
}
```

## Custom Hooks

### useOrderData
Manages order data fetching and state:
```tsx
const {
  order,           // Order data
  nfts,           // Product data
  userRole,       // 'buyer' | 'seller'
  isLoading,      // Loading state
  isError,        // Error message
  isCompleted,    // Order completion status
  processingStages, // Order timeline
  refetchOrder,   // Refetch function
} = useOrderData(orderId);
```

### useShippingUpdate
Handles shipping updates:
```tsx
const {
  isUpdateModalOpen,    // Modal state
  isUpdating,          // Update loading state
  updateError,         // Update error
  updateSuccess,       // Success message
  shippingData,        // Form data
  setIsUpdateModalOpen, // Modal control
  setShippingData,     // Form control
  handleShippingUpdate, // Update function
  resetUpdateState,    // Reset function
} = useShippingUpdate(initialData);
```

## Best Practices

### 1. **Component Composition**
```tsx
// ✅ Good - Compose smaller components
<OrderPage>
  <OrderHeader />
  <OrderItemsTable />
  <OrderTabs>
    <OrderTimeline />
    <CustomerDetails />
    <ProductDetails />
  </OrderTabs>
</OrderPage>

// ❌ Bad - Monolithic component
<OrderPageMonolith />
```

### 2. **State Management**
```tsx
// ✅ Good - Use custom hooks
const { order, isLoading } = useOrderData(orderId);

// ❌ Bad - Inline state management
const [order, setOrder] = useState(null);
const [isLoading, setIsLoading] = useState(true);
// ... lots of useEffect and fetch logic
```

### 3. **Type Safety**
```tsx
// ✅ Good - Use proper types
import { OrderData, UserRole } from './types/order.types';

interface Props {
  order: OrderData;
  userRole: UserRole;
}

// ❌ Bad - Any types
interface Props {
  order: any;
  userRole: string;
}
```

## Migration Guide

If you're migrating from the old monolithic component:

1. **Update imports**:
   ```tsx
   // Old
   import OrderPage from './order-details';

   // New
   import { OrderPage } from './index';
   ```

2. **Use new hooks** for custom implementations:
   ```tsx
   // Replace direct state management with hooks
   const orderData = useOrderData(orderId);
   const shippingUpdate = useShippingUpdate();
   ```

3. **Leverage individual components** for custom layouts:
   ```tsx
   // Mix and match components as needed
   import { OrderHeader, OrderTimeline } from './index';
   ```

## Contributing

When adding new features:

1. **Add types** to `types/order.types.ts`
2. **Add constants** to `constants/order.constants.ts`
3. **Create focused components** in `components/`
4. **Use custom hooks** for business logic
5. **Update exports** in `index.ts`
6. **Add documentation** and examples

This modular approach ensures the codebase remains maintainable and scalable as the application grows.