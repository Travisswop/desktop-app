"use client";
import getAllSmartsitesIcon from "@/components/smartsite/retriveIconImage/getAllSmartsiteIcon";
import getSmallIconImage from "@/components/smartsite/retriveIconImage/getSmallIconImage";
import { tintStyle } from "@/components/util/IconTintStyle";
import isUrl from "@/lib/isUrl";
import { Info, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface MetricCardProps {
  value: number;
  label: string;
  period: string;
}

const MetricCard = ({ value, label, period }: MetricCardProps) => (
  <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-2 mb-2">
      <Info className="w-4 h-4 text-gray-400" />
    </div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <div className="text-sm font-medium text-gray-600">{label}</div>
    <div className="text-xs text-gray-400 mt-1">{period}</div>
  </div>
);

const AnalyticsContent = ({ userData, analyticsData }) => {
  const [selectectedSmartsiteData, setSelectectedSmartsiteData] = useState(
    userData.microsites[0]
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  console.log("selectectedSmartsiteData", selectectedSmartsiteData);

  const metrics = [
    {
      value: analyticsData?.last30DaysMicrositeTaps || 0,
      label: "Page Visit",
      period: "30 Days",
    },
    {
      value: analyticsData?.lifetimeMicrositeTaps || 0,
      label: "Page Visit",
      period: "Life Time",
    },
    {
      value: analyticsData?.last30DaysConnections || 0,
      label: "Connections",
      period: "30 days",
    },
    {
      value: analyticsData?.last30DaysLeads,
      label: "Leads",
      period: "30 days",
    },
  ];

  const handleClickSmartsite = (index: number) => {
    const data = userData.microsites[index];
    setSelectectedSmartsiteData(data);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Section - Analytics */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isRefreshing}
          >
            Refresh
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Smartsite Clicks Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Smartsite Clicks
          </h2>
          <div className="space-y-3">
            {userData &&
              userData.microsites.map((microsite, index: number) => (
                <div
                  key={microsite._id}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer shadow-small hover:shadow-medium"
                  onClick={() => handleClickSmartsite(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      {isUrl(microsite.profilePic) ? (
                        <Image
                          src={microsite.profilePic}
                          alt="user image"
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <Image
                          src={`/images/user_avator/${microsite.profilePic}@3x.png`}
                          alt="user image"
                          width={320}
                          height={320}
                          className="w-full h-full rounded-full"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{microsite.name}</p>
                      <small>{microsite.ens}</small>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-black p-1 w-8 h-8 rounded-full flex items-center justify-center">
                      <p className="text-white">{microsite.totalTap}</p>
                    </div>
                    {/* <button className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                          <span className="text-lg">›</span>
                        </button> */}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Section - User Profile & Social Links */}
      <div className="space-y-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 text-center">
            {selectectedSmartsiteData.name}
          </h2>
          <hr className="-mx-6 mb-4 mt-4" />

          {/* Social Links */}
          <div className="space-y-3">
            {selectectedSmartsiteData.info.socialTop.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={getSmallIconImage(item.name, item.group) as any}
                    alt="icon"
                    style={tintStyle}
                    className="w-5 h-auto"
                    width={1200}
                    height={1200}
                    quality={100}
                  />
                  <span className="text-sm text-gray-700">{item.iconName}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}

            {selectectedSmartsiteData.info.infoBar.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  {isUrl(item.iconName) ? (
                    <div className="relative w-5 h-auto rounded-lg">
                      <Image
                        src={item.iconName}
                        alt="icon"
                        className="rounded-lg object-cover"
                        quality={100}
                        fill
                      />
                    </div>
                  ) : (
                    <div className="w-5 h-auto rounded-lg">
                      <Image
                        src={getAllSmartsitesIcon(item.iconName) as any}
                        alt="icon"
                        className="rounded-lg"
                        quality={100}
                        width={320}
                        height={320}
                      />
                    </div>
                  )}
                  <span className="text-sm text-gray-700">{item.iconName}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}
            {selectectedSmartsiteData.info.socialLarge.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  {isUrl(item.iconName) ? (
                    <div className="relative w-5 h-auto rounded-lg">
                      <Image
                        src={item.iconName}
                        alt="icon"
                        className="rounded-lg object-cover"
                        quality={100}
                        fill
                      />
                    </div>
                  ) : (
                    <div className="w-5 h-auto rounded-lg">
                      <Image
                        src={getAllSmartsitesIcon(item.iconName) as any}
                        alt="icon"
                        className="rounded-lg"
                        quality={100}
                        width={320}
                        height={320}
                      />
                    </div>
                  )}
                  <span className="text-sm text-gray-700">{item.iconName}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}
            {selectectedSmartsiteData.info.blog.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={600}
                    height={400}
                    className="w-10 h-auto rounded-lg"
                  />
                  <span className="text-sm text-gray-700">
                    {item.title.length > 50
                      ? `${item.title.slice(0, 50)}...`
                      : item.title}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}
            {selectectedSmartsiteData.info.audio.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={item.coverPhoto}
                    alt="cover photo"
                    width={120}
                    height={60}
                    className="w-10 h-auto rounded-md object-cover"
                  />
                  <span className="text-sm text-gray-700">
                    {item.name.length > 50
                      ? `${item.name.slice(0, 50)}...`
                      : item.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}
            {selectectedSmartsiteData.info.video.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  {/* <Image
                    src={item.link}
                    alt="cover photo"
                    width={120}
                    height={60}
                    className="w-10 h-auto rounded-md object-cover"
                  /> */}
                  <div className="w-10 h-auto rounded-md"></div>
                  <span className="text-sm text-gray-700">
                    {item.title.length > 50
                      ? `${item.title.slice(0, 50)}...`
                      : item.title}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}
            {selectectedSmartsiteData.info.contact.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b"
              >
                <div className="flex items-center gap-3">
                  {/* <Image
                    src={item.link}
                    alt="cover photo"
                    width={120}
                    height={60}
                    className="w-10 h-auto rounded-md object-cover"
                  /> */}
                  <div className="w-10 h-auto rounded-md"></div>
                  <span className="text-sm text-gray-700">
                    {item.name.length > 50
                      ? `${item.name.slice(0, 50)}...`
                      : item.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {item.totalTap}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsContent;
