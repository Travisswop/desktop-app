interface Props {
  fontColor?: string;
  secondaryFontColor?: string;
  title: string;
  description: string;
}

const InfoCardContent = ({
  fontColor,
  secondaryFontColor,
  title,
  description,
}: Props) => {
  return (
    <div className="ml-3">
      <div style={{ color: fontColor }} className="font-[600] text-sm">
        {title}
      </div>
      <div style={{ color: secondaryFontColor }} className="text-xs">
        {description}
      </div>
    </div>
  );
};

export default InfoCardContent;
