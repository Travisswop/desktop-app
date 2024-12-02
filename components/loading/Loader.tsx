"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import gifLoading from "@/public/images/smart-site-loading.gif";

const Loader = () => {
  const [value, setValue] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((v) => (v >= 100 ? 0 : v + 10));
    }, 500);

    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);

    return () => {
      clearInterval(interval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="h-screen">
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: "calc(100vh - 48px)" }}
      >
        <Image
          src={gifLoading}
          alt={"Loading"}
          width={500}
          height={500}
          className="w-[200px] h-[200px]"
        />

        <h2 className="text-xl font-medium text-gray-700 animate-pulse">
          Loading{dots}
        </h2>
      </div>
    </div>
  );
};

export default Loader;
