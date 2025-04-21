import React, { useEffect, useRef, useState } from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
// import AnimateButton from "@/components/Button/AnimateButton";
import {
  deleteMessage,
  isENSAvailable,
  updateMessage,
} from "@/actions/message";
import { useToast } from "@/hooks/use-toast";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import Cookies from "js-cookie"

const UpdateENS = ({ iconDataObj, isOn, setOff }: any) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>({});
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [token, setToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      setToken(token || "")
    };
    getAccessToken();
  }, []);

  const { toast } = useToast();

  // Function to close the modal
  const closeModal = () => {
    setOff();
  };
  // Function to handle click on the backdrop
  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
    }
  };

  const handleFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submitInfo = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      domain: formData.get("ensName"),
    };

    let errors = {};

    if (!submitInfo.domain) {
      errors = { ...errors, domain: "ENS domain is required" };
    }

    if (Object.keys(errors).length > 0) {
      setError(errors);
      setIsLoading(false);
    } else {
      setError("");
      try {
        const isAvailable = await isENSAvailable(submitInfo.domain, token);
        // console.log("isAvailable", isAvailable);

        if (isAvailable?.message === "Name not found") {
          return toast({
            title: "Error",
            description: "ENS name not found!",
          });
        }

        const data = await updateMessage(submitInfo, token);
        if ((data.state = "success")) {
          setOff();
          toast({
            title: "Error",
            description: "Successfully updated",
          });
        } else {
          toast({
            title: "Error",
            description: "Something went wrong!",
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await deleteMessage(submitData, token);
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast({
          title: "Success",
          description: "Deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong!",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <>
      {isOn && (
        <div
          className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="modal-content h-max w-96 lg:w-[40rem] bg-white relative rounded-xl p-7"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="">
              <h1 className="text-lg font-semibold mb-2">Message</h1>
              <div>
                <form
                  onSubmit={handleFormSubmit}
                  className="flex flex-col gap-2.5"
                >
                  <div className="flex flex-col gap-[2px]">
                    <label
                      htmlFor="ensName"
                      className="font-semibold text-gray-700"
                    >
                      ENS Name
                      <span className="text-red-600 font-medium">*</span>
                    </label>
                    <input
                      type="text"
                      id="ensName"
                      name="ensName"
                      defaultValue={iconDataObj.data.domain}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                      placeholder="example.swop.id"
                      //   required
                    />
                    {error.ensName && (
                      <p className="text-sm text-red-600">{error.ensName}</p>
                    )}
                  </div>
                  <div className="flex justify-between mt-3">
                    <AnimateButton
                      whiteLoading={true}
                      className="bg-black text-white py-2 !border-0"
                      isLoading={isLoading}
                      width={"w-52"}
                    >
                      <LiaFileMedicalSolid size={20} />
                      Update Changes
                    </AnimateButton>
                    <AnimateButton
                      whiteLoading={true}
                      className="bg-black text-white py-2 !border-0"
                      type="button"
                      onClick={handleDelete}
                      isLoading={isDeleteLoading}
                      width={"w-28"}
                    >
                      <MdDelete size={20} /> Delete
                    </AnimateButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateENS;
