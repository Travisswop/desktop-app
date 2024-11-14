import { Spinner } from "@nextui-org/react";
import React from "react";
import { useFormStatus } from "react-dom";
import { FaArrowRightLong } from "react-icons/fa6";

const SignInButton = ({ loading }: { loading: boolean }) => {
  // const { pending } = useFormStatus();

  // console.log("pending", pending);
  return (
    <button
      aria-disabled={loading}
      className="bg-black text-white w-full py-2 rounded-xl flex items-center gap-2 justify-center px-4 font-semibold"
      type="submit"
    >
      Log In{" "}
      {loading ? <Spinner color="white" size="sm" /> : <FaArrowRightLong />}
    </button>
  );
};

export default SignInButton;
