import React from "react";
import { CiSearch } from "react-icons/ci";

const SearchSwopId = () => {
  return (
    <div className="relative w-full">
      <CiSearch
        className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
        size={18}
      />
      <input
        type="text"
        placeholder={`Search Swop ID...`}
        className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
      />
    </div>
  );
};

export default SearchSwopId;
