# Seller Dispute Notification System

## Overview

This document outlines the implementation of a real-time notification system that ensures sellers are immediately notified when buyers create disputes, allowing them to respond quickly and maintain good customer relationships.

## System Architecture

### Frontend Components

1. **SellerDisputeManagement** - Enhanced with auto-refresh and notification badges
2. **OrderDispute** - Buyer dispute creation with seller notification triggers
3. **NotificationProvider** - Context for managing seller notifications

### Backend Requirements

The following API endpoints need to be implemented or enhanced:

## API Endpoints

### 1. Create Dispute (Enhanced)
```typescript
POST /api/v5/orders/:orderId/dispute

// When a dispute is created, trigger seller notification
- Send real-time notification to seller
- Update seller notification counts
- Send email notification to seller
```

### 2. Get Seller Disputes (Enhanced)
```typescript
GET /api/v5/orders/:orderId/disputes

// For sellers viewing specific order disputes
// Returns disputes for the specific order
```

### 3. Get All Seller Disputes
```typescript
GET /api/v5/seller/disputes?status=pending&priority=high&page=1&limit=10

// Returns all disputes across seller's orders
// Supports filtering and pagination
```

### 4. Seller Notification Count (New)
```typescript
GET /api/v5/seller/notifications/count

Response:
{
  "success": true,
  "data": {
    "pendingDisputes": 5,
    "pendingChallenges": 2,
    "totalNotifications": 7
  }
}
```

### 5. Mark Notifications as Read (New)
```typescript
POST /api/v5/seller/notifications/mark-read
{
  "type": "disputes" | "challenges" | "all",
  "ids": ["dispute_id_1", "dispute_id_2"] // optional, for specific items
}
```

## Backend Implementation

### 1. Database Schema Updates

```javascript
// Add to existing Dispute model
const DisputeSchema = new mongoose.Schema({
  // ... existing fields ...

  // Notification tracking
  sellerNotified: {
    type: Boolean,
    default: false
  },
  sellerNotificationSentAt: {
    type: Date
  },
  sellerViewedAt: {
    type: Date
  },

  // For real-time updates
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// New notification model
const SellerNotificationSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['dispute_created', 'challenge_response', 'dispute_resolved'],
    required: true
  },
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
```

### 2. Enhanced Dispute Creation

```javascript
// Enhanced dispute creation endpoint
router.post('/orders/:orderId/dispute', authenticateUser, upload.array('documents', 2), async (req, res) => {
  try {
    // ... existing dispute creation logic ...

    const dispute = new Dispute(disputeData);
    await dispute.save();

    // Get seller information from the order
    const order = await Order.findOne({ orderId });
    const sellerId = order.sellerId;

    // Create seller notification
    const notification = new SellerNotification({
      sellerId,
      type: 'dispute_created',
      disputeId: dispute._id,
      orderId: orderId
    });
    await notification.save();

    // Send real-time notification via WebSocket
    if (io) {
      io.to(`seller_${sellerId}`).emit('new_dispute', {
        disputeId: dispute._id,
        orderId: orderId,
        reason: dispute.reason,
        priority: dispute.priority,
        timestamp: new Date()
      });
    }

    // Send email notification to seller
    await sendSellerDisputeNotification(sellerId, dispute, order);

    // Send SMS notification for high priority disputes
    if (dispute.priority === 'high') {
      await sendSellerSMSNotification(sellerId, dispute, order);
    }

    res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully! The seller has been notified.',
      data: {
        disputeId: dispute._id,
        status: dispute.status,
        createdAt: dispute.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit dispute'
    });
  }
});
```

### 3. Seller Notification Count Endpoint

```javascript
router.get('/seller/notifications/count', authenticateUser, async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Count unread notifications
    const pendingDisputes = await SellerNotification.countDocuments({
      sellerId: new mongoose.Types.ObjectId(sellerId),
      type: 'dispute_created',
      isRead: false
    });

    const pendingChallenges = await SellerNotification.countDocuments({
      sellerId: new mongoose.Types.ObjectId(sellerId),
      type: 'challenge_response',
      isRead: false
    });

    const totalNotifications = pendingDisputes + pendingChallenges;

    res.json({
      success: true,
      data: {
        pendingDisputes,
        pendingChallenges,
        totalNotifications
      }
    });

  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification counts'
    });
  }
});
```

### 4. Enhanced Get Seller Disputes

```javascript
router.get('/seller/disputes', authenticateUser, async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { status, priority, page = 1, limit = 10 } = req.query;

    // Build filter for seller's orders
    const sellerOrders = await Order.find({ sellerId }).select('orderId');
    const orderIds = sellerOrders.map(order => order.orderId);

    const filter = {
      orderId: { $in: orderIds }
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const disputes = await Dispute.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Dispute.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    // Mark relevant notifications as read when seller views disputes
    await SellerNotification.updateMany(
      {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        type: 'dispute_created',
        isRead: false
      },
      { isRead: true }
    );

    const formattedDisputes = disputes.map(dispute => ({
      id: dispute._id,
      orderId: dispute.orderId,
      reason: dispute.reason,
      category: dispute.category,
      description: dispute.description,
      status: dispute.status,
      priority: dispute.priority,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
      buyerInfo: {
        id: dispute.userId._id,
        name: dispute.userId.name,
        email: dispute.userId.email
      },
      documents: dispute.documents.map(doc => ({
        id: doc._id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        downloadUrl: `/api/v5/disputes/documents/${doc._id}/download`
      })),
      sellerChallenge: dispute.sellerChallenge
    }));

    res.json({
      success: true,
      data: {
        disputes: formattedDisputes,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching seller disputes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes'
    });
  }
});
```

## Email Notification Service

```javascript
// services/emailService.js
const sendSellerDisputeNotification = async (sellerId, dispute, order) => {
  try {
    const seller = await User.findById(sellerId);
    if (!seller) return;

    const emailData = {
      to: seller.email,
      subject: `New Dispute Submitted - Order #${order.orderId}`,
      template: 'seller_dispute_notification',
      data: {
        sellerName: seller.name,
        orderId: order.orderId,
        disputeReason: dispute.reason,
        disputeCategory: dispute.category,
        disputePriority: dispute.priority,
        disputeDescription: dispute.description,
        buyerName: dispute.userId?.name || 'Customer',
        disputeUrl: `${process.env.FRONTEND_URL}/orders/${order.orderId}?tab=disputeManagement`,
        dashboardUrl: `${process.env.FRONTEND_URL}/seller/disputes`
      }
    };

    await sendEmail(emailData);
    console.log(`Dispute notification email sent to seller ${sellerId}`);

  } catch (error) {
    console.error('Error sending seller dispute notification:', error);
  }
};
```

## WebSocket Integration

```javascript
// Real-time notifications via Socket.IO
io.on('connection', (socket) => {
  socket.on('join_seller_room', (sellerId) => {
    socket.join(`seller_${sellerId}`);
    console.log(`Seller ${sellerId} joined notification room`);
  });

  socket.on('disconnect', () => {
    console.log('Seller disconnected from notifications');
  });
});

// Emit notification when dispute is created
const notifySeller = (sellerId, disputeData) => {
  io.to(`seller_${sellerId}`).emit('new_dispute', {
    type: 'dispute_created',
    data: disputeData,
    timestamp: new Date()
  });
};
```

## Frontend Integration

### 1. Real-time Notification Hook

```typescript
// hooks/useSellerNotifications.ts
export const useSellerNotifications = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { accessToken, user } = useUser();

  useEffect(() => {
    if (!accessToken || user?.role !== 'seller') return;

    // Fetch initial notification count
    const fetchNotificationCount = async () => {
      const result = await getSellerNotificationCount(accessToken);
      if (result.success && result.counts) {
        setNotificationCount(result.counts.totalNotifications);
      }
    };

    fetchNotificationCount();

    // Set up WebSocket connection for real-time updates
    const socket = io(process.env.NEXT_PUBLIC_API_URL);
    socket.emit('join_seller_room', user.id);

    socket.on('new_dispute', (data) => {
      setNotificationCount(prev => prev + 1);
      setNotifications(prev => [data, ...prev]);

      // Show toast notification
      toast.info(`New dispute received for Order #${data.orderId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, user]);

  return { notificationCount, notifications };
};
```

### 2. Enhanced Order Management

The SellerDisputeManagement component now includes:
- Auto-refresh every 30 seconds
- Visual indicators for new disputes
- Real-time notification badges
- Quick action stats dashboard
- Improved error handling and retry mechanisms

## Testing the System

### 1. End-to-End Test Flow

1. **Buyer creates dispute**: Submit a dispute form as a buyer
2. **Verify seller notification**: Check that seller receives notification
3. **Seller views dispute**: Verify dispute appears in seller's management panel
4. **Real-time updates**: Test auto-refresh and WebSocket notifications
5. **Email notifications**: Verify email is sent to seller

### 2. Test Cases

```javascript
// Test dispute creation triggers seller notification
describe('Dispute Creation Notification', () => {
  it('should notify seller when buyer creates dispute', async () => {
    // Create dispute as buyer
    const disputeResponse = await createDispute(buyerToken, orderId, disputeData);
    expect(disputeResponse.success).toBe(true);

    // Check seller notification count increased
    const notificationResponse = await getSellerNotificationCount(sellerToken);
    expect(notificationResponse.counts.pendingDisputes).toBeGreaterThan(0);

    // Verify seller can see dispute
    const sellerDisputes = await getSellerDisputes(sellerToken);
    expect(sellerDisputes.disputes).toContainEqual(
      expect.objectContaining({ id: disputeResponse.disputeId })
    );
  });
});
```

## Monitoring and Analytics

### Key Metrics to Track

1. **Dispute Response Time**: Time from dispute creation to seller first view
2. **Resolution Rate**: Percentage of disputes resolved within 24/48 hours
3. **Notification Delivery**: Success rate of email/SMS notifications
4. **Seller Engagement**: How quickly sellers respond to disputes

### Dashboard Analytics

```sql
-- Seller dispute response metrics
SELECT
  s.id as seller_id,
  s.name as seller_name,
  COUNT(d.id) as total_disputes,
  AVG(TIMESTAMPDIFF(MINUTE, d.createdAt, d.sellerViewedAt)) as avg_response_time_minutes,
  SUM(CASE WHEN d.status = 'resolved' THEN 1 ELSE 0 END) as resolved_disputes
FROM sellers s
LEFT JOIN disputes d ON d.sellerId = s.id
WHERE d.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY s.id, s.name
ORDER BY avg_response_time_minutes ASC;
```

This comprehensive system ensures that sellers are immediately aware of new disputes and can respond quickly to maintain customer satisfaction and resolve issues efficiently.