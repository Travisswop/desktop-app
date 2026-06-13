// app/components/SetupPanel.js
import { useUser } from "@/lib/UserContext";
import { useState } from "react";

export default function SetupPanel({
  onConnect,
  onDisconnect,
  connected,
  setCurrentUser,
}) {
  const [jwtToken, setJwtToken] = useState("");
  console.log("jwtToken", jwtToken);

  const { accessToken } = useUser();

  console.log("accessToken", accessToken);

  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleConnect = () => {
    if (!jwtToken.trim()) {
      alert("Please enter JWT token");
      return;
    }

    const payload = parseJwt(jwtToken);

    console.log("payload", payload);

    const userId =
      payload && (payload._id || payload.id || payload.userId)
        ? String(payload._id || payload.id || payload.userId)
        : null;

    setCurrentUser(userId);
    onConnect(jwtToken);
  };

  return (
    <div className="bg-whatsapp-bg-secondary px-6 py-4 border-b border-whatsapp-border">
      <div className="flex gap-4 max-w-4xl mx-auto">
        <input
          type="text"
          value={jwtToken}
          onChange={(e) => setJwtToken(e.target.value)}
          placeholder="Enter your JWT token..."
          className="flex-1 bg-whatsapp-input-bg text-whatsapp-text-primary px-4 py-2 rounded-lg border border-whatsapp-border focus:outline-none focus:border-whatsapp-green"
        />

        <button
          onClick={handleConnect}
          disabled={connected}
          className={`px-6 py-2 rounded-lg font-medium ${
            connected
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-whatsapp-green hover:bg-whatsapp-green-dark"
          }`}
        >
          Connect
        </button>

        <button
          onClick={onDisconnect}
          disabled={!connected}
          className={`px-6 py-2 rounded-lg font-medium ${
            !connected
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

// // app/components/SetupPanel.js
// import { useUser } from "@/lib/UserContext";

// export default function SetupPanel({
//   onConnect,
//   onDisconnect,
//   connected,
//   setCurrentUser,
// }) {
//   const { accessToken } = useUser();

//   const parseJwt = (token) => {
//     try {
//       const base64Url = token.split(".")[1];
//       const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
//       const jsonPayload = decodeURIComponent(
//         atob(base64)
//           .split("")
//           .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
//           .join("")
//       );
//       return JSON.parse(jsonPayload);
//     } catch (e) {
//       return null;
//     }
//   };

//   const handleConnect = () => {
//     if (!accessToken) {
//       alert("No access token found. Please log in first.");
//       return;
//     }

//     const payload = parseJwt(accessToken);
//     const userId =
//       payload && (payload._id || payload.id || payload.userId)
//         ? String(payload._id || payload.id || payload.userId)
//         : null;

//     setCurrentUser(userId);
//     onConnect(accessToken);
//   };

//   return (
//     <div className="bg-whatsapp-bg-secondary px-6 py-4 border-b border-whatsapp-border">
//       <div className="flex gap-4 max-w-4xl mx-auto">
//         <button
//           onClick={handleConnect}
//           disabled={connected}
//           className={`px-6 py-2 rounded-lg font-medium ${
//             connected
//               ? "bg-gray-600 cursor-not-allowed"
//               : "bg-whatsapp-green hover:bg-whatsapp-green-dark"
//           }`}
//         >
//           Connect
//         </button>

//         <button
//           onClick={onDisconnect}
//           disabled={!connected}
//           className={`px-6 py-2 rounded-lg font-medium ${
//             !connected
//               ? "bg-gray-600 cursor-not-allowed"
//               : "bg-red-500 hover:bg-red-600 text-white"
//           }`}
//         >
//           Disconnect
//         </button>
//       </div>
//     </div>
//   );
// }
