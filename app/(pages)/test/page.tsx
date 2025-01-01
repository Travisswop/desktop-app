import React from "react";
import mobileMockup from "@/public/images/mobile-mockup.png";
import Image from "next/image";

const App = () => {
  return (
    <div className="flex justify-center  w-full h-screen pt-20 ">
      <div className="w-72 h-[30rem]">
        <Image
          src={mobileMockup}
          alt="mobile mockup  "
          quality={100}
          className=""
        />
      </div>
    </div>
  );
};

export default App;
