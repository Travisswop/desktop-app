// import React, { memo, useCallback } from 'react';
// import {
//   Modal,
//   ModalContent,
//   ModalHeader,
//   ModalBody,
//   ModalFooter,
//   Button,
//   Input,
//   Select,
//   SelectItem,
// } from '@nextui-org/react';
// import { CheckCircle } from 'lucide-react';
// import { ShippingUpdateData } from '../types/order.types';
// import { deliveryStatusOptions } from '../constants/order.constants';

// interface ShippingUpdateModalProps {
//   isOpen: boolean;
//   isUpdating: boolean;
//   updateError: string | null;
//   updateSuccess: string | null;
//   shippingData: ShippingUpdateData;
//   onClose: () => void;
//   onUpdate: () => void;
//   onShippingDataChange: (data: ShippingUpdateData) => void;
// }

// const ShippingUpdateModalComponent: React.FC<ShippingUpdateModalProps> =
//   memo(
//     ({
//       isOpen,
//       isUpdating,
//       updateError,
//       updateSuccess,
//       shippingData,
//       onClose,
//       onUpdate,
//       onShippingDataChange,
//     }) => {
//       // Memoize input change handler to prevent re-renders
//       const handleInputChange = useCallback(
//         (field: keyof ShippingUpdateData, value: string) => {
//           onShippingDataChange({
//             ...shippingData,
//             [field]: value,
//           });
//         },
//         [shippingData, onShippingDataChange]
//       );

//       // Memoize individual field handlers
//       const handleDeliveryStatusChange = useCallback(
//         (e: React.ChangeEvent<HTMLSelectElement>) => {
//           handleInputChange('deliveryStatus', e.target.value as any);
//         },
//         [handleInputChange]
//       );

//       const handleTrackingNumberChange = useCallback(
//         (e: React.ChangeEvent<HTMLInputElement>) => {
//           handleInputChange('trackingNumber', e.target.value);
//         },
//         [handleInputChange]
//       );

//       const handleShippingProviderChange = useCallback(
//         (e: React.ChangeEvent<HTMLInputElement>) => {
//           handleInputChange('shippingProvider', e.target.value);
//         },
//         [handleInputChange]
//       );

//       const handleEstimatedDeliveryDateChange = useCallback(
//         (e: React.ChangeEvent<HTMLInputElement>) => {
//           handleInputChange('estimatedDeliveryDate', e.target.value);
//         },
//         [handleInputChange]
//       );

//       const handleAdditionalNotesChange = useCallback(
//         (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//           handleInputChange('additionalNotes', e.target.value);
//         },
//         [handleInputChange]
//       );

//       return (
//         <Modal isOpen={isOpen} onClose={onClose} size="2xl">
//           <ModalContent>
//             <ModalHeader>
//               <h3 className="text-xl font-semibold">
//                 Update Shipping Status
//               </h3>
//             </ModalHeader>
//             <ModalBody>
//               {updateSuccess && (
//                 <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
//                   <p className="text-green-600 text-sm flex items-center">
//                     <CheckCircle className="h-4 w-4 mr-2" />
//                     {updateSuccess}
//                   </p>
//                 </div>
//               )}

//               {updateError && (
//                 <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
//                   <p className="text-red-500 text-sm">
//                     {updateError}
//                   </p>
//                 </div>
//               )}

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Select
//                     label="Delivery Status"
//                     placeholder="Select status"
//                     selectedKeys={[shippingData.deliveryStatus]}
//                     onChange={handleDeliveryStatusChange}
//                     className="w-full"
//                   >
//                     {deliveryStatusOptions.map((option) => (
//                       <SelectItem key={option.key} value={option.key}>
//                         {option.label}
//                       </SelectItem>
//                     ))}
//                   </Select>
//                 </div>

//                 <div>
//                   <Input
//                     label="Tracking Number"
//                     placeholder="Enter tracking number"
//                     value={shippingData.trackingNumber}
//                     onChange={handleTrackingNumberChange}
//                     className="w-full"
//                   />
//                 </div>

//                 <div>
//                   <Input
//                     label="Shipping Provider"
//                     placeholder="Enter shipping provider"
//                     value={shippingData.shippingProvider}
//                     onChange={handleShippingProviderChange}
//                     className="w-full"
//                   />
//                 </div>

//                 <div>
//                   <Input
//                     type="date"
//                     label="Estimated Delivery Date"
//                     value={shippingData.estimatedDeliveryDate}
//                     onChange={handleEstimatedDeliveryDateChange}
//                     className="w-full"
//                   />
//                 </div>

//                 <div className="md:col-span-2">
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Additional Notes
//                   </label>
//                   <textarea
//                     placeholder="Enter any additional notes here..."
//                     value={shippingData.additionalNotes}
//                     onChange={handleAdditionalNotesChange}
//                     className="border-2 border-gray-300 rounded-lg p-2 w-full h-24 resize-none"
//                   />
//                 </div>
//               </div>
//             </ModalBody>
//             <ModalFooter>
//               <Button
//                 color="danger"
//                 variant="light"
//                 onPress={onClose}
//                 disabled={isUpdating}
//               >
//                 Cancel
//               </Button>
//               <Button
//                 color="primary"
//                 onPress={onUpdate}
//                 isLoading={isUpdating}
//               >
//                 Update Shipping
//               </Button>
//             </ModalFooter>
//           </ModalContent>
//         </Modal>
//       );
//     }
//   );

// ShippingUpdateModalComponent.displayName = 'ShippingUpdateModal';

// export const ShippingUpdateModal = ShippingUpdateModalComponent;

import React, { memo, useCallback } from "react";
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
} from "@nextui-org/react";
import { CheckCircle } from "lucide-react";
import { ShippingUpdateData } from "../types/order.types";

// Shipping provider options
const shippingProviderOptions = [
  { key: "usps", label: "USPS" },
  { key: "fedex", label: "FedEx" },
  { key: "dhl", label: "DHL" },
  { key: "ups", label: "UPS" },
];

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

const ShippingUpdateModalComponent: React.FC<ShippingUpdateModalProps> = memo(
  ({
    isOpen,
    isUpdating,
    updateError,
    updateSuccess,
    shippingData,
    onClose,
    onUpdate,
    onShippingDataChange,
  }) => {
    // Memoize input change handler to prevent re-renders
    const handleInputChange = useCallback(
      (field: keyof ShippingUpdateData, value: string) => {
        onShippingDataChange({
          ...shippingData,
          [field]: value,
        });
      },
      [shippingData, onShippingDataChange]
    );

    // Memoize individual field handlers
    const handleShippingProviderChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleInputChange("shippingProvider", e.target.value);
      },
      [handleInputChange]
    );

    const handleEstimatedDeliveryDateChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange("estimatedDeliveryDate", e.target.value);
      },
      [handleInputChange]
    );

    const handleTrackingNumberChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange("trackingNumber", e.target.value);
      },
      [handleInputChange]
    );

    const handleAdditionalNotesChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleInputChange("additionalNotes", e.target.value);
      },
      [handleInputChange]
    );

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader className="flex justify-between items-center border-b pb-3">
            <h3 className="text-lg font-semibold">Update Shipping Status</h3>
          </ModalHeader>
          <ModalBody className="py-6">
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

            <div className="flex flex-col gap-4">
              {/* Shipping Provider Dropdown */}
              <div>
                <Select
                  label="Select Shipping Provider"
                  placeholder="Select Shipping Provider"
                  selectedKeys={
                    shippingData.shippingProvider
                      ? [shippingData.shippingProvider]
                      : []
                  }
                  onChange={handleShippingProviderChange}
                  className="w-full"
                  variant="bordered"
                  classNames={{
                    trigger: "bg-gray-50 border-gray-200",
                    label: "text-gray-600",
                  }}
                >
                  {shippingProviderOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Estimated Delivery Date */}
              <div>
                <Input
                  type="date"
                  label="Estimated Delivery Date"
                  placeholder="Estimated Delivery Date"
                  value={shippingData.estimatedDeliveryDate}
                  onChange={handleEstimatedDeliveryDateChange}
                  className="w-full"
                  variant="bordered"
                  classNames={{
                    input: "bg-gray-50",
                    inputWrapper: "bg-gray-50 border-gray-200",
                    label: "text-gray-600",
                  }}
                />
              </div>

              {/* Tracking Number */}
              <div>
                <Input
                  // label="Enter tracking number"
                  placeholder="Enter tracking number"
                  value={shippingData.trackingNumber}
                  onChange={handleTrackingNumberChange}
                  className="w-full"
                  variant="bordered"
                  classNames={{
                    input: "bg-gray-50",
                    inputWrapper: "bg-gray-50 border-gray-200",
                    label: "text-gray-400",
                  }}
                />
              </div>

              {/* Additional Notes */}
              <div>
                {/* <label className="block text-sm text-gray-400 mb-2">
                  Enter any additional notes here...
                </label> */}
                <textarea
                  placeholder="Enter any additional notes here..."
                  value={shippingData.additionalNotes}
                  onChange={handleAdditionalNotesChange}
                  className="w-full h-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="pt-0">
            <Button
              color="primary"
              onPress={onUpdate}
              isLoading={isUpdating}
              className="w-full bg-gray-100 text-black hover:bg-gray-200"
              size="lg"
            >
              Update Shipping
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }
);

ShippingUpdateModalComponent.displayName = "ShippingUpdateModal";

export const ShippingUpdateModal = ShippingUpdateModalComponent;
