const getMediaType = (url: string): "video" | "image" | "unknown" => {
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase();

  if (!extension) return "unknown";

  const videoExt = ["mp4", "webm", "ogg", "mov"];
  const imageExt = ["jpg", "jpeg", "png", "webp", "gif"];

  if (videoExt.includes(extension)) return "video";
  if (imageExt.includes(extension)) return "image";

  return "unknown";
};

export default getMediaType;
