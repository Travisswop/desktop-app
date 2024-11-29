import CreateSmartSite from "@/components/smartsite/CreateNewSmartsite";
import React from "react";

const CreateSmartSitePage = async () => {
  const demoShowToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";
  return (
    <div>
      <CreateSmartSite token={demoShowToken} />
    </div>
  );
};

export default CreateSmartSitePage;
