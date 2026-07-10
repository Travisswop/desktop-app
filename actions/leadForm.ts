"use server";

/**
 * Public lead-form submission for the smartsite Lead Form widget.
 * Posts to the same public (no-auth) endpoint the profile subscribe
 * modal uses (components/publicProfile/subscribe.tsx), tagged with a
 * `form:<widgetId>` source so leads are attributable to the widget.
 */
export async function handleLeadFormSubmit(info: {
  parentId: string;
  micrositeId: string;
  name: string;
  email?: string;
  mobileNo?: string;
  jobTitle?: string;
  website?: string;
  source?: string;
}) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/web/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(info),
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        state: "error",
        message: data?.message || "Something went wrong",
      };
    }
    return data;
  } catch (error) {
    console.error("Lead form submit failed:", error);
    return { state: "error", message: "Something went wrong" };
  }
}
