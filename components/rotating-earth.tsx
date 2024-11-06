'use client';

import Image from 'next/image';
export default function RotateEarth() {
  return (
    <div className="relative w-full h-[500px] flex flex-col items-center justify-center overflow-hidden ">
      <div className="relative w-64 h-64">
        {/* Earth */}
        <div
          className="
            absolute
            inset-0
            rounded-full
            animate-spin-slow
            transition-opacity"
        >
          <div className="absolute">
            <Image
              src="/earth-3d.png"
              alt="Profile"
              width={500}
              height={500}
              className=""
            />
          </div>
        </div>

        {/* Astronaut */}
        <div
          className={`
            absolute
            -top-12
            left-1/2
            -translate-x-1/2
            w-24
            h-32

          `}
        >
          <div className="relative w-full h-full">
            {/* Helmet */}
            <Image
              src="/astro.png"
              alt="Profile"
              width={96}
              height={128}
              className=""
            />
          </div>
        </div>
      </div>
      <h1 className=" text-3xl font-semibold">Loading...</h1>
    </div>
  );
}
