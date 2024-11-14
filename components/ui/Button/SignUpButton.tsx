import { Spinner } from "@nextui-org/react";
import React from "react";
import { FaArrowRightLong } from "react-icons/fa6";

const SignUpButton = ({ loading }: { loading: boolean }) => {
  return (
    <button
      aria-disabled={loading}
      disabled={loading}
      className="bg-black text-white w-full py-2 rounded-xl flex items-center gap-2 justify-center px-4 font-semibold"
      type="submit"
    >
      Sign Up{" "}
      {loading ? <Spinner color="white" size="sm" /> : <FaArrowRightLong />}
    </button>
  );
};

export default SignUpButton;
