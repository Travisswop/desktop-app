'use client';

import isUrl from '@/lib/isUrl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nextui-org/react';
import {
  Circle,
  GoogleMap,
  OverlayView,
  useLoadScript,
} from '@react-google-maps/api';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Friend {
  _id: string;
  lat: number;
  lng: number;
}

interface ConnectionsShowOnGoogleMapProps {
  connections: any;
  selectedFriend: Friend | null;
}

const CHARLOTTE_MAP_CENTER = { lat: 35.2271, lng: -80.8431 };
const DEFAULT_CHARLOTTE_ZOOM = 13;
const SELECTED_CONNECTION_ZOOM = 13;
const GOOGLE_MAP_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

export default function ConnectionsShowOnGoogleMap({
  connections,
  selectedFriend,
}: ConnectionsShowOnGoogleMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
      'AIzaSyDaERPmsWGDCk2MrKXsqkMfPkSu614Simk',
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const mapStyles = [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#98d7ff' }],
    },
    {
      featureType: 'landscape.natural',
      elementType: 'geometry',
      stylers: [{ color: '#d9f0cf' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#bfe8b1' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }],
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry',
      stylers: [{ color: '#ffe6a7' }],
    },
    {
      featureType: 'administrative',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#344054' }],
    },
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#ffffff' }, { weight: 2 }],
    },
  ];

  const spotlightConnections = useMemo(
    () => {
      if (!Array.isArray(connections)) return [];

      return connections
        .map((connection: any) => ({
          ...connection,
          lat: Number(connection?.lat),
          lng: Number(connection?.lng),
        }))
        .filter(
          ({ connectionType, lat, lng }: any) =>
            connectionType?.includes('spotlight') &&
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        );
    },
    [connections]
  );

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
    ? spotlightConnections.find((c: any) => c?._id === selectedFriend?._id)
    : undefined;

  // Pan to selected connection only once after map is ready
  useEffect(() => {
    if (mapReady && selectedConnection && mapRef.current) {
      mapRef.current.panTo({
        lat: selectedConnection?.lat,
        lng: selectedConnection?.lng,
      });
      mapRef.current.setZoom(SELECTED_CONNECTION_ZOOM);
    }
  }, [mapReady, selectedConnection]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || selectedConnection) return;

    mapRef.current.setCenter(CHARLOTTE_MAP_CENTER);
    mapRef.current.setZoom(DEFAULT_CHARLOTTE_ZOOM);
  }, [mapReady, selectedConnection]);

  useEffect(() => {
    if (isLoaded && !loadError) {
      setMapReady(true);
    }
  }, [isLoaded, loadError]);

  if (!isLoaded) {
    return (
      <div className="flex h-full min-h-[calc(100vh-6rem)] w-full items-center justify-center bg-sky-50">
        <div className="text-center">
          <p>Loading map...</p>
          {loadError && (
            <p className="text-black mt-2">
              Error loading Google Maps. refreshing the page...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-[#dbeafe] opacity-100 transition-opacity duration-700">
      <GoogleMap
        mapContainerStyle={{
          width: '100%',
          height: '100%',
          minHeight: 'calc(100vh - 6rem)',
          overflow: 'hidden',
        }}
        center={
          selectedConnection
            ? {
                lat: selectedConnection?.lat,
                lng: selectedConnection?.lng,
              }
            : CHARLOTTE_MAP_CENTER
        }
        zoom={
          selectedConnection ? SELECTED_CONNECTION_ZOOM : DEFAULT_CHARLOTTE_ZOOM
        }
        onLoad={(map: google.maps.Map) => {
          mapRef.current = map;
          if (!selectedConnection) {
            map.setCenter(CHARLOTTE_MAP_CENTER);
            map.setZoom(DEFAULT_CHARLOTTE_ZOOM);
          }
          setMapReady(true);
        }}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
          backgroundColor: '#dbeafe',
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
              strokeColor: '#4F46E5',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#4F46E5',
              fillOpacity: 0.35,
            }}
          />
        )}

        {/* Markers for spotlight users */}
        {spotlightConnections.map((connection: any) => {
            const isSelected =
              selectedFriend?._id === connection?._id;
            const isNearby =
              selectedFriend &&
              getDistance(
                connection?.lat,
                connection?.lng,
                selectedFriend?.lat,
                selectedFriend?.lng
              ) < 5;

            const displayName =
              connection?.childId?.name || connection?.childId?.ens || 'Swop';
            const initials = displayName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part: string) => part[0])
              .join('')
              .toUpperCase();

            return (
              <OverlayView
                key={connection._id}
                position={{
                  lat: connection.lat,
                  lng: connection.lng,
                }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div className="relative h-16 w-16">
                  <Popover placement="top" showArrow={true}>
                    <PopoverTrigger>
                      <button
                        type="button"
                        aria-label={`Open ${displayName} on the map`}
                        className={clsx(
                          'group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_18px_35px_rgba(15,23,42,0.28)] transition-all duration-300',
                          {
                            'scale-110 ring-4 ring-emerald-400/45':
                              isSelected,
                            'ring-4 ring-sky-400/35':
                              isNearby && !isSelected,
                            'hover:scale-105':
                              !isSelected && !isNearby,
                          }
                        )}
                      >
                        <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-emerald-300 via-sky-300 to-violet-400 opacity-75 blur-sm transition-opacity group-hover:opacity-100" />
                        <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-sm font-black uppercase tracking-[0.08em] text-white">
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
                          {!connection?.childId?.profilePic && initials}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="flex flex-col items-center gap-3 px-6 py-8">
                        {connection?.childId?.profilePic && (
                          <Image
                            src={
                              isUrl(connection?.childId?.profilePic)
                                ? connection?.childId?.profilePic
                                : `/images/user_avator/${connection?.childId?.profilePic}@3x.png`
                            }
                            alt="Profile"
                            className="w-12 h-12 rounded-full "
                            width={200}
                            height={200}
                          />
                        )}
                        <p className="text-base font-semibold">
                          {displayName}
                        </p>
                        {connection?.childId?.ens ? (
                          <Link
                            href={`/sp/${connection.childId.ens}`}
                            className="bg-gray-200 px-5 py-1.5 rounded font-semibold"
                          >
                            View
                          </Link>
                        ) : (
                          <span className="bg-gray-200 px-5 py-1.5 rounded font-semibold text-gray-400 cursor-not-allowed">
                            View
                          </span>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Glowing rings for spotlighted users */}
                  <div className="absolute inset-1 z-[-1] rounded-full bg-sky-500/30 blur-md" />
                </div>
              </OverlayView>
            );
          })}
      </GoogleMap>
    </div>
  );
}
