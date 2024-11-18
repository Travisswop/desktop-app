import React from "react";
import AddSmallIcon from "./AddSmallIcon";
import AddEmbed from "./embed/AddEmbed";
import AddAppIcon from "./appIcon/AddAppIcon";
import AddContactCard from "./contactCard/AddContactCard";
import AddInfoBar from "./infoBar/AddInfoBar";
import AddBlog from "./blog/AddBlog";
import AddVideo from "./Video/AddVideo";
import AddAudio from "./audio/AddAudio";
import AddSwopPay from "./SwopPay/AddSwopPay";
import AddReferral from "./referral/AddReferral";
import AddMessage from "./message/AddMessage";
import AddFeed from "./feed/AddFeed";

const AddIcon = ({
  data,
  handleRemoveIcon,
}: {
  data: string;
  handleRemoveIcon: any;
}) => {
  // console.log("data", data);

  return (
    <div>
      {data === "Small Icon" && (
        <AddSmallIcon handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Blog" && <AddBlog handleRemoveIcon={handleRemoveIcon} />}
      {data === "App Icon" && (
        <AddAppIcon handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Info Bar" && (
        <AddInfoBar handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Contact Card" && (
        <AddContactCard handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Embed" && <AddEmbed handleRemoveIcon={handleRemoveIcon} />}
      {data === "Video" && <AddVideo handleRemoveIcon={handleRemoveIcon} />}
      {data === "Music File" && (
        <AddAudio handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Swop Pay" && (
        <AddSwopPay handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Referral" && (
        <AddReferral handleRemoveIcon={handleRemoveIcon} />
      )}
      {data === "Message" && <AddMessage handleRemoveIcon={handleRemoveIcon} />}
      {data === "Feed" && <AddFeed handleRemoveIcon={handleRemoveIcon} />}
    </div>
  );
};

export default AddIcon;
