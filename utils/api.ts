import { postData } from "@/actions/fetchWallet";

// "use server";
export class APIUtils {
  static async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries = 1
  ): Promise<T> {
    try {
      const response = await postData(url, options);
      console.log("response jj", response);

      if (!response) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }
}
