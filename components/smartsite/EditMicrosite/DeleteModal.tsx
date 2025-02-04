import AnimateButton from "@/components/ui/Button/AnimateButton";
import { handleDeleteSmartSite } from "@/actions/deleteSmartsite";
import { FaTrash } from "react-icons/fa";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@nextui-org/react";
import React, { useEffect, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { MdDeleteOutline } from "react-icons/md";
import Cookies from "js-cookie";
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

    // console.log("data delte", data);

    refetch();

    if (deleteSmartsite?.state === "success") {
      setDeleteLoading(false);
      setDeleteSuccess(true);
      setTimeout(() => {}, 2000);
      router.push("/smartsite");
      // router.refresh();
    } else if (deleteSmartsite?.state === "fail") {
      setDeleteLoading(false);
      setDeleteFailed(true);
    }
  };
  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent className="p-5">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 m-auto">
                Do you want to delete your website?
              </ModalHeader>
              <ModalBody>
                <FaTrash className="size-28 m-auto my-5" />{" "}
              </ModalBody>
              <ModalFooter className="flex flex-col justify-center items-center">
                {deleteLoading ? (
                  <Spinner size="md" color="default" className="py-0.5" />
                ) : deleteSuccess ? (
                  <p className="py-3 text-green-400 text-center text-lg">
                    Smartsite successfully deleted.
                  </p>
                ) : deleteFailed ? (
                  <p className="py-3 text-red-500 text-center text-lg">
                    There was an issue deleting your smartsite. Please try
                    again.
                  </p>
                ) : (
                  <>
                    <DynamicPrimaryBtn
                      className="py-3 text-base !gap-1 w-full"
                      onClick={onClose}
                    >
                      Cancel
                    </DynamicPrimaryBtn>
                    <AnimateButton
                      type="button"
                      onClick={() => {
                        handleDelete();
                      }}
                      className="py-2 hover:py-2.5 text-base !gap-1 bg-white text-black w-full"
                      // disabled={isFormSubmitLoading}
                    >
                      <MdDeleteOutline size={20} />
                      Delete
                    </AnimateButton>
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
