// app/api/create-session/route.ts
import { NextRequest } from "next/server";
import { proxySubscriptionPost } from "../subscriptionProxy";

export async function POST(req: NextRequest) {
  return proxySubscriptionPost(req, "create-checkout-session", "create-session");
}
