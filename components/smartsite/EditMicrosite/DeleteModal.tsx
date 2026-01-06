import { handleDeleteSmartSite } from "@/actions/deleteSmartsite";
import {
  Button,
  Modal,
  ModalContent,
  ModalFooter,
  Spinner,
} from "@nextui-org/react";
import React, { useState } from "react";
import { MdDeleteOutline } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import { useRouter } from "next/navigation";

const DeleteModal = ({
  isOpen,
  onOpenChange,
  parentId,
  _id,
  accessToken,
}: {
  isOpen: any;
  parentId: any;
  onOpenChange: any;
  _id: any;
  accessToken: any;
}) => {
  const router = useRouter();
  const { refetch } = useDesktopUserData(parentId, accessToken);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDelete = async () => {
    setDeleteLoading(true);
    const deleteSmartsite = await handleDeleteSmartSite(_id, accessToken);

    refetch();

    if (deleteSmartsite?.state === "success") {
      setDeleteLoading(false);
      setDeleteSuccess(true);
      setTimeout(() => {}, 2000);
      router.push("/smartsite");
    } else if (deleteSmartsite?.state === "fail") {
      setDeleteLoading(false);
      setDeleteFailed(true);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="sm"
        classNames={{
          base: "bg-white rounded-2xl",
          closeButton: "hidden",
        }}
      >
        <ModalContent className="p-6">
          {(onClose) => (
            <>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <IoClose size={24} />
              </button>

              {/* Warning Icon */}
              <div className="flex justify-center mt-4 mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center">
                  <span className="text-red-500 text-4xl font-bold">!</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
                Are you sure?
              </h2>

              {/* Subtitle */}
              <p className="text-sm text-gray-500 text-center mb-8">
                {` You won't be able to revert your smartsite!`}
              </p>

              {/* Action Buttons */}
              <ModalFooter className="flex flex-row justify-center items-center gap-3 p-0">
                {deleteLoading ? (
                  <Spinner size="md" color="default" className="py-0.5" />
                ) : deleteSuccess ? (
                  <p className="py-3 text-green-600 text-center">
                    Smartsite successfully deleted.
                  </p>
                ) : deleteFailed ? (
                  <p className="py-3 text-red-500 text-center">
                    There was an issue deleting your smartsite. Please try
                    again.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="px-8 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-8 py-2 rounded-lg border-2 border-red-500 bg-white text-red-500 font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <MdDeleteOutline size={18} />
                      Delete
                    </button>
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default DeleteModal;
