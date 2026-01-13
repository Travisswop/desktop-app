import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

export async function POST(request: NextRequest) {
  const privyToken = request.cookies.get("privy-token")?.value;
  const accessToken = request.headers.get("authorization")?.split(" ")[1];

  if (!privyToken || !accessToken) {
    return NextResponse.json(
      { error: "Missing authentication tokens" },
      { status: 401 }
    );
  }

  try {
    const privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
      process.env.PRIVY_APP_SECRET || ""
    );

    // Verify Privy token
    const { userId } = await privy.verifyAuthToken(privyToken);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid Privy token" },
        { status: 401 }
      );
    }

    // Request new token from your backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/user/refresh-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: 401 }
      );
    }

    const data = await response.json();

    // Set the new token in cookies
    const result = NextResponse.json({ success: true });
    // const result = NextResponse.json({ success: true, token: data.token });
    result.cookies.set("access-token", data.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 86400, // 24 hours
    });

    return result;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        error: "Token refresh failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 401 }
    );
  }
}
