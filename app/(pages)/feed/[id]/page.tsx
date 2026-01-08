import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import FeedLoading from "@/components/loading/FeedLoading";
import { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// export async function generateMetadata(
//   { params, searchParams }: Props,
//   parent: ResolvingMetadata
// ): Promise<Metadata> {
//   const { id } = await params;

//   const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

//   try {
//     const responseData = await getFeedDetails(url);
//     let feed = responseData?.data;
//     if (responseData?.data?.postType === "repost") {
//       feed = responseData?.repostedPostDetails;
//     }

//     console.log("og response data", responseData);

//     if (!feed) {
//       return {
//         title: "Feed not found",
//         description: "No feed post available.",
//       };
//     }

//     //console.log("feed meta data", feed);

//     // Get the first post content item
//     const firstContent = feed?.content?.post_content?.[0];
//     const contentSrc = firstContent?.src;

//     // Helper function to generate video thumbnail from Cloudinary
//     const getCloudinaryThumbnail = (videoUrl: string): string => {
//       // if (!videoUrl || !videoUrl.includes("cloudinary.com")) {
//       //   return "/default-og-image.jpg";
//       // }

//       // Check if it's a video
//       const isVideo =
//         videoUrl.includes("/video/upload/") ||
//         videoUrl.match(/\.(mp4|mov|avi|webm|mkv)$/i);

//       if (!isVideo) {
//         // Check if it's a HEIC image and convert to JPG
//         if (videoUrl.match(/\.heic$/i)) {
//           const parts = videoUrl.split("/upload/");
//           if (parts.length === 2) {
//             // Add format transformation to convert HEIC to JPG
//             return `${
//               parts[0]
//             }/upload/f_jpg,w_1200,h_630,c_fill/${parts[1].replace(
//               /\.heic$/i,
//               ".jpg"
//             )}`;
//           }
//         }
//         return videoUrl; // Return image URL as-is for other formats
//       }

//       // Transform Cloudinary video URL to image thumbnail
//       // This extracts a frame from the video at 1 second
//       // Example: .../video/upload/v123/video.mov
//       // Becomes: .../video/upload/so_1.0,w_1200,h_630,c_fill/v123/video.jpg

//       const parts = videoUrl.split("/upload/");
//       if (parts.length !== 2) return "/default-og-image.jpg";

//       // Extract the public_id (remove file extension)
//       const publicIdWithExt = parts[1];
//       const publicId = publicIdWithExt.replace(
//         /\.(mp4|mov|avi|webm|mkv)$/i,
//         ""
//       );

//       // Build thumbnail URL with transformations
//       // so_1.0 = start offset at 1 second
//       // w_1200,h_630 = dimensions
//       // c_fill = crop to fill
//       // f_jpg = format as JPEG
//       const thumbnailUrl = `${parts[0]}/upload/so_1.0,w_1200,h_630,c_fill,f_jpg/${publicId}.jpg`;

//       return thumbnailUrl;
//     };

//     const displayImage = getCloudinaryThumbnail(contentSrc || "/og-image.png");

//     return {
//       title: feed?.content?.title || "Swop Feed",
//       // description: "Check out this swop feed",
//       openGraph: {
//         title: feed?.content?.title || "Swop Feed",
//         // description: "Check out this feed",
//         images: [
//           {
//             url: displayImage || "/og-image.png",
//             width: 1200,
//             height: 630,
//             alt: feed?.content?.title || "Feed image",
//           },
//         ],
//         type: "article",
//         url: `${process.env.NEXT_PUBLIC_APP_URL}/feed/${id}`,
//       },
//       twitter: {
//         card: "summary_large_image",
//         title: feed?.content?.title || "Swop Feed",
//         description: "Check out this swop feed",
//         images: [displayImage || "/og-image.png"],
//       },
//     };
//   } catch (error) {
//     // Fallback metadata if fetch fails
//     return {
//       title: "Feed Details",
//       description: "Check out this feed",
//       openGraph: {
//         title: "Feed Details",
//         description: "Check out this feed",
//         images: ["/og-image.png"],
//       },
//     };
//   }
// }

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;

  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

  try {
    const responseData = await getFeedDetails(url);
    let feed = responseData?.data;
    if (responseData?.data?.postType === "repost") {
      feed = responseData?.repostedPostDetails;
    }

    if (!feed) {
      return {
        title: "Feed not found",
        description: "No feed post available.",
      };
    }

    const firstContent = feed?.content?.post_content?.[0];
    const contentSrc = firstContent?.src;
    const smartsiteEnsName = feed?.smartsiteEnsName || "swop.user";
    const feedTitle = feed?.content?.title || "Swop Feed";
    const createdAt = feed?.createdAt || new Date().toISOString();

    // Format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    // Helper function to optimize Cloudinary images
    const getOptimizedImage = (imageUrl: string): string => {
      if (!imageUrl) return `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`;

      const isVideo =
        imageUrl.includes("/video/upload/") ||
        imageUrl.match(/\.(mp4|mov|avi|webm|mkv)$/i);

      if (isVideo) {
        // Extract thumbnail from video
        const parts = imageUrl.split("/upload/");
        if (parts.length !== 2)
          return `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`;

        const publicId = parts[1].replace(/\.(mp4|mov|avi|webm|mkv)$/i, "");
        return `${parts[0]}/upload/so_1.0,w_1200,h_630,c_fill,f_jpg,q_auto/${publicId}.jpg`;
      }

      // For images
      if (imageUrl.includes("cloudinary.com")) {
        const parts = imageUrl.split("/upload/");
        if (parts.length === 2) {
          return `${parts[0]}/upload/f_auto,w_1200,h_630,c_fill,q_auto/${parts[1]}`;
        }
      }

      return imageUrl;
    };

    const displayImage = getOptimizedImage(contentSrc);
    const feedDescription = `${smartsiteEnsName} • ${formatDate(createdAt)}`;

    return {
      title: `${feedTitle} | ${smartsiteEnsName}`,
      description: feedDescription,
      openGraph: {
        title: feedTitle,
        description: feedDescription,
        images: [
          {
            url: displayImage,
            width: 1200,
            height: 630,
            alt: feedTitle,
            type: "image/jpeg",
          },
        ],
        type: "website",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/feed/${id}`,
        siteName: smartsiteEnsName,
      },
      twitter: {
        card: "summary_large_image",
        title: feedTitle,
        description: feedDescription,
        images: [displayImage],
      },
      other: {
        "og:image:secure_url": displayImage,
        "og:image:type": "image/jpeg",
        "og:image:width": "1200",
        "og:image:height": "630",
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);

    const fallbackImage = `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`;

    return {
      title: "Swop Feed",
      description: "Check out this post on Swop",
      openGraph: {
        title: "Swop Feed",
        description: "Check out this post on Swop",
        images: [fallbackImage],
        type: "website",
        siteName: "Swop",
      },
    };
  }
}

const FeedDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;
  const userId = (await cookieStore).get("user-id")?.value;

  const url = userId
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}?userId=${userId}`
    : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

  const feedData = await getFeedDetails(url);

  // console.log("feed data", feedData);

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-[90%] sm:w-[70%] xl:w-[30%] overflow-y-auto">
        <Suspense fallback={<FeedLoading />}>
          {feedData && (
            <FeedDetails
              feedData={feedData.data}
              feedDetails={feedData}
              accessToken={accessToken}
            />
          )}
        </Suspense>
      </div>
      {!accessToken && (
        <div className="text-white bg-blue-500 py-4 w-full z-50 flex items-center gap-4 justify-between px-8 fixed bottom-0 left-0">
          <p className="text-lg font-bold">{`Don't miss what's happening`}</p>
          <Link
            href={"/login"}
            className="border border-white rounded-full px-4 py-1 hover:bg-white hover:text-black font-medium"
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
};

export default FeedDetailsPage;
