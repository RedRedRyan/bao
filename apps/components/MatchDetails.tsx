"use client";

import React, { useState } from "react";
import ReactCountryFlag from "react-country-flag";
import { Clock } from "lucide-react";
import { Match } from "@/lib/constants";

// ── Extend Match with extra fields for the details page ──
interface MatchDetailsProps extends Match {
  totalVolume?: string;
  homeWinProbability?: string;
  drawProbability?: string;
  awayWinProbability?: string;
}

// ── Small helper for detail rows ──
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40">{label}</span>
      {children}
    </div>
  );
}

export default function MatchDetails({
  homeTeam,
  homeCode,
  awayTeam,
  awayCode,
  odds,
  volume,
  time,
  date,
  venue,
  description,
  totalVolume,
  homeWinProbability,
  drawProbability,
  awayWinProbability,
}: MatchDetailsProps) {
  const [betAmount, setBetAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<
    "home" | "draw" | "away" | null
  >(null);

  // ── Derived values for projected returns ──
  const selectedOdds = selectedOutcome ? odds[selectedOutcome] : null;
  const projectedReturn =
    betAmount && selectedOdds && !isNaN(Number(betAmount))
      ? `$${(Number(betAmount) * parseFloat(selectedOdds)).toFixed(2)}`
      : "$0.00";

  return (
    <section className="min-h-screen pt-28 pb-16 container mx-auto px-5 2xl:px-0 bg-black">
      <div className="flex flex-col-reverse lg:flex-row gap-10 lg:gap-8 items-start w-full">
        {/* ─── LEFT PANEL (2/3) ────────────────────────────── */}
        <div className="flex flex-col gap-8 lg:flex-[2] w-full">
          {/* Title row with flags and team names */}
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl md:text-5xl font-schibsted-grotesk font-bold tracking-tight text-white">
              {homeTeam} <span className="text-white/40 font-light">vs</span>{" "}
              {awayTeam}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <ReactCountryFlag
                  countryCode={homeCode}
                  svg
                  style={{ width: "1.2em", height: "1.2em" }}
                />
                <span>{homeCode}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <ReactCountryFlag
                  countryCode={awayCode}
                  svg
                  style={{ width: "1.2em", height: "1.2em" }}
                />
                <span>{awayCode}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <Clock size={14} />
                <span>{time}</span>
              </div>
              {venue && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <span>{venue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-white/60 text-base leading-relaxed max-w-2xl">
              {description}
            </p>
          )}

          {/* ── Stats row (similar to vault stats) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-8">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                Total Volume
              </span>
              <span className="text-3xl md:text-4xl font-schibsted-grotesk font-semibold text-white">
                {totalVolume || volume}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                Home Win
              </span>
              <span className="text-3xl md:text-4xl font-schibsted-grotesk font-semibold text-white">
                {homeWinProbability || "-"}
              </span>
              <span className="text-xs text-white/40">Odds {odds.home}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                Draw
              </span>
              <span className="text-3xl md:text-4xl font-schibsted-grotesk font-semibold text-white">
                {drawProbability || "-"}
              </span>
              <span className="text-xs text-white/40">Odds {odds.draw}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                Away Win
              </span>
              <span className="text-3xl md:text-4xl font-schibsted-grotesk font-semibold text-white">
                {awayWinProbability || "-"}
              </span>
              <span className="text-xs text-white/40">Odds {odds.away}</span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL – Betting slip (1/3) ────────────── */}
        <div className="lg:flex-1 w-full flex flex-col gap-3 lg:sticky lg:top-28">
          {/* ── Bet input card ── */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Place Bet</span>
              <span className="text-sm text-white/60">Odds</span>
            </div>

            {/* Outcome selection buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(["home", "draw", "away"] as const).map((outcome) => (
                <button
                  key={outcome}
                  onClick={() => setSelectedOutcome(outcome)}
                  className={`py-2 rounded-md font-bold text-sm transition-colors ${
                    selectedOutcome === outcome
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {outcome === "home"
                    ? homeCode
                    : outcome === "away"
                      ? awayCode
                      : "Draw"}
                  <br />
                  <span className="text-xs font-normal">{odds[outcome]}</span>
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-1 mt-2">
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="bg-transparent text-4xl font-schibsted-grotesk font-semibold text-green placeholder-white/20 outline-none w-full"
              />
              <div className="flex items-center justify-between text-sm text-white/40">
                <span>${betAmount || "0"}</span>
                <button
                  onClick={() => setBetAmount("100")} // example max
                  className="bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold px-2 py-0.5 rounded"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>

          {/* ── Details card ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 flex flex-col gap-3 text-sm">
            <DetailRow label="Match">
              <span className="text-white">
                {homeTeam} vs {awayTeam}
              </span>
            </DetailRow>
            <DetailRow label="Date">
              <span className="text-white">{date || time}</span>
            </DetailRow>
            <DetailRow label="Selected Odds">
              <span className="text-white">{selectedOdds || "-"}</span>
            </DetailRow>
            <div className="border-t border-white/10 my-1" />
            <DetailRow label="Projected Return">
              <span className="text-white font-semibold">
                {projectedReturn}
              </span>
            </DetailRow>
            <DetailRow label="Potential Profit">
              <span className="text-white">
                {betAmount && selectedOdds
                  ? `$${(Number(betAmount) * parseFloat(selectedOdds) - Number(betAmount)).toFixed(2)}`
                  : "$0.00"}
              </span>
            </DetailRow>
          </div>

          {/* ── CTA Button ── */}
          <button
            disabled={!selectedOutcome || !betAmount || Number(betAmount) <= 0}
            className="w-full rounded-xl bg-blue hover:bg-blue/80 active:scale-[0.98] transition-all text-white font-semibold text-lg py-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Place Bet
          </button>
        </div>
      </div>
    </section>
  );
}
