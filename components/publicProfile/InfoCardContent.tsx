interface Props {
  fontColor?: string;
  secondaryFontColor?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

const InfoCardContent = ({
  fontColor,
  secondaryFontColor,
  title,
  description,
  children,
}: Props) => {
  return (
    <div className="ml-3">
      <div style={{ color: fontColor }} className="font-medium text-sm">
        {title}
      </div>
      <div style={{ color: secondaryFontColor }} className="text-xs">
        {description}
      </div>
      {children}
    </div>
  );
};

export default InfoCardContent;
