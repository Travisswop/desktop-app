"use client";
import Link from "next/link";
import React from "react";
import DynamicPrimaryBtn from "../ui/Button/DynamicPrimaryBtn";
import AnimateButton from "../ui/Button/AnimateButton";
import { useSearchParams } from "next/navigation";

const TabSwitcher = () => {
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");
  return (
    <div className="flex items-center gap-2">
      <Link href={`${process.env.NEXT_PUBLIC_APP_URL}?tab=feed`}>
        {tab === "feed" || !tab ? (
          <DynamicPrimaryBtn
            enableGradient={false}
            className="!rounded w-28 hover:!bg-black"
          >
            Feed
          </DynamicPrimaryBtn>
        ) : (
          <AnimateButton width="w-28" className="!rounded">
            Feed
          </AnimateButton>
        )}
      </Link>
      <Link href={`${process.env.NEXT_PUBLIC_APP_URL}?tab=timeline`}>
        {tab === "timeline" ? (
          <DynamicPrimaryBtn enableGradient={false} className="!rounded w-28">
            Timeline
          </DynamicPrimaryBtn>
        ) : (
          <AnimateButton width="w-28" className="!rounded">
            Timeline
          </AnimateButton>
        )}
      </Link>
      <Link href={`${process.env.NEXT_PUBLIC_APP_URL}?tab=transaction`}>
        {tab === "transaction" ? (
          <DynamicPrimaryBtn enableGradient={false} className="!rounded w-32">
            Transaction
          </DynamicPrimaryBtn>
        ) : (
          <AnimateButton width="w-32" className="!rounded">
            Transaction
          </AnimateButton>
        )}
      </Link>
    </div>
  );
};

export default TabSwitcher;
