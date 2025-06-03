'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import React from 'react';
import { CiSearch } from 'react-icons/ci';
import { getConnectedUserMicrosite } from '@/actions/connectedUserMicrosite';
import isUrl from '@/lib/isUrl';
import ConnectionLoading from '../loading/ConnectionLoading';

// Define proper TypeScript interfaces
interface Connection {
  name: string;
  bio: string;
  profilePic: string;
  profileUrl?: string;
  address?: string;
}

interface ConnectionsProps {
  userId: string;
  accessToken: string;
}

interface ApiResponse {
  data: Connection[];
}

const Connections: React.FC<ConnectionsProps> = ({
  userId,
  accessToken,
}) => {
  const [connectionData, setConnectionData] = useState<
    Connection[] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredConnections, setFilteredConnections] = useState<
    Connection[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the search function to prevent unnecessary re-renders
  const handleSearch = useCallback(() => {
    if (!connectionData) {
      setFilteredConnections([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredConnections(connectionData);
    } else {
      const filtered = connectionData.filter(
        (connection: Connection) =>
          connection.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase().trim())
      );
      setFilteredConnections(filtered);
    }
  }, [connectionData, searchQuery]);

  // Fetch connection data with proper error handling
  useEffect(() => {
    const fetchConnectionData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response: ApiResponse = await getConnectedUserMicrosite(
          userId,
          accessToken
        );

        console.log('connections', response);

        if (response?.data && Array.isArray(response.data)) {
          setConnectionData(response.data);
        } else {
          setConnectionData([]);
        }
      } catch (err) {
        console.error('Error fetching connections:', err);
        setError('Failed to load connections. Please try again.');
        setConnectionData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userId && accessToken) {
      fetchConnectionData();
    }
  }, [accessToken, userId]);

  // Handle search with debouncing
  useEffect(() => {
    const debounceSearch = setTimeout(handleSearch, 300); // Reduced debounce time

    return () => {
      clearTimeout(debounceSearch);
    };
  }, [handleSearch]);

  // Error state
  if (error) {
    return (
      <div className="py-5 px-6 bg-white rounded-lg">
        <p className="text-lg text-gray-700 font-semibold mb-4">
          Connections
        </p>
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 px-6 bg-white rounded-lg">
      <p className="text-lg text-gray-700 font-semibold mb-4">
        Connections
      </p>

      <div className="relative w-full mb-4">
        <CiSearch
          className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600 pointer-events-none"
          size={18}
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search connections by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
          aria-label="Search connections by name"
          disabled={loading}
        />
      </div>

      {loading ? (
        <ConnectionLoading />
      ) : (
        <div className="flex flex-col gap-3 h-full">
          {filteredConnections.length > 0 ? (
            filteredConnections.map(
              (connection: Connection, index: number) => (
                <a
                  key={`${connection.name}-${index}`} // Better key generation
                  href={connection?.profileUrl || '#'}
                  target={
                    connection?.profileUrl ? '_blank' : undefined
                  }
                  rel={
                    connection?.profileUrl
                      ? 'noopener noreferrer'
                      : undefined
                  }
                  className={
                    connection?.profileUrl
                      ? ''
                      : 'pointer-events-none'
                  }
                  aria-label={`View ${connection.name}'s profile`}
                >
                  <div className="bg-white py-4 px-3 flex items-center justify-between shadow-small rounded-xl hover:shadow-medium transition-shadow duration-200">
                    <div className="flex items-center gap-3">
                      {isUrl(connection.profilePic) ? (
                        <Image
                          src={connection.profilePic}
                          alt={`${connection.name}'s profile picture`}
                          width={56}
                          height={56}
                          className="border w-14 h-14 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to default avatar on error
                            (e.target as HTMLImageElement).src =
                              '/images/user_avator/default.png';
                          }}
                        />
                      ) : (
                        <Image
                          src={`/images/user_avator/${connection.profilePic}.png`}
                          alt={`${connection.name}'s profile picture`}
                          width={56}
                          height={56}
                          className="border w-14 h-14 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to default avatar on error
                            (e.target as HTMLImageElement).src =
                              '/images/user_avator/default.png';
                          }}
                        />
                      )}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 truncate">
                          {connection.name}
                        </h3>
                        {connection.bio && (
                          <p className="text-sm text-gray-500 font-medium line-clamp-2">
                            {connection.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    {connection.address && (
                      <p className="hidden xl:block text-sm text-gray-500 font-medium truncate max-w-[200px]">
                        {connection.address}
                      </p>
                    )}
                  </div>
                </a>
              )
            )
          ) : (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <p className="text-gray-500 mb-2">
                  {searchQuery
                    ? 'No connections found matching your search'
                    : 'No connections found'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-500 hover:text-blue-700 text-sm underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Connections;
