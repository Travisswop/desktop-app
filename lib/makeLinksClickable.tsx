// export const makeLinksClickable = (text: string) => {
//   const urlRegex = /(https?:\/\/[^\s]+)/g;
//   const urls = text.match(urlRegex) || [];

//   const parts = text.split(urlRegex).map((part, index) => {
//     if (urlRegex.test(part)) {
//       return (
//         <a
//           key={index}
//           href={part}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="text-blue-600 underline break-all"
//         >
//           {part}
//         </a>
//       );
//     }
//     return part;
//   });

//   return { parts, urls };
// };

export const makeLinksClickable = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
