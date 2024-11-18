"use client";
import React, { useRef, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import Image from "next/image";

const ViewBlog = ({ iconDataObj, isOn, setOff }: any) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOn) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }

    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [isOn]);

  const closeModal = () => {
    setOff();
  };

  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
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
            className="modal-content max-h-full w-96 md:w-[46rem] bg-white relative rounded-xl overflow-visible"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="bg-white rounded-xl shadow-small p-7 flex flex-col gap-4">
              <Image
                src={iconDataObj.data.image}
                alt="blog image"
                width={900}
                height={400}
                className="w-full h-auto border border-[#F3E9FC] rounded-xl"
              />
              <div className="flex flex-col gap-2">
                {iconDataObj.data.title && (
                  <p className="text-xl font-bold text-center">
                    {iconDataObj.data.title}
                  </p>
                )}
                {iconDataObj.data.headline && (
                  <p className="font-medium text-center text-gray-500 text-sm">
                    {iconDataObj.data.headline}
                  </p>
                )}
              </div>
              {iconDataObj.data.description && (
                <p
                  dangerouslySetInnerHTML={{
                    __html: iconDataObj.data.description,
                  }}
                ></p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewBlog;
