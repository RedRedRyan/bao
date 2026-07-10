import MatchCard from "@/components/MatchCard";
import React from "react";
import { matchLists } from "@/lib/constants";

const page = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {matchLists.map((match) => (
        <MatchCard key={match.slug} {...match} />
      ))}
    </div>
  );
};

export default page;
