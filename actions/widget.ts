"use server";

import { revalidatePath } from "next/cache";

export type SmartsiteWidgetType =
  | "tipJar"
  | "predictionMarket"
  | "vaultCard"
  | "leadForm";

const revalidateMicrosite = (micrositeId: string) => {
  revalidatePath(`/smartsite/icons/${micrositeId}`);
  revalidatePath(`/smartsite/profile/${micrositeId}`);
  revalidatePath(`/smartsites/icons/${micrositeId}`);
};

export async function handleCreateWidget(
  info: {
    micrositeId: string;
    widgetType: SmartsiteWidgetType;
    config: Record<string, any>;
  },
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    revalidateMicrosite(info.micrositeId);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleUpdateWidget(
  info: {
    _id: string;
    micrositeId: string;
    config: Record<string, any>;
  },
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    revalidateMicrosite(info.micrositeId);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}

export async function handleDeleteWidget(
  info: {
    _id: string;
    micrositeId: string;
  },
  token: string
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(info),
      }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    revalidateMicrosite(info.micrositeId);
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
