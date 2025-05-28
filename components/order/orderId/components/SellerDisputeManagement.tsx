import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import {
  getOrderDisputes,
  getDisputeDetails,
  DisputeDetails,
} from '@/actions/disputeActions';
import { SellerDisputeChallenge } from './SellerDisputeChallenge';

interface SellerDisputeManagementProps {
  orderId: string;
  userRole: 'buyer' | 'seller';
}

interface DisputeListItem {
  id: string;
  reason: string;
  category: string;
  status:
    | 'pending'
    | 'under_review'
    | 'resolved'
    | 'rejected'
    | 'challenged';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  hasSellerChallenge: boolean;
}

export const SellerDisputeManagement: React.FC<
  SellerDisputeManagementProps
> = ({ orderId, userRole }) => {
  const { accessToken } = useUser();
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] =
    useState<DisputeDetails | null>(null);
  const [showDisputeDetails, setShowDisputeDetails] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengingDisputeId, setChallengingDisputeId] = useState<
    string | null
  >(null);

  // Load disputes for this order
  useEffect(() => {
    const loadDisputes = async () => {
      if (!accessToken || userRole !== 'seller') {
        setIsLoading(false);
        return;
      }

      try {
        const result = await getOrderDisputes(orderId, accessToken);
        if (result.success && result.disputes) {
          const mappedDisputes: DisputeListItem[] =
            result.disputes.map((dispute: any) => ({
              id: dispute.id,
              reason: dispute.reason,
              category: dispute.category,
              status: dispute.status,
              priority: dispute.priority,
              createdAt: dispute.createdAt,
              hasSellerChallenge: !!dispute.sellerChallenge,
            }));
          setDisputes(mappedDisputes);
        } else {
          setDisputes([]);
        }
      } catch (error: any) {
        console.error('Error loading disputes:', error);
        setError(error.message || 'Failed to load disputes');
      } finally {
        setIsLoading(false);
      }
    };

    loadDisputes();
  }, [orderId, accessToken, userRole]);

  // Load detailed dispute information
  const loadDisputeDetails = async (disputeId: string) => {
    if (!accessToken) return;

    try {
      const result = await getDisputeDetails(disputeId, accessToken);
      if (result.success && result.dispute) {
        setSelectedDispute(result.dispute);
        setShowDisputeDetails(true);
      }
    } catch (error) {
      console.error('Error loading dispute details:', error);
    }
  };

  // Handle challenge dispute
  const handleChallengeDispute = (disputeId: string) => {
    setChallengingDisputeId(disputeId);
    setShowChallengeModal(true);
  };

  // Handle challenge submitted
  const handleChallengeSubmitted = () => {
    // Refresh disputes list
    setIsLoading(true);
    const loadDisputes = async () => {
      try {
        const result = await getOrderDisputes(orderId, accessToken!);
        if (result.success && result.disputes) {
          const mappedDisputes: DisputeListItem[] =
            result.disputes.map((dispute: any) => ({
              id: dispute.id,
              reason: dispute.reason,
              category: dispute.category,
              status: dispute.status,
              priority: dispute.priority,
              createdAt: dispute.createdAt,
              hasSellerChallenge: !!dispute.sellerChallenge,
            }));
          setDisputes(mappedDisputes);
        }
      } catch (error) {
        console.error('Error refreshing disputes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDisputes();
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

  const canChallengeDispute = (dispute: DisputeListItem) => {
    return (
      (dispute.status === 'pending' ||
        dispute.status === 'under_review') &&
      !dispute.hasSellerChallenge
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-600">
              Loading disputes...
            </span>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Disputes
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              color="primary"
              onPress={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Show no disputes state
  if (disputes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">
              Dispute Management
            </h3>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Disputes
            </h3>
            <p className="text-gray-600">
              Great! There are no disputes for this order.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold">
                Dispute Management
              </h3>
              <Chip color="warning" size="sm">
                {disputes.length}{' '}
                {disputes.length === 1 ? 'Dispute' : 'Disputes'}
              </Chip>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6 space-y-4">
          {disputes.map((dispute, index) => (
            <Card key={dispute.id} className="border">
              <CardBody className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(dispute.category)}
                        <h4 className="font-semibold text-gray-900">
                          {dispute.reason}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip
                          color={getStatusColor(dispute.status)}
                          size="sm"
                          startContent={getStatusIcon(dispute.status)}
                        >
                          {dispute.status
                            .replace('_', ' ')
                            .toUpperCase()}
                        </Chip>
                        <Chip
                          color={getPriorityColor(dispute.priority)}
                          size="sm"
                        >
                          {dispute.priority.toUpperCase()}
                        </Chip>
                        {dispute.hasSellerChallenge && (
                          <Chip color="secondary" size="sm">
                            CHALLENGED
                          </Chip>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(
                            dispute.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>
                          {dispute.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<Eye className="w-4 h-4" />}
                        onPress={() => loadDisputeDetails(dispute.id)}
                      >
                        View Details
                      </Button>
                      {canChallengeDispute(dispute) && (
                        <Button
                          size="sm"
                          color="warning"
                          startContent={
                            <Shield className="w-4 h-4" />
                          }
                          onPress={() =>
                            handleChallengeDispute(dispute.id)
                          }
                        >
                          Challenge Dispute
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </CardBody>
      </Card>

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
            {selectedDispute && (
              <div className="space-y-6">
                {/* Dispute Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Buyer Information
                    </label>
                    <div className="mt-1">
                      <p className="text-gray-900 font-medium">
                        {selectedDispute.buyerInfo.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedDispute.buyerInfo.email}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Dispute Status
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <Chip
                        color={getStatusColor(selectedDispute.status)}
                        size="sm"
                        startContent={getStatusIcon(
                          selectedDispute.status
                        )}
                      >
                        {selectedDispute.status
                          .replace('_', ' ')
                          .toUpperCase()}
                      </Chip>
                      <Chip
                        color={getPriorityColor(
                          selectedDispute.priority
                        )}
                        size="sm"
                      >
                        {selectedDispute.priority.toUpperCase()}{' '}
                        PRIORITY
                      </Chip>
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Dispute Content */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Dispute Reason
                  </label>
                  <p className="text-gray-900 font-medium mt-1">
                    {selectedDispute.reason}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <p className="text-gray-900 mt-1">
                    {selectedDispute.category.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg mt-1">
                    <p className="text-gray-900">
                      {selectedDispute.description}
                    </p>
                  </div>
                </div>

                {/* Buyer Evidence */}
                {selectedDispute.documents &&
                  selectedDispute.documents.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Buyer&apos;s Evidence (
                        {selectedDispute.documents.length} files)
                      </label>
                      <div className="space-y-2">
                        {selectedDispute.documents.map(
                          (doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                {getFileIcon(doc.fileType)}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {doc.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(doc.fileSize)} •{' '}
                                    {doc.fileType}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                startContent={
                                  <Download className="w-4 h-4" />
                                }
                                onPress={() =>
                                  window.open(
                                    doc.downloadUrl,
                                    '_blank'
                                  )
                                }
                              >
                                Download
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Seller Challenge */}
                {selectedDispute.sellerChallenge && (
                  <div>
                    <Divider />
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <h4 className="font-semibold">
                        Your Challenge
                      </h4>
                      <Chip
                        color={
                          selectedDispute.sellerChallenge.status ===
                          'accepted'
                            ? 'success'
                            : selectedDispute.sellerChallenge
                                .status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {selectedDispute.sellerChallenge.status.toUpperCase()}
                      </Chip>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-900 mb-2">
                        {selectedDispute.sellerChallenge.response}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted on{' '}
                        {new Date(
                          selectedDispute.sellerChallenge.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedDispute.sellerChallenge
                      .adminResponse && (
                      <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Admin Response:
                        </p>
                        <p className="text-gray-900">
                          {
                            selectedDispute.sellerChallenge
                              .adminResponse
                          }
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
            {selectedDispute &&
              canChallengeDispute({
                id: selectedDispute.id,
                reason: selectedDispute.reason,
                category: selectedDispute.category,
                status: selectedDispute.status,
                priority: selectedDispute.priority,
                createdAt: selectedDispute.createdAt,
                hasSellerChallenge: !!selectedDispute.sellerChallenge,
              }) && (
                <Button
                  color="warning"
                  startContent={<Shield className="w-4 h-4" />}
                  onPress={() => {
                    setShowDisputeDetails(false);
                    handleChallengeDispute(selectedDispute.id);
                  }}
                >
                  Challenge This Dispute
                </Button>
              )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Challenge Modal */}
      {showChallengeModal && challengingDisputeId && (
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
                disputeId={challengingDisputeId}
                orderId={orderId}
                onChallengeSubmitted={handleChallengeSubmitted}
                onClose={() => {
                  setShowChallengeModal(false);
                  setChallengingDisputeId(null);
                }}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};
