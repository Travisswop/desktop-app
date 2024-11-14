"use server";
// export const maxDuration = 60;
import { revalidatePath } from "next/cache";

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
    console.error("Error from getting feed:", error);
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
    console.error("Error from getting feed:", error);
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
    console.error("Error from getting feed:", error);
  }
}

export async function postFeed(payload: any, token: string) {
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
    revalidatePath(`/feed`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from posting feed:", error);
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
    revalidatePath(`/feed`);
    const data = await response.json();
    // console.log("data from action", data);

    return data;
  } catch (error) {
    console.error("Error from posting feed:", error);
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
    revalidatePath(`/feed`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from posting feed:", error);
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
    revalidatePath(`/feed`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from posting feed:", error);
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
    revalidatePath(`/feed`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from posting feed:", error);
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
    revalidatePath(`/feed`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error from posting feed:", error);
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
    console.error("Error from posting feed:", error);
  }
}

// export async function updateVideo(info: any, token: string) {
//   try {
//     const response = await fetch(
//       `${process.env.NEXT_PUBLIC_API_URL}/api/v4/microsite/video`,
//       {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(info),
//       }
//     );
//     revalidatePath(`/smartsites/icons/${info.micrositeId}`);
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Error from action:", error);
//   }
// }
