"use client";
import { deleteQrCode } from "@/actions/customQrCode";
import { Spinner } from "@nextui-org/react";
import React, { useState } from "react";
import { MdDeleteForever } from "react-icons/md";
import Swal from "sweetalert2";

const DeleteQRCode = ({ id, token }: { id: string; token: string }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert your qr code!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await deleteQrCode(id, token);
        await Swal.fire({
          title: "Deleted!",
          text: "Your qr code has been deleted.",
          icon: "success",
        });
      } catch (error) {
        // Handle error if the delete operation fails
        await Swal.fire({
          title: "Error",
          text: "There was an issue deleting your qr code. Please try again.",
          icon: "error",
        });
        setLoading(false);
      } finally {
        setLoading(false);
      }
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      await Swal.fire({
        title: "Cancelled",
        text: "Your qr code is safe :)",
        icon: "error",
      });
    }
  };
  return (
    <button
      onClick={() => handleDelete(id)}
      type="button"
      className="bg-gray-200 w-9 h-9 rounded-lg hover:bg-gray-300 flex items-center justify-center"
    >
      {loading ? <Spinner size="sm" /> : <MdDeleteForever size={18} />}
    </button>
  );
};

export default DeleteQRCode;
