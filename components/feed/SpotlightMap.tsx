"use client";

import { useEffect, useState, useCallback, memo } from "react";

// import Loader from "../ui/Loader";
// import isUrl from "../util/isUrl";

// import { Connection } from "@/types/connections";
// import ConnectionsShowOnGoogleMap from "./ConnectionsShowOnGoogleMap";
import { getDefaultConnection } from "@/actions/connection";
import ConnectionsShowOnGoogleMap from "./ConnectionShowOnGoogleMap";
import Cookies from "js-cookie";
import SpotLightMapLoader from "../loading/SpotLightMapLoader";

// Types
interface Friend {
  _id: string;
  lat: number;
  lng: number;
}

interface Connection {
  _id: string;
  lat: number;
  lng: number;
  connectionType: string[];
  childId?: {
    name: string;
    profilePic: string;
    ens?: string;
  };
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: Connection[];
}

// interface SpotlightMapProps {
//   token: string;
// }

/**
 * SpotlightMap component displays connections on a Google Map
 * Shows spotlight connections with their locations and profiles
 *
 * @param token - Authentication token for API requests
 */
const SpotlightMap = memo(() => {
  const [accessToken, setAccessToken] = useState("");
  // State management with proper typing
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get access token from cookies
  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchConnections = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response: ApiResponse = await getDefaultConnection(accessToken);

      if (response?.success && Array.isArray(response?.data)) {
        setConnections(response.data);
      } else {
        setConnections([]);
        setError(response?.message || "Failed to load connections");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Effect for initial data fetch
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Error state with retry option
  if (error) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading map</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={fetchConnections}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Retry loading connections"
            >
              {isLoading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && connections.length === 0) {
    return <SpotLightMapLoader />;
  }

  return (
    <div className="w-full h-full grid items-center">
      <ConnectionsShowOnGoogleMap
        connections={connections}
        selectedFriend={selectedFriend}
      />
    </div>
  );
});

SpotlightMap.displayName = "SpotlightMap";

export default SpotlightMap;
