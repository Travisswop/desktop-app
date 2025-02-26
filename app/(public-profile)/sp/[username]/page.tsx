import ClientProfile from "./ClientProfile";
import Custom404 from "./404";
// import { Metadata, ResolvingMetadata } from "next";
import { getUserData } from "@/actions/user";
import { addSwopPoint } from "@/actions/addPoint";

// const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// type Props = {
//   params: { username: string };
//   searchParams: { [key: string]: string | string[] | undefined };
// };

// export async function generateMetadata(
//   { params }: Props,
//   parent: ResolvingMetadata
// ): Promise<Metadata> {
//   const username = params.username;
//   try {
//     const result = await getUserData(username);

//     const { name, profilePic, bio } = result.data;

//     const shortcutIcon = profilePic.includes("https")
//       ? profilePic
//       : `/images/avatar/${profilePic}.png`;

//     const metadata: Metadata = {
//       title: {
//         absolute: name, // Use absolute to override any parent titles
//       },
//       description: bio,
//       icons: {
//         icon: shortcutIcon,
//         shortcut: shortcutIcon,
//         apple: [
//           { url: shortcutIcon },
//           { url: shortcutIcon, sizes: "57x57", type: "image/png" },
//           { url: shortcutIcon, sizes: "60x60", type: "image/png" },
//           { url: shortcutIcon, sizes: "72x72", type: "image/png" },
//           { url: shortcutIcon, sizes: "76x76", type: "image/png" },
//           { url: shortcutIcon, sizes: "114x114", type: "image/png" },
//           { url: shortcutIcon, sizes: "180x180", type: "image/png" },
//           { url: shortcutIcon, sizes: "228x228", type: "image/png" },
//         ],
//       },
//       openGraph: {
//         title: name,
//         description: bio,
//         url: `${APP_URL}/sp/${username}`,
//         siteName: "Swop",
//         type: "profile",
//         images: [
//           {
//             url: shortcutIcon,
//             width: 200,
//             height: 200,
//             alt: name,
//           },
//         ],
//       },
//       twitter: {
//         card: "summary",
//         title: name,
//         description: bio,
//         images: [shortcutIcon],
//       },
//     };

//     return metadata;
//   } catch (error) {
//     console.error("Error generating metadata:", error);
//     return {};
//   }
// }

export default async function PublicProfile({
  params,
}: {
  // params: { username: string };
  params: Promise<{ username: string }>;
}) {
  try {
    const userName = (await params)?.username;
    console.log("userName", userName);

    const result = await getUserData(userName);
    addSwopPoint({
      userId: result.data.parentId,
      pointType: "Generating Traffic to Your SmartSite",
      actionKey: "launch-swop",
    });

    // If no redirect is needed, render the ClientProfile
    return <ClientProfile initialData={result} userName={userName} />;
  } catch (error) {
    console.error("Error fetching data:", error);
    return <Custom404 />;
  }
}
