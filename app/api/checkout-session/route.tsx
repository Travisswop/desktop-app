// pages/api/checkout-session/[sessionId].js

export default async function handler(req, res) {
  const { sessionId } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    // Call your backend API to get session data
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/subscription/checkout-session/${sessionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    console.log("data in checkout route", data);

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching checkout session:", error);
    res.status(500).json({
      error: "Failed to fetch subscription data",
      details: error.message,
    });
  }
}
