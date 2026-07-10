"use client";
import React from "react";
import ReactCountryFlag from "react-country-flag";
import { Clock } from "lucide-react";
import Link from "next/link";

interface MatchCardProps {
  slug: string;
  homeTeam: string;
  homeCode: string;
  awayTeam: string;
  awayCode: string;
  odds: {
    home: string;
    draw: string;
    away: string;
  };
  volume: string;
  time: string;
}

const MatchCard: React.FC<MatchCardProps> = ({
  slug,
  homeTeam,
  homeCode,
  awayTeam,
  awayCode,
  odds,
  volume,
  time,
}) => {
  return (
    <Link
      href={`/matches/${slug}`}
      className="block transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="bg-gray-900 text-white rounded-lg p-4 w-full max-w-md cursor-pointer border border-transparent hover:border-white/20">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <Clock size={14} />
            {time}
          </span>
          <span className="text-sm text-gray-400">Vol: {volume}</span>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ReactCountryFlag
              countryCode={homeCode}
              svg
              style={{ width: "2em", height: "2em" }}
            />
            <span className="font-semibold">{homeTeam}</span>
          </div>
          <div className="flex items-center gap-2">
            <ReactCountryFlag
              countryCode={awayCode}
              svg
              style={{ width: "2em", height: "2em" }}
            />
            <span className="font-semibold">{awayTeam}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-600 rounded-md py-2 font-bold">
            {homeCode} {odds.home}
          </div>
          <div className="bg-gray-600 rounded-md py-2 font-bold">
            DRAW {odds.draw}
          </div>
          <div className="bg-red-600 rounded-md py-2 font-bold">
            {awayCode} {odds.away}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MatchCard;
