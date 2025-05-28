import { DisputeDetails } from '@/actions/disputeActions';

export const mockDisputes: DisputeDetails[] = [
  {
    id: 'dispute_001',
    orderId: 'order_123',
    reason: 'Item arrived damaged',
    category: 'item_damaged',
    description:
      'The package arrived with visible damage to the product. The item appears to be broken and unusable.',
    status: 'pending',
    priority: 'high',
    createdAt: new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString(), // 1 day ago
    updatedAt: new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString(),
    buyerInfo: {
      id: 'buyer_001',
      name: 'John Smith',
      email: 'john.smith@example.com',
    },
    documents: [
      {
        id: 'doc_001',
        fileName: 'damaged_item.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024 * 1024, // 1MB
        downloadUrl: '#',
        uploadedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'dispute_002',
    orderId: 'order_124',
    reason: 'Item not received',
    category: 'item_not_received',
    description:
      'I have not received my order even though the tracking shows it was delivered. The delivery address is correct.',
    status: 'under_review',
    priority: 'medium',
    createdAt: new Date(
      Date.now() - 48 * 60 * 60 * 1000
    ).toISOString(), // 2 days ago
    updatedAt: new Date(
      Date.now() - 12 * 60 * 60 * 1000
    ).toISOString(),
    buyerInfo: {
      id: 'buyer_002',
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
    },
    documents: [
      {
        id: 'doc_002',
        fileName: 'tracking_proof.pdf',
        fileType: 'application/pdf',
        fileSize: 1.5 * 1024 * 1024, // 1.5MB
        downloadUrl: '#',
        uploadedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'dispute_003',
    orderId: 'order_125',
    reason: 'Wrong item received',
    category: 'wrong_item',
    description:
      'I received a different item than what I ordered. The item in the package does not match the order details.',
    status: 'challenged',
    priority: 'high',
    createdAt: new Date(
      Date.now() - 72 * 60 * 60 * 1000
    ).toISOString(), // 3 days ago
    updatedAt: new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString(),
    buyerInfo: {
      id: 'buyer_003',
      name: 'Michael Brown',
      email: 'michael.b@example.com',
    },
    documents: [
      {
        id: 'doc_003',
        fileName: 'wrong_item_photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 800 * 1024, // 800KB
        downloadUrl: '#',
        uploadedAt: new Date().toISOString(),
      },
      {
        id: 'doc_004',
        fileName: 'order_confirmation.pdf',
        fileType: 'application/pdf',
        fileSize: 1.2 * 1024 * 1024, // 1.2MB
        downloadUrl: '#',
        uploadedAt: new Date().toISOString(),
      },
    ],
    sellerChallenge: {
      id: 'challenge_001',
      response:
        'The correct item was shipped according to our records. We have video evidence of the packaging process.',
      category: 'evidence_provided',
      evidence: {
        description:
          'We have CCTV footage of the packaging process and shipping documents.',
        documents: [
          {
            id: 'doc_005',
            fileName: 'packaging_video.mp4',
            fileType: 'video/mp4',
            fileSize: 5 * 1024 * 1024, // 5MB
            downloadUrl: '#',
            uploadedAt: new Date().toISOString(),
          },
        ],
      },
      requestedAction: 'dismiss_dispute',
      status: 'pending',
      createdAt: new Date(
        Date.now() - 12 * 60 * 60 * 1000
      ).toISOString(),
    },
  },
  {
    id: 'dispute_004',
    orderId: 'order_126',
    reason: 'Quality issues',
    category: 'quality_issues',
    description:
      'The product quality is not as described. The materials used are of inferior quality.',
    status: 'resolved',
    priority: 'low',
    createdAt: new Date(
      Date.now() - 96 * 60 * 60 * 1000
    ).toISOString(), // 4 days ago
    updatedAt: new Date(
      Date.now() - 48 * 60 * 60 * 1000
    ).toISOString(),
    buyerInfo: {
      id: 'buyer_004',
      name: 'Emily Davis',
      email: 'emily.d@example.com',
    },
    documents: [
      {
        id: 'doc_006',
        fileName: 'quality_issues.jpg',
        fileType: 'image/jpeg',
        fileSize: 1.8 * 1024 * 1024, // 1.8MB
        downloadUrl: '#',
        uploadedAt: new Date().toISOString(),
      },
    ],
    sellerChallenge: {
      id: 'challenge_002',
      response:
        'We have provided quality certificates and test results that prove the product meets industry standards.',
      category: 'quality_dispute',
      evidence: {
        description:
          'Quality certificates and test results from our manufacturer.',
        documents: [
          {
            id: 'doc_007',
            fileName: 'quality_certificate.pdf',
            fileType: 'application/pdf',
            fileSize: 2 * 1024 * 1024, // 2MB
            downloadUrl: '#',
            uploadedAt: new Date().toISOString(),
          },
        ],
      },
      requestedAction: 'partial_refund',
      status: 'accepted',
      createdAt: new Date(
        Date.now() - 48 * 60 * 60 * 1000
      ).toISOString(),
      adminResponse:
        "Based on the evidence provided, we have decided to accept the seller's challenge and offer a partial refund.",
      adminResponseDate: new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString(),
    },
  },
];
