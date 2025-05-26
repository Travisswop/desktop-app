import { deleteFeed } from "@/actions/postFeed";
import { useToast } from "@/hooks/use-toast";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Spinner,
} from "@nextui-org/react";
import { useState } from "react";
import { MdDeleteForever } from "react-icons/md";

export default function DeleteFeedModal({ postId, token, setIsPosting }: any) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  const handlePostDelete = async () => {
    setDeleteLoading(true);
    const deletePost = await deleteFeed(postId, token);
    if (deletePost.state === "success") {
      setDeleteLoading(false);
      toast({
        title: "Success",
        description: "post deleted successfully!",
      });
      setIsPosting(true);
    }
    onClose();
  };

  return (
    <>
      {/* <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="text-red-600 flex items-center gap-0.5 font-medium border rounded py-1 px-2 text-sm"
      >
        <MdDeleteForever color="red" size={18} /> Delete
      </button> */}
      <button
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Post
      </button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-2 pt-6">
                Delete Post?
              </ModalHeader>
              <ModalBody className="text-slate-600 font-normal">
                <p>This can’t be undone and it will be removed permanently.</p>
              </ModalBody>
              <ModalFooter className="pt-2">
                <Button
                  onClick={(e) => e.stopPropagation()}
                  color="default"
                  variant="light"
                  onPress={onClose}
                  className="font-medium text-slate-600"
                >
                  Cancel
                </Button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePostDelete();
                  }}
                  className="bg-gray-800 hover:bg-black transition-colors ease-in rounded-lg text-white flex items-center px-4 justify-center gap-1 font-medium border-b p-1 text-sm w-20"
                >
                  {deleteLoading ? (
                    <Spinner color="default" size="sm" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
