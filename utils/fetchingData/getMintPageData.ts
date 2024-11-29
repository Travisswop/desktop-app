"use server";

export interface GroupedTemplates {
  collection: {
    id: string;
    metadata: {
      name: string;
    };
  };
  templates: {
    templateId: string;
    metadata: {
      image: string;
      name: string;
    };
    supply: {
      limit: number;
      minted: number;
    };
  }[];
}

export async function getMintPageData(token: string): Promise<{ data: GroupedTemplates[] } | { noCollections: boolean } | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getAllTemplatesAndCollections`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) {
      return { noCollections: true }; // Handle 404 case specifically
    }

    if (!res.ok) {
      console.error("API error:", res.statusText); // Log the error
      return null;
    }

    const data = await res.json();

    if (!data || data.state !== "success") {
      console.error("Invalid data format:", data); // Log the data if it's in an unexpected format
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching mint page data:", error); // Log any other errors
    return null;
  }
}

export default getMintPageData;
