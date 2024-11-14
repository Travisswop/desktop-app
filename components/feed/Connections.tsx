"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import React from "react";
import { CiSearch } from "react-icons/ci";
import { getConnectedUserMicrosite } from "@/actions/connectedUserMicrosite";
import isUrl from "@/lib/isUrl";
import ConnectionLoading from "../loading/ConnectionLoading";

const Connections = ({ userId, accessToken }: any) => {
  const [connectionData, setConnectionData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  // console.log("connectionData", connectionData);

  useEffect(() => {
    const fetchConnectionData = async () => {
      setLoading(true);
      const connections = await getConnectedUserMicrosite(userId, accessToken);
      setConnectionData(connections);
      setLoading(false);
    };
    fetchConnectionData();
  }, [accessToken, userId]);

  useEffect(() => {
    const handleSearch = () => {
      // setLoading(true);
      if (!searchQuery) {
        setFilteredConnections(connectionData?.data?.childConnection || []);
        // setLoading(false);
      } else {
        const filtered = connectionData?.data?.childConnection.filter(
          (connection: any) =>
            connection.account.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
        );
        setFilteredConnections(filtered);
        // setLoading(false);
      }
    };

    const debounceSearch = setTimeout(handleSearch, 700); // Adjust the delay as needed

    return () => {
      clearTimeout(debounceSearch);
    };
  }, [connectionData?.data?.childConnection, searchQuery]);

  return (
    <div className="py-5 px-6 bg-white rounded-lg">
      <p className="text-lg text-gray-700 font-semibold mb-4">Connections</p>
      <div className="relative w-full mb-4">
        <CiSearch
          className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
          size={18}
        />
        <input
          type="text"
          placeholder="Search connections by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
        />
      </div>

      {loading ? (
        <ConnectionLoading />
      ) : (
        <div className="flex flex-col gap-3 h-full">
          {filteredConnections.length > 0 ? (
            filteredConnections.map((connection: any, index: number) => (
              <a
                key={index}
                href={
                  connection?.account?.profileUrl
                    ? connection?.account?.profileUrl
                    : "#"
                }
                target="_blank"
              >
                <div className="bg-white py-4 px-3 flex items-center justify-between shadow-small rounded-xl hover:shadow-medium">
                  <div className="flex items-center gap-3">
                    {isUrl(connection.account.profilePic) ? (
                      <Image
                        src={connection?.account?.profilePic}
                        alt="user image"
                        width={100}
                        height={100}
                        className="border w-14 h-14 rounded-full"
                      />
                    ) : (
                      <Image
                        src={`/images/user_avator/${connection?.account?.profilePic}.png`}
                        alt="user image"
                        width={100}
                        height={100}
                        className="border w-14 h-14 rounded-full"
                      />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-bold">{connection?.account?.name}</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {connection?.account?.bio}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    {connection?.address}
                  </p>
                </div>
              </a>
            ))
          ) : (
            <div className="flex justify-center items-center">
              <p className="text-center text-gray-500">No connections found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Connections;
