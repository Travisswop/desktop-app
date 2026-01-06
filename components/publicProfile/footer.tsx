import { FC } from "react";
import Image from "next/image";
interface Props {
  brandIcon: string;
}

const Footer: FC<Props> = ({ brandIcon }) => {
  return (
    <div className="flex items-center my-8">
      <Image
        src={brandIcon}
        alt="Twitter Logo"
        width={250}
        height={90}
        className="w-28 h-auto"
        priority
      />
    </div>
  );
};

export default Footer;
