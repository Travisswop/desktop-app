import { Suspense } from "react";
import SuccessClient from "./successClient";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessClient />
    </Suspense>
  );
}
