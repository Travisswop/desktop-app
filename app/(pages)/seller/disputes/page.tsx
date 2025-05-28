'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/UserContext';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Pagination,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  Tabs,
  Tab,
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
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import {
  getSellerDisputes,
  getDisputeDetails,
  DisputeDetails,
} from '@/actions/disputeActions';
import { SellerDisputeChallenge } from '@/components/order/orderId/components/SellerDisputeChallenge';

interface DisputeStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
  rejected: number;
  challenged: number;
}

interface DisputeFilters {
  status?: string;
  priority?: string;
  page: number;
  limit: number;
}

export default function SellerDisputeDashboard() {
  const router = useRouter();
  const { accessToken, user } = useUser();

  const [disputes, setDisputes] = useState<DisputeDetails[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0,
    challenged: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] =
    useState<DisputeDetails | null>(null);
  const [showDisputeDetails, setShowDisputeDetails] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengingDisputeId, setChallengingDisputeId] = useState<
    string | null
  >(null);

  const [filters, setFilters] = useState<DisputeFilters>({
    status: '',
    priority: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });

  // Load disputes
  useEffect(() => {
    if (!accessToken) return;
    loadDisputes();
  }, [accessToken, filters]);

  const loadDisputes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getSellerDisputes(accessToken!, filters);

      if (result.success && result.disputes) {
        setDisputes(result.disputes);

        if (result.pagination) {
          setPagination(result.pagination);
        }

        // Calculate stats
        const newStats: DisputeStats = {
          total: result.disputes.length,
          pending: result.disputes.filter(
            (d) => d.status === 'pending'
          ).length,
          underReview: result.disputes.filter(
            (d) => d.status === 'under_review'
          ).length,
          resolved: result.disputes.filter(
            (d) => d.status === 'resolved'
          ).length,
          rejected: result.disputes.filter(
            (d) => d.status === 'rejected'
          ).length,
          challenged: result.disputes.filter(
            (d) => d.status === 'challenged'
          ).length,
        };
        setStats(newStats);
      } else {
        setError(result.message || 'Failed to load disputes');
      }
    } catch (error: any) {
      console.error('Error loading disputes:', error);
      setError(error.message || 'Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  };

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
    loadDisputes();
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
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

  const canChallengeDispute = (dispute: DisputeDetails) => {
    return (
      (dispute.status === 'pending' ||
        dispute.status === 'under_review') &&
      !dispute.sellerChallenge
    );
  };

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardBody className="text-center p-6">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please log in to access the dispute dashboard.
            </p>
            <Button
              color="primary"
              onPress={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dispute Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and respond to customer disputes for your orders
          </p>
        </div>
        <Button
          color="primary"
          startContent={<RefreshCw className="w-4 h-4" />}
          onPress={loadDisputes}
          isLoading={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardBody className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total}
            </p>
            <p className="text-sm text-gray-600">Total Disputes</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.underReview}
            </p>
            <p className="text-sm text-gray-600">Under Review</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.resolved}
            </p>
            <p className="text-sm text-gray-600">Resolved</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {stats.rejected}
            </p>
            <p className="text-sm text-gray-600">Rejected</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {stats.challenged}
            </p>
            <p className="text-sm text-gray-600">Challenged</p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Filters:
              </span>
            </div>

            <Select
              placeholder="All Statuses"
              size="sm"
              className="w-40"
              selectedKeys={filters.status ? [filters.status] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                handleFilterChange('status', value || '');
              }}
            >
              <SelectItem key="">All Statuses</SelectItem>
              <SelectItem key="pending">Pending</SelectItem>
              <SelectItem key="under_review">Under Review</SelectItem>
              <SelectItem key="resolved">Resolved</SelectItem>
              <SelectItem key="rejected">Rejected</SelectItem>
              <SelectItem key="challenged">Challenged</SelectItem>
            </Select>

            <Select
              placeholder="All Priorities"
              size="sm"
              className="w-40"
              selectedKeys={
                filters.priority ? [filters.priority] : []
              }
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                handleFilterChange('priority', value || '');
              }}
            >
              <SelectItem key="">All Priorities</SelectItem>
              <SelectItem key="low">Low</SelectItem>
              <SelectItem key="medium">Medium</SelectItem>
              <SelectItem key="high">High</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h3 className="text-lg font-semibold">Your Disputes</h3>
            {pagination.totalCount > 0 && (
              <span className="text-sm text-gray-600">
                Showing{' '}
                {(pagination.currentPage - 1) * filters.limit + 1} to{' '}
                {Math.min(
                  pagination.currentPage * filters.limit,
                  pagination.totalCount
                )}{' '}
                of {pagination.totalCount} disputes
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
              <span className="ml-3 text-gray-600">
                Loading disputes...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Disputes
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button color="primary" onPress={loadDisputes}>
                Try Again
              </Button>
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Disputes Found
              </h3>
              <p className="text-gray-600">
                {filters.status || filters.priority
                  ? 'No disputes match your current filters.'
                  : 'Great! You have no disputes to manage.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
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
                            startContent={getStatusIcon(
                              dispute.status
                            )}
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
                          {dispute.sellerChallenge && (
                            <Chip color="secondary" size="sm">
                              CHALLENGED
                            </Chip>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(
                              dispute.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{dispute.buyerInfo.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>Order #{dispute.orderId}</span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4 line-clamp-2">
                        {dispute.description}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<Eye className="w-4 h-4" />}
                          onPress={() =>
                            loadDisputeDetails(dispute.id)
                          }
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
                        <Button
                          size="sm"
                          variant="light"
                          color="primary"
                          onPress={() =>
                            router.push(`/order/${dispute.orderId}`)
                          }
                        >
                          View Order
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={pagination.totalPages}
            page={pagination.currentPage}
            onChange={handlePageChange}
            showControls
            showShadow
          />
        </div>
      )}

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
                      Order Information
                    </label>
                    <div className="mt-1">
                      <p className="text-gray-900 font-medium">
                        Order #{selectedDispute.orderId}
                      </p>
                      <p className="text-sm text-gray-600">
                        Submitted on{' '}
                        {new Date(
                          selectedDispute.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
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
              canChallengeDispute(selectedDispute) && (
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
                orderId={selectedDispute?.orderId || ''}
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
    </div>
  );
}
