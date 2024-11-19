import { smartsiteIcons } from "../getSmartsiteIcons";

const getAllSmartsitesIcon = (iconName: string) => {
  // Remove spaces from iconName and convert it to a format matching the key in the object
  const refinedIconName = iconName.replace(
    /\s+/g,
    ""
  ) as keyof typeof smartsiteIcons;

  // Use refinedIconName as a key to access smartsiteIcons
  const icon = smartsiteIcons[refinedIconName];

  // If the icon is found, return it, otherwise return null or a fallback icon
  if (icon) {
    return icon;
  } else {
    console.warn(`Icon for "${iconName}" not found.`);
    return null; // or provide a fallback image here
  }
};

export default getAllSmartsitesIcon;
