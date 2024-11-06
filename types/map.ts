export interface LocationInfo {
  id: number;
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  description: string;
  avatar: string;
  role: string;
}

export interface LocationCard extends LocationInfo {
  description: string;
}
