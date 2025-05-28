import React, { useState } from 'react';
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
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
} from 'lucide-react';
import { mockDisputes } from '@/lib/mockData/sellerDisputes';
import { DisputeDetails } from '@/actions/disputeActions';

export const MockSellerDisputeManagement: React.FC = () => {
  const [disputes, setDisputes] =
    useState<DisputeDetails[]>(mockDisputes);
  const [selectedDispute, setSelectedDispute] =
    useState<DisputeDetails | null>(null);
  const [showDisputeDetails, setShowDisputeDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter disputes based on current filters
  const filteredDisputes = disputes.filter((dispute) => {
    const matchesStatus =
      !filters.status || dispute.status === filters.status;
    const matchesPriority =
      !filters.priority || dispute.priority === filters.priority;
    const matchesSearch =
      !filters.search ||
      dispute.reason
        .toLowerCase()
        .includes(filters.search.toLowerCase()) ||
      dispute.description
        .toLowerCase()
        .includes(filters.search.toLowerCase()) ||
      dispute.buyerInfo.name
        .toLowerCase()
        .includes(filters.search.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(
    filteredDisputes.length / itemsPerPage
  );
  const paginatedDisputes = filteredDisputes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Dispute Management</h1>
        </div>
        <div className="flex gap-2">
          <Button
            color="primary"
            variant="flat"
            startContent={<Filter className="w-4 h-4" />}
          >
            Filter
          </Button>
          <Button
            color="primary"
            startContent={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search disputes..."
              startContent={
                <Search className="w-4 h-4 text-gray-400" />
              }
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                }))
              }
            />
            <Select
              placeholder="Filter by status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
            >
              <SelectItem key="pending" value="pending">
                Pending
              </SelectItem>
              <SelectItem key="under_review" value="under_review">
                Under Review
              </SelectItem>
              <SelectItem key="resolved" value="resolved">
                Resolved
              </SelectItem>
              <SelectItem key="rejected" value="rejected">
                Rejected
              </SelectItem>
              <SelectItem key="challenged" value="challenged">
                Challenged
              </SelectItem>
            </Select>
            <Select
              placeholder="Filter by priority"
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: e.target.value,
                }))
              }
            >
              <SelectItem key="low" value="low">
                Low
              </SelectItem>
              <SelectItem key="medium" value="medium">
                Medium
              </SelectItem>
              <SelectItem key="high" value="high">
                High
              </SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Disputes List */}
      <Card>
        <CardBody>
          <div className="space-y-4">
            {paginatedDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {dispute.reason}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
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
                        {dispute.priority.toUpperCase()} PRIORITY
                      </Chip>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    color="primary"
                    startContent={<Eye className="w-4 h-4" />}
                    onPress={() => {
                      setSelectedDispute(dispute);
                      setShowDisputeDetails(true);
                    }}
                  >
                    View Details
                  </Button>
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

                {dispute.documents &&
                  dispute.documents.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>
                        {dispute.documents.length} document(s)
                        attached
                      </span>
                    </div>
                  )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination
                total={totalPages}
                page={currentPage}
                onChange={setCurrentPage}
                showControls
                showShadow
              />
            </div>
          )}
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
                        {selectedDispute.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              {doc.fileType.startsWith('image/') ? (
                                <Image className="w-4 h-4 text-blue-500" />
                              ) : (
                                <File className="w-4 h-4 text-gray-500" />
                              )}
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
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Seller Challenge */}
                {selectedDispute.sellerChallenge && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <h4 className="font-semibold">
                        Previous Challenge
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
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-gray-900">
                        {selectedDispute.sellerChallenge.response}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted on{' '}
                        {new Date(
                          selectedDispute.sellerChallenge.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedDispute.sellerChallenge
                      .adminResponse && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg">
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
              variant="light"
              onPress={() => setShowDisputeDetails(false)}
            >
              Close
            </Button>
            {selectedDispute && !selectedDispute.sellerChallenge && (
              <Button
                color="warning"
                startContent={<Shield className="w-4 h-4" />}
              >
                Challenge Dispute
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
