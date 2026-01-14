// export const makeLinksClickable = (text: string) => {
//   const urlRegex = /(https?:\/\/[^\s]+)/g;
//   return text.split(urlRegex).map((part, index) => {
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
// };

import { formatEns } from "./formatEnsName";

export const makeLinksClickable = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const swopRegex = /\b([a-zA-Z0-9-]+\.swop\.id)\b/g;

  return text
    .split(/(https?:\/\/[^\s]+|\b[a-zA-Z0-9-]+\.swop\.id\b)/g)
    .map((part, index) => {
      // Normal URL
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

      // swop.id without protocol
      if (swopRegex.test(part)) {
        return (
          <a
            key={index}
            href={`https://${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all"
          >
            {formatEns(part)}
          </a>
        );
      }

      return part;
    });
};
