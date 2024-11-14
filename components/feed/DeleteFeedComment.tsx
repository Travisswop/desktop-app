import { deleteFeedComment } from "@/actions/postFeed";
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

export default function DeleteFeedComment({
  commentId,
  accessToken,
  setIsCommentDelete,
  latestCommentCount,
  setLatestCommentCount,
}: any) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  const handlePostDelete = async () => {
    setDeleteLoading(true);
    const deletePost = await deleteFeedComment(commentId, accessToken);
    if (deletePost.state === "success") {
      setLatestCommentCount(latestCommentCount - 1);
      setDeleteLoading(false);
      setIsCommentDelete(true);
      toast({
        title: "Success",
        description: "Comment Deleted!",
      });
    }
    onClose();
  };

  return (
    <>
      <button
        onClick={onOpen}
        className="text-red-600 flex items-center gap-1 font-medium border rounded py-1 px-2 text-sm"
      >
        <MdDeleteForever color="red" size={19} /> Delete
      </button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-2 pt-6">
                Delete Reply?
              </ModalHeader>
              <ModalBody className="text-slate-600 font-normal">
                <p>This can’t be undone and it will be removed permanently.</p>
              </ModalBody>
              <ModalFooter className="pt-2">
                <Button
                  color="default"
                  variant="light"
                  onPress={onClose}
                  className="font-medium text-slate-600"
                >
                  Cancel
                </Button>
                <button
                  onClick={handlePostDelete}
                  className="bg-red-500 hover:bg-red-600 transition-colors ease-in rounded-lg text-white flex items-center px-4 justify-center gap-1 font-medium border-b p-1 text-sm w-20"
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
