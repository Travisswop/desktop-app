// app/api/set-free-plan/route.ts
import { NextRequest } from "next/server";
import { proxySubscriptionPost } from "../subscriptionProxy";

export async function POST(req: NextRequest) {
  return proxySubscriptionPost(req, "set-free-plan", "set-free-plan");
}
