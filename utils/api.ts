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

      // postData returns null on network failure or non-OK status — don't
      // dereference it (the old message read response.status off null).
      if (!response) {
        throw new Error(
          `Request failed or returned non-OK status: ${url.split("?")[0]}`,
        );
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
