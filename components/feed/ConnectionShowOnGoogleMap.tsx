"use client";

import isUrl from "@/lib/isUrl";
import {
  Circle,
  GoogleMap,
  OverlayView,
  useLoadScript,
} from "@react-google-maps/api";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef } from "react";

interface Friend {
  _id: string;
  lat: number;
  lng: number;
}

interface ConnectionsShowOnGoogleMapProps {
  connections: any;
  selectedFriend: Friend | null;
}

export default function ConnectionsShowOnGoogleMap({
  connections,
  selectedFriend,
}: ConnectionsShowOnGoogleMapProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
    libraries: ["places", "geometry"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const mapReady = false;

  const mapStyles = [
    {
      featureType: "all",
      elementType: "all",
      stylers: [{ saturation: -100 }, { gamma: 0.8 }],
    },
  ];

  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const selectedConnection = selectedFriend
    ? connections?.find((c: any) => c?._id === selectedFriend?._id)
    : undefined;

  // Pan to selected connection only once after map is ready
  useEffect(() => {
    if (mapReady && selectedConnection && mapRef.current) {
      mapRef.current.panTo({
        lat: selectedConnection?.lat,
        lng: selectedConnection?.lng,
      });
    }
  }, [mapReady, selectedConnection]);

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div className="overflow-hidden transition-opacity duration-700 opacity-100">
      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height: "600px",
          overflow: "hidden",
          borderRadius: "10px",
        }}
        center={
          selectedConnection
            ? { lat: selectedConnection?.lat, lng: selectedConnection?.lng }
            : { lat: 40.7128, lng: -74.006 }
        }
        zoom={6}
        onLoad={(map: google.maps.Map) => {
          mapRef.current = map;
        }}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          backgroundColor: "#f9fafb",
        }}
      >
        {selectedConnection?.lat && selectedConnection?.lng && (
          <Circle
            center={{
              lat: selectedConnection?.lat,
              lng: selectedConnection?.lng,
            }}
            radius={5000}
            options={{
              strokeColor: "#4F46E5",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#4F46E5",
              fillOpacity: 0.35,
            }}
          />
        )}

        {/* Markers for spotlight users */}
        {connections
          ?.filter(({ connectionType }: any) =>
            connectionType?.includes("spotlight")
          )
          ?.map((connection: any) => {
            const isSelected = selectedFriend?._id === connection?._id;
            const isNearby =
              selectedFriend &&
              getDistance(
                connection?.lat,
                connection?.lng,
                selectedFriend?.lat,
                selectedFriend?.lng
              ) < 5;

            return (
              <OverlayView
                key={connection._id}
                position={{ lat: connection.lat, lng: connection.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="relative w-16 h-16">
                  <div
                    className={clsx(
                      "rounded-full p-1 flex items-center justify-center shadow-lg border-4 transition-all duration-300 transform overflow-hidden",
                      {
                        "border-[#5E20FE] bg-blue-100 scale-110 z-50 absolute":
                          isSelected,
                        "border-purple-500 bg-purple-100":
                          isNearby && !isSelected,
                        "border-gray-300 bg-white": !isSelected && !isNearby,
                      }
                    )}
                  >
                    {connection?.childId?.profilePic && (
                      <Image
                        src={
                          isUrl(connection?.childId?.profilePic)
                            ? connection?.childId?.profilePic
                            : `/images/user_avator/${connection?.childId?.profilePic}@3x.png`
                        }
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                        width={1200}
                        height={700}
                      />
                    )}
                  </div>

                  {/* Glowing rings for spotlighted users */}
                  <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500 opacity-30 z-[-1]" />
                </div>
              </OverlayView>
            );
          })}
      </GoogleMap>
    </div>
  );
}
