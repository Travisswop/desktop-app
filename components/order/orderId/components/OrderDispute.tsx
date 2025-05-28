import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Divider,
  Spinner,
} from '@nextui-org/react';
import {
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  Upload,
  X,
  File,
  Image,
  MessageSquare,
  Calendar,
  User,
  Shield,
} from 'lucide-react';
import { OrderData, UserRole } from '../types/order.types';
import { getOrderDisputes } from '@/actions/disputeActions';
import { useUser } from '@/lib/UserContext';

interface OrderDisputeProps {
  order: OrderData;
  userRole: UserRole;
  onDisputeSubmit: (disputeData: DisputeData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface DisputeData {
  reason: string;
  category: string;
  description: string;
  documents: File[];
  priority: 'low' | 'medium' | 'high';
}

interface DisputeHistoryItem {
  id: string;
  reason: string;
  category: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  response?: string;
  responseDate?: string;
}

const disputeCategories = [
  { key: 'item_not_received', label: 'Item Not Received' },
  { key: 'item_damaged', label: 'Item Damaged/Defective' },
  { key: 'wrong_item', label: 'Wrong Item Received' },
  { key: 'quality_issues', label: 'Quality Issues' },
  { key: 'shipping_issues', label: 'Shipping Problems' },
  {
    key: 'seller_communication',
    label: 'Seller Communication Issues',
  },
  { key: 'payment_issues', label: 'Payment Problems' },
  { key: 'other', label: 'Other' },
];

// File validation constants
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_FILES = 2;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const OrderDispute: React.FC<OrderDisputeProps> = ({
  order,
  userRole,
  onDisputeSubmit,
  isSubmitting = false,
}) => {
  const { accessToken } = useUser();
  const [disputeData, setDisputeData] = useState<DisputeData>({
    reason: '',
    category: '',
    description: '',
    documents: [],
    priority: 'medium',
  });

  const [errors, setErrors] = useState<Partial<DisputeData>>({});
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [disputes, setDisputes] = useState<DisputeHistoryItem[]>([]);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Fetch existing disputes on component mount
  useEffect(() => {
    const fetchDisputes = async () => {
      if (!accessToken) {
        setIsLoadingDisputes(false);
        return;
      }

      try {
        // Mock dispute data for testing UI
        const mockDisputes: DisputeHistoryItem[] = [
          {
            id: 'dispute_001',
            reason: 'Item arrived damaged',
            category: 'item_damaged',
            description:
              'The product packaging was severely damaged during shipping, and the item inside has multiple scratches and dents. The product is not in the condition I expected when I placed the order.',
            status: 'pending',
            priority: 'medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'dispute_002',
            reason: 'Wrong item received',
            category: 'wrong_item',
            description:
              'I ordered a blue smartphone case but received a red one instead. The product code on the package matches my order, but the color is completely different from what I selected.',
            status: 'under_review',
            priority: 'high',
            createdAt: new Date(
              Date.now() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(), // 2 days ago
            updatedAt: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
          },
          {
            id: 'dispute_003',
            reason: 'Quality issues with the product',
            category: 'quality_issues',
            description:
              'The product quality is significantly lower than advertised. The material feels cheap and the construction is poor. Several parts are already showing signs of wear after just one day of use.',
            status: 'resolved',
            priority: 'low',
            createdAt: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000
            ).toISOString(), // 7 days ago
            updatedAt: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
            response:
              'Thank you for bringing this to our attention. After reviewing your case and the photos you provided, we agree that the product quality does not meet our standards. We have processed a full refund of $89.99 to your original payment method. You should see the refund within 3-5 business days. We have also reported this issue to our quality control team to prevent similar issues in the future.',
            responseDate: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
          },
          {
            id: 'dispute_004',
            reason: 'Item not as described',
            category: 'other',
            description:
              'The product description mentioned that it was waterproof, but when I tested it, water immediately seeped through. This is a safety concern as I purchased it specifically for outdoor activities.',
            status: 'rejected',
            priority: 'high',
            createdAt: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000
            ).toISOString(), // 10 days ago
            updatedAt: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(), // 3 days ago
            response:
              'After careful review of your dispute and consultation with the manufacturer, we found that the product description clearly states "water-resistant" not "waterproof." Water-resistant means it can withstand light moisture but is not designed for submersion. However, we understand the confusion and are updating our product descriptions to be clearer. We are offering you a 20% discount on your next purchase as a gesture of goodwill.',
            responseDate: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(), // 3 days ago
          },
        ];

        // Simulate API call delay
        // await new Promise((resolve) => setTimeout(resolve, 1000));

        // setDisputes(mockDisputes);
        // setShowForm(mockDisputes.length === 0);

        // Uncomment below for real API call

        const result = await getOrderDisputes(
          order.orderId,
          accessToken
        );
        if (result.success && result.disputes) {
          setDisputes(result.disputes);
          // Show form only if no disputes exist
          setShowForm(result.disputes.length === 0);
        } else {
          setShowForm(true);
        }
      } catch (error) {
        console.error('Error fetching disputes:', error);
        setShowForm(true);
      } finally {
        setIsLoadingDisputes(false);
      }
    };

    fetchDisputes();
  }, [order.orderId, accessToken]);

  const validateForm = (): boolean => {
    const newErrors: Partial<DisputeData> = {};

    if (!disputeData.category) {
      newErrors.category = 'Please select a dispute category';
    }

    if (!disputeData.reason.trim()) {
      newErrors.reason = 'Please provide a brief reason';
    }

    if (!disputeData.description.trim()) {
      newErrors.description = 'Please provide a detailed description';
    } else if (disputeData.description.trim().length < 20) {
      newErrors.description =
        'Description must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 500KB.`;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File "${file.name}" has an unsupported format. Please use images, PDF, or document files.`;
    }

    return null;
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (disputeData.documents.length + files.length > MAX_FILES) {
      newErrors.push(
        `You can upload a maximum of ${MAX_FILES} files.`
      );
      setFileErrors(newErrors);
      return;
    }

    // Validate each file
    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setFileErrors(newErrors);
    } else {
      setFileErrors([]);
      setDisputeData((prev) => ({
        ...prev,
        documents: [...prev.documents, ...validFiles],
      }));
    }

    // Reset the input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setDisputeData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
    setFileErrors([]);
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onDisputeSubmit(disputeData);
      // Reset form on success
      setDisputeData({
        reason: '',
        category: '',
        description: '',
        documents: [],
        priority: 'medium',
      });
      setErrors({});
      setFileErrors([]);
      setShowForm(false);

      // Refresh disputes list
      if (accessToken) {
        const result = await getOrderDisputes(
          order.orderId,
          accessToken
        );
        if (result.success && result.disputes) {
          setDisputes(result.disputes);
        }
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
    }
  };

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
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'under_review':
        return 'Under Review';
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
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

  const getCategoryLabel = (category: string) => {
    const found = disputeCategories.find(
      (cat) => cat.key === category
    );
    return found ? found.label : category;
  };

  const canDispute = order.orderType !== 'non-phygitals';

  if (!canDispute) {
    return (
      <Card className="w-full">
        <CardBody className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Disputes Not Available
          </h3>
          <p className="text-gray-500">
            Disputes are not available for non-physical digital
            orders. For support with digital products, please contact
            customer service directly.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (isLoadingDisputes) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">
          Loading dispute information...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Disputes */}
      {disputes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">
                  Your Disputes
                </h3>
              </div>
              {!showForm && (
                <Button
                  size="sm"
                  color="primary"
                  variant="light"
                  onPress={() => setShowForm(true)}
                >
                  Submit New Dispute
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="pt-0 space-y-4">
            {disputes.map((dispute, index) => (
              <Card
                key={dispute.id}
                className="border border-gray-200"
              >
                <CardBody className="space-y-3">
                  {/* Dispute Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Chip
                        size="sm"
                        color={getStatusColor(dispute.status)}
                        variant="flat"
                      >
                        {getStatusText(dispute.status)}
                      </Chip>
                      <Chip
                        size="sm"
                        color={getPriorityColor(dispute.priority)}
                        variant="dot"
                      >
                        {dispute.priority.toUpperCase()} Priority
                      </Chip>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(
                        dispute.createdAt
                      ).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Dispute Details */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Category:
                      </span>
                      <span className="ml-2 text-sm">
                        {getCategoryLabel(dispute.category)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Reason:
                      </span>
                      <span className="ml-2 text-sm">
                        {dispute.reason}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Description:
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {dispute.description}
                      </p>
                    </div>
                  </div>

                  {/* Admin Response */}
                  {dispute.response && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Support Team Response
                        </span>
                        {dispute.responseDate && (
                          <span className="text-xs text-blue-600">
                            {new Date(
                              dispute.responseDate
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-blue-700">
                        {dispute.response}
                      </p>
                    </div>
                  )}

                  {/* Status Information */}
                  {dispute.status === 'pending' && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                      <Clock className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-orange-700">
                        <p className="font-medium">
                          Your dispute is pending review
                        </p>
                        <p>
                          Our team will review your dispute within
                          24-48 hours and contact you with updates.
                        </p>
                      </div>
                    </div>
                  )}

                  {dispute.status === 'under_review' && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">
                          Your dispute is under review
                        </p>
                        <p>
                          Our team is actively investigating your
                          case. We&apos;ll contact you soon with an
                          update.
                        </p>
                      </div>
                    </div>
                  )}

                  {dispute.status === 'resolved' && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-green-700">
                        <p className="font-medium">
                          Dispute resolved
                        </p>
                        <p>
                          Your dispute has been successfully resolved.
                          Check the response above for details.
                        </p>
                      </div>
                    </div>
                  )}

                  {dispute.status === 'rejected' && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <p className="font-medium">
                          Dispute rejected
                        </p>
                        <p>
                          Your dispute was not approved. See the
                          response above for more information.
                        </p>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Show form if no disputes exist or user wants to submit new one */}
      {showForm && (
        <>
          {disputes.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="light"
                onPress={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          {/* Dispute Guidelines */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">
                  Dispute Guidelines
                </h3>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Only submit a dispute if you have a legitimate
                    issue with your order
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Provide detailed information and supporting
                    documents to help us resolve your issue quickly
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Our team will review your dispute within 24-48
                    hours
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Disputes should be submitted within 30 days of
                    order completion
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">
                Order Information
              </h3>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">
                    Order ID:
                  </span>
                  <span className="ml-2">{order.orderId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Order Date:
                  </span>
                  <span className="ml-2">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Order Type:
                  </span>
                  <span className="ml-2">{order.orderType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Amount:
                  </span>
                  <span className="ml-2">
                    ${order.financial.totalCost}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Delivery Status:
                  </span>
                  <Chip
                    size="sm"
                    color={
                      order.status.delivery === 'Completed'
                        ? 'success'
                        : order.status.delivery === 'In Progress'
                        ? 'warning'
                        : 'default'
                    }
                    className="ml-2"
                  >
                    {order.status.delivery}
                  </Chip>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Payment Status:
                  </span>
                  <Chip
                    size="sm"
                    color={
                      order.status.payment === 'completed'
                        ? 'success'
                        : order.status.payment === 'processing'
                        ? 'warning'
                        : 'danger'
                    }
                    className="ml-2"
                  >
                    {order.status.payment}
                  </Chip>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Dispute Form */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold">
                  Submit Dispute
                </h3>
              </div>
            </CardHeader>
            <CardBody className="pt-0 space-y-4">
              {/* Dispute Category */}
              <div>
                <Select
                  label="Dispute Category"
                  placeholder="Select the type of issue"
                  selectedKeys={
                    disputeData.category ? [disputeData.category] : []
                  }
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setDisputeData((prev) => ({
                      ...prev,
                      category: selectedKey,
                    }));
                    if (errors.category) {
                      setErrors((prev) => ({
                        ...prev,
                        category: undefined,
                      }));
                    }
                  }}
                  isInvalid={!!errors.category}
                  errorMessage={errors.category}
                  isRequired
                >
                  {disputeCategories.map((category) => (
                    <SelectItem
                      key={category.key}
                      value={category.key}
                    >
                      {category.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Brief Reason */}
              <div>
                <Textarea
                  label="Brief Reason"
                  placeholder="Provide a brief summary of the issue (e.g., 'Item arrived damaged')"
                  value={disputeData.reason}
                  onValueChange={(value) => {
                    setDisputeData((prev) => ({
                      ...prev,
                      reason: value,
                    }));
                    if (errors.reason) {
                      setErrors((prev) => ({
                        ...prev,
                        reason: undefined,
                      }));
                    }
                  }}
                  maxRows={2}
                  isInvalid={!!errors.reason}
                  errorMessage={errors.reason}
                  isRequired
                />
              </div>

              {/* Detailed Description */}
              <div>
                <Textarea
                  label="Detailed Description"
                  placeholder="Please provide a detailed description of the issue, including any relevant information that will help us resolve your dispute..."
                  value={disputeData.description}
                  onValueChange={(value) => {
                    setDisputeData((prev) => ({
                      ...prev,
                      description: value,
                    }));
                    if (errors.description) {
                      setErrors((prev) => ({
                        ...prev,
                        description: undefined,
                      }));
                    }
                  }}
                  minRows={4}
                  maxRows={8}
                  isInvalid={!!errors.description}
                  errorMessage={errors.description}
                  isRequired
                />
                <div className="text-xs text-gray-500 mt-1">
                  {disputeData.description.length}/500 characters
                  (minimum 20 required)
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-2">
                      Upload photos, receipts, or other supporting
                      documents
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Supported formats: Images (JPG, PNG, GIF, WebP),
                      PDF, Word documents
                      <br />
                      Maximum file size: 500KB | Maximum files:{' '}
                      {MAX_FILES}
                    </div>
                    <input
                      type="file"
                      multiple
                      accept={ALLOWED_FILE_TYPES.join(',')}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="document-upload"
                      disabled={
                        disputeData.documents.length >= MAX_FILES
                      }
                    />
                    <Button
                      as="label"
                      htmlFor="document-upload"
                      variant="flat"
                      color="primary"
                      size="sm"
                      isDisabled={
                        disputeData.documents.length >= MAX_FILES
                      }
                      className="cursor-pointer"
                    >
                      Choose Files
                    </Button>
                  </div>
                </div>

                {/* File Errors */}
                {fileErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {fileErrors.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}

                {/* Uploaded Files Preview */}
                {disputeData.documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Uploaded Files ({disputeData.documents.length}/
                      {MAX_FILES})
                    </div>
                    {disputeData.documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md border"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => removeFile(index)}
                          className="flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Divider />

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  color="danger"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  isDisabled={
                    !disputeData.category ||
                    !disputeData.reason.trim() ||
                    !disputeData.description.trim()
                  }
                  className="px-8"
                >
                  Submit Dispute
                </Button>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};
