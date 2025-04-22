import React from "react";
import { cookies } from "next/headers";
import UserAccountTabSwitcher from "./tabSwitcher";

const UpdateProfilePage = async () => {
  const cookieStore = cookies();

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;

  console.log("access tokenff ", accessToken);

  const userId = (await cookieStore).get("user-id")?.value;

  console.log("userId", userId);

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

  // console.log("data from update profile", data);

  return <UserAccountTabSwitcher data={data} token={accessToken} />;
};

export default UpdateProfilePage;
