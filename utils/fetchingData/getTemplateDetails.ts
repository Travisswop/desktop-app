export async function getTemplateDetails(
  collectionId: string,
  templateId: string,
  token: string
) {
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/nft/getTemplateDetails?collectionId=${collectionId}&templateId=${templateId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch template details");
    }

    const data = await response.json();
    // console.log("this is data.data: "+data.data);
    return data.data;
  } catch (error) {
    console.error("Error fetching template details:", error);
    return null;
  }
}
