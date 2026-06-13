export async function getDefaultConnection(token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/connections/app?page=1&limit=20&search=spotlight`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        next: {
          tags: ['deleteDefaultConnection', 'addDefaultConnection'],
        },
      }
    );

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(
        errorResponse.message ||
          `API Error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  } catch (error: any) {
    console.error('Error fetching connections:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch connections.',
      data: [],
    };
  }
}
