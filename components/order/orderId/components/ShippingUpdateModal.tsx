import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from '@nextui-org/react';
import { CheckCircle } from 'lucide-react';
import { ShippingUpdateData } from '../types/order.types';
import { deliveryStatusOptions } from '../constants/order.constants';

interface ShippingUpdateModalProps {
  isOpen: boolean;
  isUpdating: boolean;
  updateError: string | null;
  updateSuccess: string | null;
  shippingData: ShippingUpdateData;
  onClose: () => void;
  onUpdate: () => void;
  onShippingDataChange: (data: ShippingUpdateData) => void;
}

export const ShippingUpdateModal: React.FC<
  ShippingUpdateModalProps
> = ({
  isOpen,
  isUpdating,
  updateError,
  updateSuccess,
  shippingData,
  onClose,
  onUpdate,
  onShippingDataChange,
}) => {
  const handleInputChange = (
    field: keyof ShippingUpdateData,
    value: string
  ) => {
    onShippingDataChange({
      ...shippingData,
      [field]: value,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>
          <h3 className="text-xl font-semibold">
            Update Shipping Status
          </h3>
        </ModalHeader>
        <ModalBody>
          {updateSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-600 text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                {updateSuccess}
              </p>
            </div>
          )}

          {updateError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-500 text-sm">{updateError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Delivery Status"
                placeholder="Select status"
                selectedKeys={[shippingData.deliveryStatus]}
                onChange={(e) =>
                  handleInputChange(
                    'deliveryStatus',
                    e.target.value as any
                  )
                }
                className="w-full"
              >
                {deliveryStatusOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div>
              <Input
                label="Tracking Number"
                placeholder="Enter tracking number"
                value={shippingData.trackingNumber}
                onChange={(e) =>
                  handleInputChange('trackingNumber', e.target.value)
                }
                className="w-full"
              />
            </div>

            <div>
              <Input
                label="Shipping Provider"
                placeholder="Enter shipping provider"
                value={shippingData.shippingProvider}
                onChange={(e) =>
                  handleInputChange(
                    'shippingProvider',
                    e.target.value
                  )
                }
                className="w-full"
              />
            </div>

            <div>
              <Input
                type="date"
                label="Estimated Delivery Date"
                value={shippingData.estimatedDeliveryDate}
                onChange={(e) =>
                  handleInputChange(
                    'estimatedDeliveryDate',
                    e.target.value
                  )
                }
                className="w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                placeholder="Enter any additional notes here..."
                value={shippingData.additionalNotes}
                onChange={(e) =>
                  handleInputChange('additionalNotes', e.target.value)
                }
                className="border-2 border-gray-300 rounded-lg p-2 w-full h-24 resize-none"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            variant="light"
            onPress={onClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={onUpdate}
            isLoading={isUpdating}
          >
            Update Shipping
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
