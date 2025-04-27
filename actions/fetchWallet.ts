// "use server";
export async function postData(url: string, options: any) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from action:", error);
  }
}
