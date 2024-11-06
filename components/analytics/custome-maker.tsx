import React from 'react';
import { MarkerF } from '@react-google-maps/api';

interface CustomMarkerProps {
  position: google.maps.LatLngLiteral;
  title: string;
  avatar: string;
  onClick?: () => void;
}

const CustomMarker: React.FC<CustomMarkerProps> = ({
  position,
  title,
  avatar,
  onClick,
}) => {
  return (
    <MarkerF
      position={position}
      title={title}
      onClick={onClick}
      icon={{
        url: `data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
            <defs>
              <pattern id="avatarPattern" patternUnits="userSpaceOnUse" width="40" height="40">
                <image href="${avatar}" width="40" height="40" preserveAspectRatio="xMidYMid slice"/>
              </pattern>
              <clipPath id="circleClip">
                <circle cx="24" cy="20" r="20"/>
              </clipPath>
            </defs>
            <circle cx="24" cy="20" r="20" fill="url(#avatarPattern)" clip-path="url(#circleClip)" stroke="#ffffff" stroke-width="2"/>
            <path d="M24 44l-12-12h24z" fill="#ffffff"/>
          </svg>`
        )}`,
        scaledSize: new google.maps.Size(48, 48),
        anchor: new google.maps.Point(24, 44),
      }}
    />
  );
};

export default CustomMarker;
