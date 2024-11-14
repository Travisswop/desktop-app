"use server";

import { signIn, signOut } from "@/auth";
// import { delay } from "@/util/WaitAMoment";
// import { cookies } from "next/headers";
// import { redirect } from "next/navigation";
// import { revalidatePath } from "next/cache";

export async function doSignOut() {
  await signOut({ redirectTo: `/signin` });
}

export async function doSignInWithGoogle() {
  await signIn("google", { redirectTo: `/` });
}

export async function signInWithCredentials(formData: FormData) {
  try {
    // await delay(20000);
    const response = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    // revalidatePath("/select-smartsite");
    return response;
  } catch (err) {
    throw err;
  }
}
export async function checkIsUserExist(email: string) {
  try {
    // console.log("email", email);

    const emailData = {
      email: email,
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/checkUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      }
    );
    // console.log("response", response);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
  }
}

export async function getPeerData(peerAddresses: any, token: any) {
  // console.log("🚀 ~ getPeerData ~ peerAddresses", peerAddresses);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/microsite/getPeerData`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ peerAddresses }),
      }
    );

    const data = await response.json();
    // console.log("🚀 ~ getPeerData ~ data:", data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    return error;
  }
}
