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
  MessageSquare,
  Calendar,
  User,
  Shield,
} from 'lucide-react';
import {
  createGuestOrderDispute,
  getGuestOrderDisputes,
} from '@/actions/guestOrderActions';

interface GuestOrderDisputeProps {
  orderId: string;
  email: string;
  order: any; // Order data
  onDisputeSubmit?: (disputeData: GuestDisputeData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface GuestDisputeData {
  reason: string;
  category: string;
  description: string;
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

export const GuestOrderDispute: React.FC<GuestOrderDisputeProps> = ({
  orderId,
  email,
  order,
  onDisputeSubmit,
  isSubmitting = false,
}) => {
  const [disputeData, setDisputeData] = useState<GuestDisputeData>({
    reason: '',
    category: '',
    description: '',
    priority: 'medium',
  });

  const [errors, setErrors] = useState<Partial<GuestDisputeData>>({});
  const [disputes, setDisputes] = useState<DisputeHistoryItem[]>([]);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmittingInternal, setIsSubmittingInternal] =
    useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(
    null
  );

  // Fetch existing disputes on component mount
  useEffect(() => {
    const fetchDisputes = async () => {
      if (!orderId || !email) {
        setIsLoadingDisputes(false);
        return;
      }

      try {
        const result = await getGuestOrderDisputes(orderId, email);
        console.log('Guest dispute result:', result);

        if (result.success && result.dispute) {
          // Convert single dispute object to array for consistency with existing UI logic
          setDisputes([result.dispute]);
          // Show form only if no disputes exist
          setShowForm(false);
        } else {
          setDisputes([]);
          setShowForm(true);
        }
      } catch (error) {
        console.error('Error fetching guest disputes:', error);
        setShowForm(true);
      } finally {
        setIsLoadingDisputes(false);
      }
    };

    fetchDisputes();
  }, [orderId, email]);

  const validateForm = (): boolean => {
    const newErrors: Partial<GuestDisputeData> = {};

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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmittingInternal(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (onDisputeSubmit) {
        await onDisputeSubmit(disputeData);
      } else {
        // Use internal submission logic
        const result = await createGuestOrderDispute({
          orderId,
          email,
          reason: disputeData.reason,
          category: disputeData.category,
          description: disputeData.description,
          priority: disputeData.priority,
        });

        if (!result.success) {
          throw new Error(result.message);
        }

        setSubmitSuccess(
          result.message || 'Dispute submitted successfully!'
        );
      }

      // Reset form on success
      setDisputeData({
        reason: '',
        category: '',
        description: '',
        priority: 'medium',
      });
      setErrors({});
      setShowForm(false);

      // Refresh disputes list
      setTimeout(async () => {
        const result = await getGuestOrderDisputes(orderId, email);
        if (result.success && result.dispute) {
          setDisputes([result.dispute]);
        }
        setSubmitSuccess(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting dispute:', error);
      setSubmitError(
        error.message || 'Failed to submit dispute. Please try again.'
      );
    } finally {
      setIsSubmittingInternal(false);
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
      {/* Success/Error Messages */}
      {submitSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{submitSuccess}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {submitError && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{submitError}</span>
            </div>
          </CardBody>
        </Card>
      )}

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
                          24-48 hours and contact you via email with
                          updates.
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
                          case. We&apos;ll contact you via email soon
                          with an update.
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
                    Provide detailed information to help us resolve
                    your issue quickly
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Our team will review your dispute within 24-48
                    hours and contact you via email
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

              {/* Priority Selection */}
              <div>
                <Select
                  label="Priority Level"
                  selectedKeys={[disputeData.priority]}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as
                      | 'low'
                      | 'medium'
                      | 'high';
                    setDisputeData((prev) => ({
                      ...prev,
                      priority: selectedKey,
                    }));
                  }}
                >
                  <SelectItem key="low">Low Priority</SelectItem>
                  <SelectItem key="medium">
                    Medium Priority
                  </SelectItem>
                  <SelectItem key="high">High Priority</SelectItem>
                </Select>
              </div>

              <Divider />

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  color="danger"
                  onPress={handleSubmit}
                  isLoading={isSubmitting || isSubmittingInternal}
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
