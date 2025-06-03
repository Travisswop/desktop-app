'use client';
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
} from '@nextui-org/react';
import {
  Shield,
  FileText,
  Upload,
  X,
  File,
  Image,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Camera,
  Package,
  Truck,
  CreditCard,
  Scale,
  Info,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import {
  createSellerChallenge,
  getDisputeDetails,
  SellerChallengeData,
  DisputeDetails,
  DisputeDocument,
} from '@/actions/disputeActions';

interface SellerDisputeChallengeProps {
  disputeId: string;
  orderId: string;
  onChallengeSubmitted: () => void;
  onClose: () => void;
}

interface ChallengeFormData {
  response: string;
  category: string;
  evidenceDescription: string;
  requestedAction: string;
  additionalNotes: string;
  documents: File[];
}

// Challenge categories with descriptions
const challengeCategories = [
  {
    key: 'evidence_provided',
    label: 'Evidence Provided',
    description: `I have evidence that contradicts the buyer's claim`,
    icon: <FileText className="w-5 h-5" />,
  },
  {
    key: 'shipping_proof',
    label: 'Shipping Proof',
    description: 'I have proof of proper shipping and delivery',
    icon: <Truck className="w-5 h-5" />,
  },
  {
    key: 'quality_dispute',
    label: 'Quality Dispute',
    description: 'The item quality meets the described standards',
    icon: <Package className="w-5 h-5" />,
  },
  {
    key: 'policy_violation',
    label: 'Policy Violation',
    description: 'The buyer violated our terms or return policy',
    icon: <Scale className="w-5 h-5" />,
  },
  {
    key: 'false_claim',
    label: 'False Claim',
    description: 'The buyer&apos;s claim is inaccurate or fraudulent',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Other reasons not covered above',
    icon: <MessageSquare className="w-5 h-5" />,
  },
];

// Requested actions
const requestedActions = [
  {
    key: 'dismiss_dispute',
    label: 'Dismiss Dispute',
    description: 'Request to dismiss the dispute entirely',
  },
  {
    key: 'partial_refund',
    label: 'Partial Refund',
    description: 'Offer a partial refund as compromise',
  },
  {
    key: 'replacement',
    label: 'Replacement',
    description: 'Offer to replace the item',
  },
  {
    key: 'store_credit',
    label: 'Store Credit',
    description: 'Offer store credit instead of refund',
  },
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

export const SellerDisputeChallenge: React.FC<
  SellerDisputeChallengeProps
> = ({ disputeId, orderId, onChallengeSubmitted, onClose }) => {
  const { accessToken } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const [formData, setFormData] = useState<ChallengeFormData>({
    response: '',
    category: '',
    evidenceDescription: '',
    requestedAction: '',
    additionalNotes: '',
    documents: [],
  });

  const [errors, setErrors] = useState<Partial<ChallengeFormData>>(
    {}
  );
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 2MB.`;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File "${file.name}" has an unsupported format.`;
    }

    return null;
  };

  // Handle file upload
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (formData.documents.length + files.length > MAX_FILES) {
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
      setFormData((prev) => ({
        ...prev,
        documents: [...prev.documents, ...validFiles],
      }));
    }

    // Reset the input
    event.target.value = '';
  };

  // Remove file
  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
    setFileErrors([]);
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<ChallengeFormData> = {};

    if (!formData.response.trim()) {
      newErrors.response = 'Response is required';
    } else if (formData.response.trim().length < 50) {
      newErrors.response = 'Response must be at least 50 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a challenge category';
    }

    if (!formData.evidenceDescription.trim()) {
      newErrors.evidenceDescription =
        'Evidence description is required';
    } else if (formData.evidenceDescription.trim().length < 20) {
      newErrors.evidenceDescription =
        'Evidence description must be at least 20 characters';
    }

    if (!formData.requestedAction) {
      newErrors.requestedAction = 'Please select a requested action';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const challengeData: SellerChallengeData = {
        response: formData.response.trim(),
        category: formData.category as any,
        evidence: {
          description: formData.evidenceDescription.trim(),
          documents: formData.documents,
        },
        requestedAction: formData.requestedAction as any,
        additionalNotes: formData.additionalNotes.trim() || undefined,
      };

      const result = await createSellerChallenge(
        disputeId,
        challengeData,
        accessToken!
      );

      if (result.success) {
        setShowSuccessModal(true);
        // Reset form
        setFormData({
          response: '',
          category: '',
          evidenceDescription: '',
          requestedAction: '',
          additionalNotes: '',
          documents: [],
        });
        setErrors({});
        setFileErrors([]);
      } else {
        setSubmitError(
          result.message || 'Failed to submit challenge'
        );
      }
    } catch (error) {
      console.error('Error submitting challenge:', error);
      setSubmitError(
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle success modal close
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onChallengeSubmitted();
    onClose();
  };

  // Utility functions
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

  const getCategoryIcon = (category: string) => {
    const found = challengeCategories.find(
      (cat) => cat.key === category
    );
    return found ? found.icon : <MessageSquare className="w-5 h-5" />;
  };

  return (
    <>
      <Card className="w-full max-w-6xl mx-auto shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold">
                  Challenge Dispute
                </h2>
                <p className="text-sm text-gray-600">
                  Provide evidence to challenge this dispute
                </p>
              </div>
            </div>
            <Button
              isIconOnly
              variant="light"
              onPress={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardBody className="p-6 space-y-2">
          {/* Challenge Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg mb-2">
            <div
              className="flex items-center justify-between p-2 cursor-pointer hover:bg-blue-100 transition-colors rounded-lg"
              onClick={() => setShowGuidelines(!showGuidelines)}
            >
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">
                  Challenge Guidelines
                </h3>
              </div>
              {showGuidelines ? (
                <ChevronUp className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              )}
            </div>
            {showGuidelines && (
              <div className="px-6 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Provide clear, factual evidence to support
                        your position
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Upload relevant documents, photos, or proof of
                        delivery
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Be professional and respectful in your
                        response
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Our team will review your challenge within
                        24-48 hours
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        You&apos;ll receive an email notification with
                        the decision
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Additional evidence can be submitted if needed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Challenge Form */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                Submit Your Challenge
              </h3>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Challenge Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Challenge Category *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {challengeCategories.map((category) => (
                    <div
                      key={category.key}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.category === category.key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          category: category.key,
                        }));
                        if (errors.category) {
                          setErrors((prev) => ({
                            ...prev,
                            category: undefined,
                          }));
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            formData.category === category.key
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {category.label}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Response */}
              <div>
                <Textarea
                  label="Your Response *"
                  placeholder="Provide a detailed response explaining why you're challenging this dispute. Be specific and factual..."
                  value={formData.response}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      response: value,
                    }));
                    if (errors.response) {
                      setErrors((prev) => ({
                        ...prev,
                        response: undefined,
                      }));
                    }
                  }}
                  minRows={4}
                  maxRows={8}
                  isInvalid={!!errors.response}
                  errorMessage={errors.response}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.response.length}/1000 characters (minimum
                  50 required)
                </div>
              </div>

              {/* Evidence Description */}
              <div>
                <Textarea
                  label="Evidence Description *"
                  placeholder="Describe the evidence you're providing to support your challenge..."
                  value={formData.evidenceDescription}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      evidenceDescription: value,
                    }));
                    if (errors.evidenceDescription) {
                      setErrors((prev) => ({
                        ...prev,
                        evidenceDescription: undefined,
                      }));
                    }
                  }}
                  minRows={3}
                  maxRows={6}
                  isInvalid={!!errors.evidenceDescription}
                  errorMessage={errors.evidenceDescription}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.evidenceDescription.length}/500 characters
                  (minimum 20 required)
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Evidence (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-2">
                      Upload photos, documents, receipts, or other
                      supporting evidence
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
                      id="evidence-upload"
                      disabled={
                        formData.documents.length >= MAX_FILES
                      }
                    />
                    <Button
                      as="label"
                      htmlFor="evidence-upload"
                      variant="flat"
                      color="primary"
                      size="sm"
                      isDisabled={
                        formData.documents.length >= MAX_FILES
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
                {formData.documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Uploaded Files ({formData.documents.length}/
                      {MAX_FILES})
                    </div>
                    {formData.documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
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

              {/* Requested Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Requested Action *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {requestedActions.map((action) => (
                    <div
                      key={action.key}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.requestedAction === action.key
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          requestedAction: action.key,
                        }));
                        if (errors.requestedAction) {
                          setErrors((prev) => ({
                            ...prev,
                            requestedAction: undefined,
                          }));
                        }
                      }}
                    >
                      <h4 className="font-medium text-gray-900">
                        {action.label}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {action.description}
                      </p>
                    </div>
                  ))}
                </div>
                {errors.requestedAction && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.requestedAction}
                  </p>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <Textarea
                  label="Additional Notes (Optional)"
                  placeholder="Any additional information you'd like to provide..."
                  value={formData.additionalNotes}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      additionalNotes: value,
                    }));
                  }}
                  minRows={2}
                  maxRows={4}
                  className="w-full"
                />
              </div>

              {/* Error Display */}
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 font-medium">
                      Error
                    </span>
                  </div>
                  <p className="text-red-600 mt-1">{submitError}</p>
                </div>
              )}

              <Divider />

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="light"
                  onPress={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  isDisabled={
                    !formData.category ||
                    !formData.response.trim() ||
                    !formData.evidenceDescription.trim() ||
                    !formData.requestedAction
                  }
                  className="px-8"
                >
                  Submit Challenge
                </Button>
              </div>
            </CardBody>
          </Card>
        </CardBody>
      </Card>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        backdrop="blur"
        isDismissable={false}
      >
        <ModalContent>
          <ModalHeader className="text-green-600">
            Challenge Submitted Successfully
          </ModalHeader>
          <ModalBody>
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">
                Your challenge has been submitted successfully! Our
                team will review it within 24-48 hours.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h4 className="font-semibold text-blue-900 mb-2">
                  What happens next?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Our dispute resolution team will review your
                    evidence
                  </li>
                  <li>
                    • You&apos;ll receive an email notification with
                    the decision
                  </li>
                  <li>
                    • The dispute status will be updated accordingly
                  </li>
                  <li>
                    • You can track progress in your seller dashboard
                  </li>
                </ul>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="success"
              onPress={handleSuccessModalClose}
              className="w-full"
            >
              Got it, thanks!
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
