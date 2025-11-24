import React from "react";
import { cookies } from "next/headers";
import EditProfileContent from "./_components/EditProfileContent";

const EditProfilePage = async () => {
  const cookieStore = cookies();

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;

  const userId = (await cookieStore).get("user-id")?.value;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const data = await response.json();

  return <EditProfileContent data={data} token={accessToken} />;
};

export default EditProfilePage;
