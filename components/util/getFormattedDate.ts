export const getFormattedDate = (timestamp: any) => {
  const date = new Date(timestamp);

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  const formattedDate = `${day}, ${month}, ${year}`;
  return formattedDate;
};
