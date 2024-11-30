"use client";
// import ContentInfo from "@/components/content/Content";
// import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import { useUser } from "@/lib/UserContext";
// import { useFetchMediaData } from "@/lib/hooks/useFetchMediaData";
// import { useMemo } from "react";
import MainContent from "./mainContent";

const Content: React.FC = () => {
  const { user, loading, accessToken } = useUser();
  if (loading) {
    <p>Loading...</p>;
  }

  return (
    <div>
      {loading ? (
        "loading..."
      ) : (
        <MainContent id={user?._id} token={accessToken} />
      )}
    </div>
  );
};

export default Content;
