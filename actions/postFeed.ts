"use server";
// export const maxDuration = 60;
import { revalidatePath } from "next/cache";
import logger from "../utils/logger";

export async function getUserFeed(url: string, token: string) {
  try {
    const response = await fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from getting feed:", error);
  }
}

export async function getFeedDetails(url: string) {
  try {
    const response = await fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from getting feed:", error);
  }
}

export async function getSmartsiteFeed(url: string, token: string) {
  try {
    const response = await fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from getting feed:", error);
  }
}
export async function getFeedComments(url: string, token: string) {
  try {
    const response = await fetch(`${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from getting feed:", error);
  }
}

export async function postFeed(payload: any, token: string) {
  logger.log("🚀 ~ postFeed ~ payload:", payload);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}
export async function postComment(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/comment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();

    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

export async function deleteFeedComment(commentId: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/comment/${commentId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

export async function deleteFeed(postId: string, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${postId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

//reaction
export async function postFeedLike(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/reaction`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

//reaction
export async function addFeedLikePoints(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/points`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

export async function removeFeedLike(payload: any, token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/remove-reaction`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

export async function isPostLiked(payload: any, token: string) {
  try {
    const { postId, smartsiteId } = payload;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${postId}/like-status?smartsiteId=${smartsiteId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Error from posting feed:", error);
  }
}

//poll
