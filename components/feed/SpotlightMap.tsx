'use client';

import { useEffect, useState, useCallback } from 'react';

// import Loader from "../ui/Loader";
// import isUrl from "../util/isUrl";

// import { Connection } from "@/types/connections";
// import ConnectionsShowOnGoogleMap from "./ConnectionsShowOnGoogleMap";
import { getDefaultConnection } from '@/actions/connection';
import ConnectionsShowOnGoogleMap from './ConnectionShowOnGoogleMap';

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

interface SpotlightMapProps {
  token: string;
}

/**
 * SpotlightMap component displays connections on a Google Map
 * Shows spotlight connections with their locations and profiles
 *
 * @param token - Authentication token for API requests
 */
const SpotlightMap = ({ token }: SpotlightMapProps) => {
  // State management with proper typing
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchConnections = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response: ApiResponse = await getDefaultConnection(token);

      if (response?.success && Array.isArray(response?.data)) {
        setConnections(response.data);
      } else {
        setConnections([]);
        setError(response?.message || 'Failed to load connections');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred';
      setError(errorMessage);
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Effect for initial data fetch
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Error state with retry option
  if (error) {
    return (
      <div className="w-full px-6 pt-5">
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
              {isLoading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && connections.length === 0) {
    return (
      <div className="w-full px-6 pt-5">
        <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 pt-5">
      {/* <h4 className="text-xl font-medium mb-5">Map</h4> */}
      <ConnectionsShowOnGoogleMap
        connections={connections}
        selectedFriend={selectedFriend}
      />
    </div>
  );
};

export default SpotlightMap;
