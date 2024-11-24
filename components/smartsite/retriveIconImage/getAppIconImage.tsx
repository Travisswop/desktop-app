// import { newIcons } from "../data/smartsiteIconData";

import { newIcons } from "@/components/util/data/smartsiteIconData";

const getAppIconImage = (name: any, group: any) => {
  const icons = newIcons[1];
  const iconObj = icons.icons.find((data) => data.category === group);
  const data = iconObj?.icons.find((item) => item.name === name);
  const img = data?.icon;
  return img;
};

export default getAppIconImage;
