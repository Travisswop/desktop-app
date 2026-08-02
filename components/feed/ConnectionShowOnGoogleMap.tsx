'use client';

import isUrl from '@/lib/isUrl';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';

interface Friend {
  _id: string;
  lat: number;
  lng: number;
}

interface SpotlightConnection {
  _id: string;
  lat: number;
  lng: number;
  connectionType?: string[];
  childId?: {
    name?: string;
    profilePic?: string;
    ens?: string;
  };
}

interface ConnectionsShowOnGoogleMapProps {
  connections: unknown;
  selectedFriend: Friend | null;
}

const CHARLOTTE_MAP_CENTER: [number, number] = [35.2271, -80.8431];
const DEFAULT_CHARLOTTE_ZOOM = 13;
const SELECTED_CONNECTION_ZOOM = 13;

const profileImageUrl = (profilePic?: string) => {
  if (!profilePic) return null;
  return isUrl(profilePic)
    ? profilePic
    : `/images/user_avator/${profilePic}@3x.png`;
};

const markerInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default function ConnectionsShowOnGoogleMap({
  connections,
  selectedFriend,
}: ConnectionsShowOnGoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const spotlightConnections = useMemo<SpotlightConnection[]>(() => {
    if (!Array.isArray(connections)) return [];

    return connections
      .map((connection) => ({
        ...connection,
        lat: Number(connection?.lat),
        lng: Number(connection?.lng),
      }))
      .filter(
        (connection): connection is SpotlightConnection =>
          connection.connectionType?.includes('spotlight') === true &&
          Number.isFinite(connection.lat) &&
          Number.isFinite(connection.lng)
      );
  }, [connections]);

  const selectedConnection = useMemo(
    () =>
      selectedFriend
        ? spotlightConnections.find(
            (connection) => connection._id === selectedFriend._id
          )
        : undefined,
    [selectedFriend, spotlightConnections]
  );

  useEffect(() => {
    let disposed = false;

    const createMap = async () => {
      if (!mapContainerRef.current) return;

      setMapReady(false);
      setMapError(null);

      try {
        const L = await import('leaflet');
        if (disposed || !mapContainerRef.current) return;

        const center: [number, number] = selectedConnection
          ? [selectedConnection.lat, selectedConnection.lng]
          : CHARLOTTE_MAP_CENTER;

        const map = L.map(mapContainerRef.current, {
          attributionControl: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          zoomControl: true,
        }).setView(
          center,
          selectedConnection
            ? SELECTED_CONNECTION_ZOOM
            : DEFAULT_CHARLOTTE_ZOOM
        );

        mapRef.current = map;

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        spotlightConnections.forEach((connection) => {
          const displayName =
            connection.childId?.name || connection.childId?.ens || 'Swop';
          const avatar = profileImageUrl(connection.childId?.profilePic);
          const markerElement = document.createElement('button');
          markerElement.type = 'button';
          markerElement.className = 'swop-map-marker';
          markerElement.setAttribute(
            'aria-label',
            `Open ${displayName} on the map`
          );

          const markerInner = document.createElement('span');
          markerInner.className = 'swop-map-marker__inner';

          if (avatar) {
            const image = document.createElement('img');
            image.src = avatar;
            image.alt = '';
            image.className = 'swop-map-marker__image';
            image.addEventListener(
              'error',
              () => {
                image.remove();
                markerInner.textContent = markerInitials(displayName);
              },
              { once: true }
            );
            markerInner.appendChild(image);
          } else {
            markerInner.textContent = markerInitials(displayName);
          }

          markerElement.appendChild(markerInner);

          const marker = L.marker([connection.lat, connection.lng], {
            icon: L.divIcon({
              className: 'swop-map-marker-shell',
              html: markerElement,
              iconAnchor: [28, 28],
              iconSize: [56, 56],
              popupAnchor: [0, -34],
            }),
            // The custom icon contains the actual focusable button. Disabling
            // Leaflet's wrapper focus avoids nested interactive controls.
            keyboard: false,
            title: displayName,
          }).addTo(map);

          const popup = document.createElement('div');
          popup.className = 'swop-map-popup';

          if (avatar) {
            const popupImage = document.createElement('img');
            popupImage.src = avatar;
            popupImage.alt = '';
            popupImage.className = 'swop-map-popup__image';
            popup.appendChild(popupImage);
          }

          const name = document.createElement('p');
          name.className = 'swop-map-popup__name';
          name.textContent = displayName;
          popup.appendChild(name);

          if (connection.childId?.ens) {
            const link = document.createElement('a');
            link.href = `/sp/${encodeURIComponent(connection.childId.ens)}`;
            link.className = 'swop-map-popup__link';
            link.textContent = 'View';
            popup.appendChild(link);
          }

          marker.bindPopup(popup, { closeButton: true, minWidth: 150 });
        });

        if (selectedConnection) {
          L.circle([selectedConnection.lat, selectedConnection.lng], {
            color: '#4f46e5',
            fillColor: '#4f46e5',
            fillOpacity: 0.22,
            radius: 5000,
            weight: 2,
          }).addTo(map);
        }

        map.whenReady(() => {
          if (!disposed) setMapReady(true);
        });

        window.requestAnimationFrame(() => {
          if (!disposed) map.invalidateSize();
        });
      } catch (error) {
        if (!disposed) {
          setMapError(
            error instanceof Error ? error.message : 'Unable to load the map.'
          );
        }
      }
    };

    void createMap();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedConnection, spotlightConnections]);

  return (
    <div className="relative h-full min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-[#dbeafe]">
      <div
        ref={mapContainerRef}
        className="swop-leaflet-map h-full min-h-[calc(100vh-6rem)] w-full"
        aria-label="Spotlight connections map"
      />

      {!mapReady && !mapError && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-sky-50">
          <p className="font-medium text-slate-700">Loading map...</p>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-sky-50 px-6">
          <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="font-semibold text-slate-950">Map unavailable</p>
            <p className="mt-2 text-sm text-slate-600">{mapError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .swop-leaflet-map .leaflet-control-attribution {
          font-size: 10px;
        }

        .swop-map-marker-shell {
          border: 0 !important;
          background: transparent !important;
        }

        .swop-map-marker {
          position: relative;
          display: flex;
          width: 56px;
          height: 56px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          border: 4px solid white;
          border-radius: 9999px;
          background: white;
          box-shadow: 0 18px 35px rgba(15, 23, 42, 0.3);
          transition: transform 180ms ease;
        }

        .swop-map-marker::before {
          position: absolute;
          inset: -7px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #6ee7b7, #7dd3fc, #a78bfa);
          content: '';
          filter: blur(5px);
          opacity: 0.72;
        }

        .swop-map-marker:hover,
        .swop-map-marker:focus-visible {
          transform: scale(1.08);
          outline: none;
        }

        .swop-map-marker__inner {
          position: relative;
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 9999px;
          background: linear-gradient(135deg, #020617, #334155);
          color: white;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .swop-map-marker__image,
        .swop-map-popup__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .swop-map-popup {
          display: flex;
          min-width: 150px;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 8px 4px 4px;
        }

        .swop-map-popup__image {
          width: 48px;
          height: 48px;
          border-radius: 9999px;
        }

        .swop-map-popup__name {
          margin: 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
        }

        .swop-map-popup__link {
          border-radius: 6px;
          background: #e2e8f0;
          padding: 6px 20px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
