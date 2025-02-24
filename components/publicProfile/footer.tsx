import { FC } from 'react';
import Image from 'next/image';
interface Props {
  brandIcon: string;
}

const Footer: FC<Props> = ({ brandIcon }) => {
  return (
    <div className="flex items-center my-8">
      <div>
        <Image
          className="object-fill"
          src={brandIcon}
          alt="Twitter Logo"
          width={150}
          height={30}
          priority
        />
      </div>
    </div>
  );
};

export default Footer;
