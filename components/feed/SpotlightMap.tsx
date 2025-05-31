"use client";

import { useEffect, useState } from "react";

// import Loader from "../ui/Loader";
// import isUrl from "../util/isUrl";

// import { Connection } from "@/types/connections";
// import ConnectionsShowOnGoogleMap from "./ConnectionsShowOnGoogleMap";
import { getDefaultConnection } from "@/actions/connection";
import ConnectionsShowOnGoogleMap from "./ConnectionShowOnGoogleMap";

interface ConnectionsViewProps {
  token: string;
}

interface Friend {
  _id: string;
  lat: number;
  lng: number;
}

const SpotlightMap = ({ token }: ConnectionsViewProps) => {
  const [connections, setConnections] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const [connectionLoading, setConnectionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setConnectionLoading(true);
      try {
        const response = await getDefaultConnection(token);
        console.log("response", response);

        setConnections(response?.data);
      } catch (err) {
        console.log("Error fetching connections:", err);
      } finally {
        setConnectionLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  console.log("connections", connections);
  console.log("selectedFriend", selectedFriend);

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
