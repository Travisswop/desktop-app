# Dispute API Implementation Plan

## Overview
This document outlines the backend API implementation plan for the order dispute functionality using Node.js, MongoDB, and Cloudinary. The API should support creating, retrieving, updating, and managing disputes for both authenticated users and guest orders.

## Database Schema (MongoDB)

### 1. Dispute Schema
```javascript
const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  guestEmail: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        // Either userId or guestEmail must be present
        return this.userId || v;
      },
      message: 'Either userId or guestEmail must be provided'
    }
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'item_not_received',
      'item_damaged',
      'wrong_item',
      'quality_issues',
      'shipping_issues',
      'seller_communication',
      'payment_issues',
      'other'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 20
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'rejected', 'closed'],
    default: 'pending',
    index: true
  },
  response: {
    type: String,
    default: null
  },
  responseDate: {
    type: Date,
    default: null
  },
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    default: null
  },
  documents: [{
    fileName: {
      type: String,
      required: true
    },
    cloudinaryPublicId: {
      type: String,
      required: true
    },
    cloudinaryUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for better query performance
disputeSchema.index({ orderId: 1, status: 1 });
disputeSchema.index({ userId: 1, createdAt: -1 });
disputeSchema.index({ guestEmail: 1, orderId: 1 });
disputeSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Dispute', disputeSchema);
```

### 2. Dispute Status History Schema (Optional - for audit trail)
```javascript
const disputeStatusHistorySchema = new mongoose.Schema({
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute',
    required: true,
    index: true
  },
  oldStatus: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'rejected', 'closed']
  },
  newStatus: {
    type: String,
    required: true,
    enum: ['pending', 'under_review', 'resolved', 'rejected', 'closed']
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    default: null
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'changedAt', updatedAt: false }
});

module.exports = mongoose.model('DisputeStatusHistory', disputeStatusHistorySchema);
```

## API Endpoints

### 1. Authenticated User Endpoints

#### POST /api/v5/orders/{orderId}/dispute
**Purpose**: Create a new dispute for an authenticated user's order

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body**:
```json
{
  "reason": "Item arrived damaged",
  "category": "item_damaged",
  "description": "The product packaging was severely damaged...",
  "priority": "medium",
  "documents": [File, File] // Optional file uploads
}
```

**Response**:
```json
{
  "success": true,
  "message": "Dispute submitted successfully! Our team will review it and contact you soon.",
  "data": {
    "disputeId": "dispute_uuid_here",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Failed to submit dispute",
  "errors": {
    "category": "Please select a dispute category",
    "description": "Description must be at least 20 characters"
  }
}
```

#### GET /api/v5/orders/{orderId}/disputes
**Purpose**: Get all disputes for a specific order

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "dispute_uuid",
      "reason": "Item arrived damaged",
      "category": "item_damaged",
      "description": "The product packaging was severely damaged...",
      "status": "pending",
      "priority": "medium",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "response": null,
      "responseDate": null,
      "documents": [
        {
          "id": "doc_uuid",
          "fileName": "damage_photo.jpg",
          "fileSize": 245760,
          "fileType": "image/jpeg",
          "downloadUrl": "/api/v5/disputes/documents/doc_uuid/download"
        }
      ]
    }
  ]
}
```

#### GET /api/v5/disputes/{disputeId}
**Purpose**: Get details of a specific dispute

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "dispute_uuid",
    "orderId": "order_123",
    "reason": "Item arrived damaged",
    "category": "item_damaged",
    "description": "The product packaging was severely damaged...",
    "status": "under_review",
    "priority": "medium",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T14:20:00Z",
    "response": "Thank you for bringing this to our attention...",
    "responseDate": "2024-01-16T14:20:00Z",
    "documents": []
  }
}
```

### 2. Guest Order Endpoints

#### POST /api/v5/guest-orders/{orderId}/dispute
**Purpose**: Create a dispute for a guest order

**Headers**:
```
Content-Type: application/json
X-Guest-Email: guest@example.com
```

**Request Body**:
```json
{
  "reason": "Item not received after 2 weeks"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Dispute submitted successfully! Our team will contact you soon."
}
```

#### GET /api/v5/guest-orders/{orderId}/disputes
**Purpose**: Get disputes for a guest order

**Headers**:
```
X-Guest-Email: guest@example.com
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "dispute_uuid",
      "reason": "Item not received",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z",
      "response": null
    }
  ]
}
```

### 3. Document Management Endpoints

#### POST /api/v5/disputes/{disputeId}/documents
**Purpose**: Upload additional documents to an existing dispute

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body**:
```
documents: [File, File] // Max 2 files, 500KB each
```

**Response**:
```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "uploadedFiles": [
      {
        "id": "doc_uuid",
        "fileName": "receipt.pdf",
        "fileSize": 123456
      }
    ]
  }
}
```

#### GET /api/v5/disputes/documents/{documentId}/download
**Purpose**: Download a dispute document

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**: Redirect to Cloudinary URL or proxy the file

**Implementation**:
```javascript
// GET /api/v5/disputes/documents/:documentId/download
app.get('/api/v5/disputes/documents/:documentId/download', authenticateUser, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Find the dispute that contains this document
    const dispute = await Dispute.findOne({
      'documents._id': documentId,
      $or: [
        { userId: req.user.id },
        { guestEmail: req.headers['x-guest-email'] }
      ]
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = dispute.documents.id(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Redirect to Cloudinary URL (recommended for better performance)
    res.redirect(document.cloudinaryUrl);

    // Alternative: Proxy the file (use if you need more control)
    // const response = await fetch(document.cloudinaryUrl);
    // res.set({
    //   'Content-Type': document.fileType,
    //   'Content-Disposition': `attachment; filename="${document.fileName}"`
    // });
    // response.body.pipe(res);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
});
```

### 4. Admin Endpoints

#### GET /api/v5/admin/disputes
**Purpose**: Get all disputes for admin review

**Headers**:
```
Authorization: Bearer {admin_access_token}
```

**Query Parameters**:
```
?status=pending&page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Response**:
```json
{
  "success": true,
  "data": {
    "disputes": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

#### PUT /api/v5/admin/disputes/{disputeId}/status
**Purpose**: Update dispute status and add response

**Headers**:
```
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "resolved",
  "response": "Thank you for bringing this to our attention. We have processed a full refund...",
  "notifyUser": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Dispute status updated successfully",
  "data": {
    "disputeId": "dispute_uuid",
    "status": "resolved",
    "updatedAt": "2024-01-16T14:20:00Z"
  }
}
```

## Business Logic Implementation

### 1. Validation Rules

#### Dispute Creation Validation
```javascript
const validateDisputeData = (data) => {
  const errors = {};

  // Required fields
  if (!data.reason?.trim()) {
    errors.reason = 'Please provide a brief reason';
  }

  if (!data.category) {
    errors.category = 'Please select a dispute category';
  }

  if (!data.description?.trim()) {
    errors.description = 'Please provide a detailed description';
  } else if (data.description.trim().length < 20) {
    errors.description = 'Description must be at least 20 characters';
  }

  // Valid categories
  const validCategories = [
    'item_not_received', 'item_damaged', 'wrong_item',
    'quality_issues', 'shipping_issues', 'seller_communication',
    'payment_issues', 'other'
  ];

  if (data.category && !validCategories.includes(data.category)) {
    errors.category = 'Invalid dispute category';
  }

  // Valid priorities
  const validPriorities = ['low', 'medium', 'high'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    errors.priority = 'Invalid priority level';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

#### File Upload Validation
```javascript
const validateDisputeFiles = (files) => {
  const errors = [];
  const maxFileSize = 500 * 1024; // 500KB
  const maxFiles = 2;
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`);
    return { isValid: false, errors };
  }

  files.forEach(file => {
    if (file.size > maxFileSize) {
      errors.push(`File "${file.name}" is too large. Maximum size is 500KB.`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File "${file.name}" has an unsupported format.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### 2. Authorization Logic

#### Order Ownership Verification
```javascript
const mongoose = require('mongoose');
const Order = require('../models/Order');

const verifyOrderOwnership = async (orderId, userId, isGuest = false, guestEmail = null) => {
  try {
    if (isGuest) {
      // For guest orders, verify email matches
      const order = await Order.findOne({
        orderId,
        'customer.email': guestEmail
      });
      return !!order;
    } else {
      // For authenticated users, verify user owns the order
      const order = await Order.findOne({
        orderId,
        $or: [
          { 'customer.userId': new mongoose.Types.ObjectId(userId) },
          { 'customer.userId': userId }
        ]
      });
      return !!order;
    }
  } catch (error) {
    console.error('Error verifying order ownership:', error);
    return false;
  }
};
```

#### Dispute Access Control
```javascript
const Dispute = require('../models/Dispute');

const verifyDisputeAccess = async (disputeId, userId, isGuest = false, guestEmail = null) => {
  try {
    const dispute = await Dispute.findById(disputeId);

    if (!dispute) return false;

    if (isGuest) {
      return dispute.guestEmail === guestEmail;
    } else {
      return dispute.userId && dispute.userId.toString() === userId.toString();
    }
  } catch (error) {
    console.error('Error verifying dispute access:', error);
    return false;
  }
};
```

### 3. Notification System

#### Email Notifications
```javascript
const sendDisputeNotifications = async (dispute, type) => {
  const emailTemplates = {
    'dispute_created': {
      subject: 'Dispute Submitted - Order #{orderId}',
      template: 'dispute_created'
    },
    'dispute_updated': {
      subject: 'Dispute Update - Order #{orderId}',
      template: 'dispute_updated'
    },
    'dispute_resolved': {
      subject: 'Dispute Resolved - Order #{orderId}',
      template: 'dispute_resolved'
    }
  };

  const template = emailTemplates[type];
  if (!template) return;

  const recipient = dispute.userId ?
    await User.findById(dispute.userId) :
    { email: dispute.guestEmail };

  await sendEmail({
    to: recipient.email,
    subject: template.subject.replace('{orderId}', dispute.orderId),
    template: template.template,
    data: {
      dispute,
      order: await Order.findOne({ orderId: dispute.orderId })
    }
  });
};
```

### 4. File Storage Implementation (Cloudinary)

#### Cloudinary Configuration
```javascript
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'disputes',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt'],
    resource_type: 'auto',
    public_id: (req, file) => {
      const disputeId = req.params.disputeId || 'temp';
      return `dispute_${disputeId}_${Date.now()}_${file.originalname.split('.')[0]}`;
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024, // 500KB
    files: 2 // Maximum 2 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  }
});
```

#### File Upload Handler
```javascript
const uploadDisputeDocuments = async (disputeId, files) => {
  const uploadedFiles = [];

  for (const file of files) {
    const documentData = {
      fileName: file.originalname,
      cloudinaryPublicId: file.public_id,
      cloudinaryUrl: file.secure_url,
      fileSize: file.bytes,
      fileType: file.format,
      uploadedAt: new Date()
    };

    uploadedFiles.push(documentData);
  }

  return uploadedFiles;
};

// Delete file from Cloudinary
const deleteDisputeDocument = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};
```

## Security Considerations

### 1. Rate Limiting
- Limit dispute creation to 5 per order per day
- Limit file uploads to prevent abuse
- Implement IP-based rate limiting for guest orders

### 2. Data Sanitization
- Sanitize all text inputs to prevent XSS
- Validate file types and scan for malware
- Limit file sizes and total storage per dispute

### 3. Access Control
- Verify order ownership before allowing dispute creation
- Implement proper authentication for all endpoints
- Use role-based access control for admin endpoints

### 4. Data Privacy
- Encrypt sensitive dispute data
- Implement data retention policies
- Provide data export/deletion for GDPR compliance

## Performance Optimizations

### 1. Database Indexing
- Index frequently queried fields (order_id, user_id, status)
- Use composite indexes for complex queries
- Implement database query optimization

### 2. Caching Strategy
- Cache dispute categories and static data
- Implement Redis caching for frequently accessed disputes
- Use CDN for document downloads

### 3. File Storage Optimization
- Use cloud storage with CDN for document delivery
- Implement image compression for uploaded photos
- Set up automatic cleanup of old dispute documents

## Monitoring and Analytics

### 1. Metrics to Track
- Dispute creation rate
- Resolution time by category
- Customer satisfaction after resolution
- Most common dispute categories

### 2. Logging
- Log all dispute status changes
- Track admin response times
- Monitor file upload success/failure rates

### 3. Alerts
- Alert on high dispute volumes
- Notify on disputes pending too long
- Alert on failed file uploads or system errors

## Testing Strategy

### 1. Unit Tests
- Test validation functions
- Test file upload logic
- Test notification sending

### 2. Integration Tests
- Test complete dispute creation flow
- Test admin response workflow
- Test guest vs authenticated user flows

### 3. Load Testing
- Test concurrent dispute submissions
- Test file upload performance
- Test database performance under load

## Node.js/Express Implementation Examples

### 1. Complete Route Implementation
```javascript
const express = require('express');
const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { validateDisputeData, validateDisputeFiles } = require('../utils/validation');
const { verifyOrderOwnership, verifyDisputeAccess } = require('../utils/authorization');
const { sendDisputeNotifications } = require('../services/emailService');

const router = express.Router();

// POST /api/v5/orders/:orderId/dispute - Create dispute for authenticated user
router.post('/orders/:orderId/dispute',
  authenticateUser,
  upload.array('documents', 2),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason, category, description, priority = 'medium' } = req.body;
      const userId = req.user.id;

      // Verify order ownership
      const ownsOrder = await verifyOrderOwnership(orderId, userId);
      if (!ownsOrder) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to dispute this order'
        });
      }

      // Validate dispute data
      const validation = validateDisputeData({ reason, category, description, priority });
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Validate uploaded files
      if (req.files && req.files.length > 0) {
        const fileValidation = validateDisputeFiles(req.files);
        if (!fileValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'File validation failed',
            errors: fileValidation.errors
          });
        }
      }

      // Create dispute
      const disputeData = {
        orderId,
        userId: new mongoose.Types.ObjectId(userId),
        reason: reason.trim(),
        category,
        description: description.trim(),
        priority,
        status: 'pending'
      };

      // Add documents if uploaded
      if (req.files && req.files.length > 0) {
        disputeData.documents = req.files.map(file => ({
          fileName: file.originalname,
          cloudinaryPublicId: file.public_id,
          cloudinaryUrl: file.secure_url,
          fileSize: file.bytes,
          fileType: file.format
        }));
      }

      const dispute = new Dispute(disputeData);
      await dispute.save();

      // Send notification email
      await sendDisputeNotifications(dispute, 'dispute_created');

      res.status(201).json({
        success: true,
        message: 'Dispute submitted successfully! Our team will review it and contact you soon.',
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
  }
);

// GET /api/v5/orders/:orderId/disputes - Get disputes for an order
router.get('/orders/:orderId/disputes', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Verify order ownership
    const ownsOrder = await verifyOrderOwnership(orderId, userId);
    if (!ownsOrder) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view disputes for this order'
      });
    }

    const disputes = await Dispute.find({
      orderId,
      userId: new mongoose.Types.ObjectId(userId)
    }).sort({ createdAt: -1 });

    const formattedDisputes = disputes.map(dispute => ({
      id: dispute._id,
      reason: dispute.reason,
      category: dispute.category,
      description: dispute.description,
      status: dispute.status,
      priority: dispute.priority,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
      response: dispute.response,
      responseDate: dispute.responseDate,
      documents: dispute.documents.map(doc => ({
        id: doc._id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        downloadUrl: `/api/v5/disputes/documents/${doc._id}/download`
      }))
    }));

    res.json({
      success: true,
      data: formattedDisputes
    });

  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes'
    });
  }
});

// POST /api/v5/guest-orders/:orderId/dispute - Create dispute for guest order
router.post('/guest-orders/:orderId/dispute', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const guestEmail = req.headers['x-guest-email'];

    if (!guestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Guest email is required'
      });
    }

    // Verify guest order
    const ownsOrder = await verifyOrderOwnership(orderId, null, true, guestEmail);
    if (!ownsOrder) {
      return res.status(403).json({
        success: false,
        message: 'Invalid order or email'
      });
    }

    // Create simplified dispute for guest
    const dispute = new Dispute({
      orderId,
      guestEmail,
      reason: reason.trim(),
      category: 'other', // Default category for guest disputes
      description: reason.trim(),
      priority: 'medium',
      status: 'pending'
    });

    await dispute.save();

    // Send notification email
    await sendDisputeNotifications(dispute, 'dispute_created');

    res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully! Our team will contact you soon.'
    });

  } catch (error) {
    console.error('Error creating guest dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit dispute'
    });
  }
});

module.exports = router;
```

### 2. Middleware Implementation
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await AdminUser.findById(decoded.id);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid admin token'
    });
  }
};

module.exports = { authenticateUser, authenticateAdmin };
```

## Package Dependencies

### Required npm packages:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "cloudinary": "^1.40.0",
    "multer": "^1.4.5-lts.1",
    "multer-storage-cloudinary": "^4.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "nodemailer": "^6.9.4",
    "express-rate-limit": "^6.10.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "joi": "^17.9.2"
  }
}
```

## Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/your-app-name

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# App
PORT=3000
NODE_ENV=development
```

## Deployment Considerations

### 1. Environment Configuration
- Separate configurations for dev/staging/production
- Environment-specific Cloudinary settings
- MongoDB connection string management

### 2. Rollback Strategy
- Database migration rollback procedures using MongoDB migrations
- Feature flag implementation for gradual rollout
- Monitoring during deployment

### 3. Production Optimizations
- Enable MongoDB connection pooling
- Implement proper error logging with Winston
- Set up PM2 for process management
- Configure nginx as reverse proxy
- Enable gzip compression
- Set up proper CORS policies

This comprehensive implementation plan provides a solid foundation for building a robust dispute management system using Node.js, MongoDB, and Cloudinary that matches the frontend functionality.