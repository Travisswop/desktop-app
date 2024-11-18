import React from "react";
import UpdateSmallIcon from "./UpdateSmallIcon";
import UpdateAppIcon from "./appIcon/UpdateAppIcon";
import UpdateContactCard from "./contactCard/UpdateContactCard";
import UpdateEmbed from "./embed/UpdateEmbed";
import UpdateInfoBar from "./infoBar/UpdateInfoBar";
import UpdateBlog from "./blog/UpdateBlog";
import UpdateVideo from "./Video/UpdateVideo";
import ViewBlog from "./blog/ViewBlog";
import UpdateAudio from "./audio/UpdateAudio";
import UpdateSwopPay from "./SwopPay/UpdateSwopPay";
import UpdateReferral from "./referral/UpdateReferral";
import UpdateENS from "./message/UpdateMessage";

// Define the type for the iconData object
interface IconData {
  categoryForTrigger: string;
  [key: string]: any;
}

// Define the props type
interface UpdateModalComponentsProps {
  isOn: boolean;
  iconData: IconData | null;
  setOff: () => void;
}

const UpdateModalComponents: React.FC<UpdateModalComponentsProps> = ({
  isOn,
  iconData,
  setOff,
}) => {
  return (
    <div>
      {/* small icon start  */}
      {isOn && iconData?.categoryForTrigger === "socialTop" && (
        <UpdateSmallIcon iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* small icon end   */}

      {/* app icon start  */}
      {isOn && iconData?.categoryForTrigger === "socialLarge" && (
        <UpdateAppIcon iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* app icon end   */}

      {/* contact card start  */}
      {isOn && iconData?.categoryForTrigger === "contactCard" && (
        <UpdateContactCard iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* contact card end   */}

      {/* embed start  */}
      {isOn && iconData?.categoryForTrigger === "embed" && (
        <UpdateEmbed iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* embed end   */}

      {/* update info bar start  */}
      {isOn && iconData?.categoryForTrigger === "infoBar" && (
        <UpdateInfoBar iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* update info bar end   */}

      {/* update blog start  */}
      {isOn && iconData?.categoryForTrigger === "blog" && (
        <UpdateBlog iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* update blog end   */}

      {/* update video start  */}
      {isOn && iconData?.categoryForTrigger === "video" && (
        <UpdateVideo iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* update video end   */}

      {/* show blog details start  */}
      {isOn && iconData?.categoryForTrigger === "showBlog" && (
        <ViewBlog iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* show blog details end   */}

      {/* show audio details start  */}
      {isOn && iconData?.categoryForTrigger === "audio" && (
        <UpdateAudio iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* show audio details end   */}

      {/* update swop pay modal start */}
      {isOn && iconData?.categoryForTrigger === "swopPay" && (
        <UpdateSwopPay iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* update swop pay modal end   */}

      {/* update referral modal start */}
      {isOn && iconData?.categoryForTrigger === "referral" && (
        <UpdateReferral iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* update referral modal end   */}

      {/* update message/ens modal start */}
      {isOn && iconData?.categoryForTrigger === "ens" && (
        <UpdateENS iconDataObj={iconData} isOn={isOn} setOff={setOff} />
      )}
      {/* update message/ens modal end   */}
    </div>
  );
};

export default UpdateModalComponents;
