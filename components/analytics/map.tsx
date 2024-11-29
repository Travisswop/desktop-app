'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMap, LoadScript } from '@react-google-maps/api';
import CustomMarker from './custome-maker';
import { LocationInfo } from '@/types/map';
import Image from 'next/image';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 40.7128,
  lng: -74.006,
};

interface MapProps {
  locations: LocationInfo[];
}

const ConnectionMap: React.FC<MapProps> = ({ locations }) => {
  const [selectedLocation, setSelectedLocation] =
    useState<LocationInfo | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach(({ position }) => bounds.extend(position));
      map.fitBounds(bounds);
      setMap(map);
    },
    [locations]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!map) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <LoadScript
        googleMapsApiKey={
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
        }
        onError={() => console.error('Error loading Google Maps API')}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            styles: [
              {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#6b7280' }],
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#dbeafe' }],
              },
              {
                featureType: 'landscape',
                elementType: 'geometry',
                stylers: [{ color: '#f3f4f6' }],
              },
            ],
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: true,
          }}
        >
          {locations.map((location) => (
            <CustomMarker
              key={location.id}
              position={location.position}
              title={location.title}
              avatar={location.avatar}
              onClick={() => setSelectedLocation(location)}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {selectedLocation && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start gap-4">
            <Image
              src={selectedLocation.avatar}
              alt={selectedLocation.title}
              width={80}
              height={80}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
            />
            <div>
              <h3 className="font-semibold text-gray-800">
                {selectedLocation.title}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                {selectedLocation.role}
              </p>
              <p className="text-sm text-gray-600">
                {selectedLocation.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionMap;
