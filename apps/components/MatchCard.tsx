"use client";

import React from "react";
import ReactCountryFlag from "react-country-flag";
import { Clock } from "lucide-react";
import Link from "next/link";

interface MatchCardProps {
    slug: string; // used for navigation
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
        <Link href={`/matches/${slug}`} className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="bg-white/5 backdrop-blur-md text-white rounded-2xl p-6 w-full cursor-pointer border border-white/10 hover:border-white/20 transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
          <span className="text-xs text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={14} />
              {time}
          </span>
                    <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Vol: {volume}</span>
                </div>

                {/* Teams */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ReactCountryFlag
                                countryCode={homeCode}
                                svg
                                style={{ width: "1.5em", height: "1.5em", borderRadius: "50%" }}
                            />
                            <span className="text-lg font-bold font-schibsted-grotesk">{homeTeam}</span>
                        </div>
                        <span className="text-white/40 font-mono">{odds.home}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ReactCountryFlag
                                countryCode={awayCode}
                                svg
                                style={{ width: "1.5em", height: "1.5em", borderRadius: "50%" }}
                            />
                            <span className="text-lg font-bold font-schibsted-grotesk">{awayTeam}</span>
                        </div>
                        <span className="text-white/40 font-mono">{odds.away}</span>
                    </div>
                </div>

                {/* Quick Bet Button */}
                <div className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-center hover:bg-white/20 transition-colors">
                    View Markets
                </div>
            </div>
        </Link>
    );
};

export default MatchCard;
