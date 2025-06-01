import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Badge,
} from '@nextui-org/react';
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Eye,
  Download,
  Calendar,
  User,
  Package,
  Truck,
  Scale,
  File,
  Image,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { getOrderDisputes } from '@/actions/disputeActions';
import { SellerDisputeChallenge } from './SellerDisputeChallenge';

interface SellerDisputeManagementProps {
  orderId: string;
  userRole: 'buyer' | 'seller';
}

interface DisputeItem {
  id: string;
  reason: string;
  category: string;
  description: string;
  status:
    | 'pending'
    | 'under_review'
    | 'resolved'
    | 'rejected'
    | 'challenged';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  response: string | null;
  responseDate: string | null;
  hasSellerChallenge: boolean;
  sellerChallenge?: any;
  documents: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    downloadUrl: string;
  }>;
  buyerInfo?: {
    name: string;
    email: string;
  };
}

export const SellerDisputeManagement: React.FC<
  SellerDisputeManagementProps
> = ({ orderId, userRole }) => {
  const { accessToken } = useUser();
  const [dispute, setDispute] = useState<DisputeItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisputeDetails, setShowDisputeDetails] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Load dispute for this order
  const loadDispute = useCallback(async () => {
    if (!accessToken || userRole !== 'seller') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await getOrderDisputes(orderId, accessToken);
      console.log('🚀 ~ result:', result);
      if (result.success && result.dispute) {
        // Handle dispute as a single object
        const disputeData: any = result.dispute;
        const mappedDispute: DisputeItem = {
          id: disputeData.id,
          reason: disputeData.reason,
          category: disputeData.category,
          description: disputeData.description,
          status: disputeData.status,
          priority: disputeData.priority,
          createdAt: disputeData.createdAt,
          updatedAt: disputeData.updatedAt,
          response: disputeData.response,
          responseDate: disputeData.responseDate,
          hasSellerChallenge: !!disputeData.sellerChallenge,
          sellerChallenge: disputeData.sellerChallenge,
          documents: disputeData.documents || [],
          buyerInfo: disputeData.buyerInfo,
        };
        setDispute(mappedDispute);
        setError(null);
      } else {
        setDispute(null);
        if (result.message) {
          setError(result.message);
        }
      }
    } catch (error: any) {
      console.error('Error loading dispute:', error);
      setError(error.message || 'Failed to load dispute');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, accessToken, userRole]);

  // Initial load
  useEffect(() => {
    loadDispute();
  }, [orderId, accessToken, userRole]);

  // Load dispute details - now just shows the modal with existing data
  const showDisputeDetailsModal = () => {
    if (dispute) {
      setShowDisputeDetails(true);
    }
  };

  // Handle challenge dispute
  const handleChallengeDispute = () => {
    if (dispute) {
      setShowChallengeModal(true);
    }
  };

  // Handle challenge submitted
  const handleChallengeSubmitted = () => {
    setShowChallengeModal(false);
    // Refresh dispute
    loadDispute();
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    loadDispute();
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'under_review':
        return 'primary';
      case 'resolved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'challenged':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'under_review':
        return <Eye className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'challenged':
        return <Shield className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'item_not_received':
        return <Package className="w-4 h-4" />;
      case 'item_damaged':
        return <AlertTriangle className="w-4 h-4" />;
      case 'shipping_issues':
        return <Truck className="w-4 h-4" />;
      case 'quality_issues':
        return <Scale className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const canChallengeDispute = (disputeItem: DisputeItem) => {
    return (
      (disputeItem.status === 'pending' ||
        disputeItem.status === 'under_review') &&
      !disputeItem.hasSellerChallenge
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (userRole !== 'seller') {
    return (
      <Card className="w-full">
        <CardBody className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500">
            Only sellers can access dispute management.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">
          Loading dispute information...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardBody className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Dispute
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button
            color="primary"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={() => loadDispute()}
          >
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with refresh */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">
              Dispute Management
            </h2>
          </div>
          <Button
            size="sm"
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={handleManualRefresh}
          >
            Refresh
          </Button>
        </div>

        {/* Dispute Status Card */}
        {dispute && (
          <Card className="bg-blue-50 border-blue-200">
            <CardBody className="text-center p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                {getStatusIcon(dispute.status)}
                <div className="text-2xl font-bold text-blue-600">
                  Dispute{' '}
                  {dispute.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div className="text-sm text-blue-600">
                {dispute.status === 'pending' ||
                dispute.status === 'under_review'
                  ? 'Action Required'
                  : 'Dispute Handled'}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Dispute Details */}
        {!dispute ? (
          <Card className="w-full">
            <CardBody className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Dispute Found
              </h3>
              <p className="text-gray-500 mb-4">
                This order currently has no dispute. Great job
                maintaining excellent customer service!
              </p>
              <div className="text-sm text-gray-400">
                A dispute will appear here if the customer raises
                concerns about their order.
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="border transition-all duration-200 hover:shadow-md">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(dispute.category)}
                      <h4 className="text-lg font-semibold text-gray-900">
                        {dispute.reason}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        color={getStatusColor(dispute.status)}
                        size="md"
                        startContent={getStatusIcon(dispute.status)}
                      >
                        {dispute.status
                          .replace('_', ' ')
                          .toUpperCase()}
                      </Chip>
                      <Chip
                        color={getPriorityColor(dispute.priority)}
                        size="md"
                      >
                        {dispute.priority.toUpperCase()} PRIORITY
                      </Chip>
                      {dispute.hasSellerChallenge && (
                        <Chip color="secondary" size="md">
                          CHALLENGED
                        </Chip>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Created {formatTimeAgo(dispute.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>Order #{orderId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      size="md"
                      variant="flat"
                      color="primary"
                      startContent={<Eye className="w-4 h-4" />}
                      onPress={showDisputeDetailsModal}
                    >
                      View Full Details
                    </Button>
                    {canChallengeDispute(dispute) && (
                      <Button
                        size="md"
                        color="warning"
                        startContent={<Shield className="w-4 h-4" />}
                        onPress={handleChallengeDispute}
                      >
                        Challenge Dispute
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Dispute Details Modal */}
      <Modal
        isOpen={showDisputeDetails}
        onOpenChange={setShowDisputeDetails}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Dispute Details
            </div>
          </ModalHeader>
          <ModalBody>
            {dispute && (
              <div className="space-y-6">
                {/* Dispute Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Buyer Information
                    </label>
                    <div className="mt-1">
                      <p className="text-gray-900 font-medium">
                        {dispute.buyerInfo?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {dispute.buyerInfo?.email}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Dispute Information
                    </label>
                    <div className="mt-1">
                      <p className="text-gray-900 font-medium">
                        {dispute.reason}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(
                          dispute.createdAt
                        ).toLocaleDateString()}{' '}
                        at{' '}
                        {new Date(
                          dispute.createdAt
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Divider />

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <p className="text-gray-900 font-medium mt-1">
                    {dispute.category.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg mt-1">
                    <p className="text-gray-900">
                      {dispute.description}
                    </p>
                  </div>
                </div>

                {/* Seller Challenge */}
                {dispute.sellerChallenge && (
                  <div>
                    <Divider />
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <h4 className="font-semibold">
                        Your Challenge
                      </h4>
                      <Chip
                        color={
                          dispute.sellerChallenge.status ===
                          'accepted'
                            ? 'success'
                            : dispute.sellerChallenge.status ===
                              'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {dispute.sellerChallenge.status.toUpperCase()}
                      </Chip>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-900 mb-2">
                        {dispute.sellerChallenge.response}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted on{' '}
                        {new Date(
                          dispute.sellerChallenge.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {dispute.sellerChallenge.adminResponse && (
                      <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Admin Response:
                        </p>
                        <p className="text-gray-900">
                          {dispute.sellerChallenge.adminResponse}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onPress={() => setShowDisputeDetails(false)}
            >
              Close
            </Button>
            {dispute && canChallengeDispute(dispute) && (
              <Button
                color="warning"
                startContent={<Shield className="w-4 h-4" />}
                onPress={() => {
                  setShowDisputeDetails(false);
                  handleChallengeDispute();
                }}
              >
                Challenge This Dispute
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Challenge Modal */}
      {showChallengeModal && dispute && (
        <Modal
          isOpen={showChallengeModal}
          onOpenChange={setShowChallengeModal}
          size="5xl"
          scrollBehavior="inside"
          isDismissable={false}
        >
          <ModalContent>
            <ModalBody className="p-0">
              <SellerDisputeChallenge
                disputeId={dispute.id}
                orderId={orderId}
                onChallengeSubmitted={handleChallengeSubmitted}
                onClose={() => {
                  setShowChallengeModal(false);
                }}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};
