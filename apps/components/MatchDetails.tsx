"use client";

import { useMemo, useState, type ReactNode } from "react";
import ReactCountryFlag from "react-country-flag";
import { Clock, X } from "lucide-react";
import {
  buildMatchMarkets,
  type MarketCategory,
  type MarketEventType,
  type MarketOutcome,
  type MarketTeamScope,
  type Match,
  type MatchMarket,
} from "@/lib/constants";

type ActiveCategory = MarketCategory | "all";

interface SelectedBet {
  marketId: string;
  outcomeId: string;
}

interface MatchDetailsProps extends Match {
  totalVolume?: string;
  homeWinProbability?: string;
  drawProbability?: string;
  awayWinProbability?: string;
}

const CATEGORY_TABS: { id: ActiveCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chrono", label: "Next minutes" },
  { id: "side", label: "Team events" },
  { id: "threshold", label: "Totals" },
];

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  chrono: "Next minutes",
  side: "Team events",
  threshold: "Totals",
};

const QUICK_STAKES = ["25", "50", "100"];

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/45">{label}</span>
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
  competition,
  totalVolume,
  homeWinProbability,
  drawProbability,
  awayWinProbability,
  markets,
}: MatchDetailsProps) {
  const [betAmount, setBetAmount] = useState("");
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [selectedBet, setSelectedBet] = useState<SelectedBet | null>(null);

  const matchMarkets = useMemo(
    () =>
      markets?.length
        ? markets
        : buildMatchMarkets({
            homeTeam,
            awayTeam,
          }),
    [awayTeam, homeTeam, markets],
  );

  const activeMarkets =
    activeCategory === "all"
      ? matchMarkets
      : matchMarkets.filter((market) => market.category === activeCategory);

  const selectedMarket = selectedBet
    ? matchMarkets.find((market) => market.id === selectedBet.marketId)
    : undefined;
  const selectedOutcome = selectedMarket?.outcomes.find(
    (outcome) => outcome.id === selectedBet?.outcomeId,
  );

  const stake = Number(betAmount);
  const selectedOdds = Number(selectedOutcome?.odds);
  const hasValidStake =
    betAmount.trim() !== "" && Number.isFinite(stake) && stake > 0;
  const hasValidOdds = Number.isFinite(selectedOdds);
  const projectedReturn =
    hasValidStake && hasValidOdds ? formatMoney(stake * selectedOdds) : "$0.00";
  const potentialProfit =
    hasValidStake && hasValidOdds
      ? formatMoney(stake * selectedOdds - stake)
      : "$0.00";

  return (
    <section className="min-h-screen bg-black pt-24 pb-16 text-white">
      <div className="container mx-auto px-5 2xl:px-0">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="flex min-w-0 flex-col gap-7">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                {competition && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {competition}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <Clock size={14} />
                  {time}
                </span>
                {venue && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {venue}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                  {homeTeam}{" "}
                  <span className="font-light text-white/40">vs</span>{" "}
                  {awayTeam}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                  <TeamBadge code={homeCode} label={homeTeam} />
                  <TeamBadge code={awayCode} label={awayTeam} />
                </div>
              </div>

              {description && (
                <p className="max-w-3xl text-base leading-relaxed text-white/60">
                  {description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatBlock label="Liquidity" value={totalVolume || volume} />
              <StatBlock
                label={`${homeCode} win`}
                value={homeWinProbability || "-"}
                caption={`Odds ${odds.home}`}
              />
              <StatBlock
                label="Draw"
                value={drawProbability || "-"}
                caption={`Odds ${odds.draw}`}
              />
              <StatBlock
                label={`${awayCode} win`}
                value={awayWinProbability || "-"}
                caption={`Odds ${odds.away}`}
              />
            </div>

            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-400">
                    Markets
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Match markets
                  </h2>
                </div>
                <div className="text-sm text-white/45">
                  {matchMarkets.length} open
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {CATEGORY_TABS.map((tab) => {
                  const isActive = activeCategory === tab.id;
                  const count =
                    tab.id === "all"
                      ? matchMarkets.length
                      : matchMarkets.filter(
                          (market) => market.category === tab.id,
                        ).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-yellow-400 bg-yellow-400 text-black"
                          : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isActive ? "bg-black/10" : "bg-white/10"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3">
                {activeMarkets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    selectedBet={selectedBet}
                    onSelect={(outcome) => {
                      const nextSelection = {
                        marketId: market.id,
                        outcomeId: outcome.id,
                      };
                      const isSameSelection =
                        selectedBet?.marketId === nextSelection.marketId &&
                        selectedBet.outcomeId === nextSelection.outcomeId;

                      setSelectedBet(isSameSelection ? null : nextSelection);
                    }}
                  />
                ))}
              </div>
            </section>
          </main>

          <aside className="w-full lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-white/10 bg-gray-900 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                    Betslip
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Single
                  </h2>
                </div>
                {selectedBet && (
                  <button
                    type="button"
                    aria-label="Clear selection"
                    title="Clear selection"
                    onClick={() => setSelectedBet(null)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                {selectedMarket && selectedOutcome ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">
                        {CATEGORY_LABELS[selectedMarket.category]}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-white">
                        {selectedMarket.title}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.06] px-3 py-2">
                      <span className="text-sm text-white/70">
                        {selectedOutcome.label}
                      </span>
                      <span className="font-semibold text-yellow-400">
                        {selectedOutcome.odds}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/45">No active selection</p>
                )}
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <label
                  htmlFor="stake-amount"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40"
                >
                  Stake
                </label>
                <input
                  id="stake-amount"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(event) => setBetAmount(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-3xl font-semibold text-yellow-400 outline-none transition-colors placeholder:text-white/20 focus:border-yellow-400"
                />
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {QUICK_STAKES.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setBetAmount(amount)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
                    >
                      ${amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBetAmount("100")}
                    className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4">
                <DetailRow label="Match">
                  <span className="text-right text-white">
                    {homeTeam} vs {awayTeam}
                  </span>
                </DetailRow>
                <DetailRow label="Date">
                  <span className="text-white">{date || time}</span>
                </DetailRow>
                <DetailRow label="Odds">
                  <span className="font-semibold text-white">
                    {selectedOutcome?.odds || "-"}
                  </span>
                </DetailRow>
                <DetailRow label="Return">
                  <span className="font-semibold text-white">
                    {projectedReturn}
                  </span>
                </DetailRow>
                <DetailRow label="Profit">
                  <span className="text-white">{potentialProfit}</span>
                </DetailRow>
              </div>

              <button
                type="button"
                disabled={!selectedOutcome || !hasValidStake || !hasValidOdds}
                className="mt-5 w-full rounded-lg bg-yellow-400 py-4 text-base font-semibold text-black transition-all hover:bg-yellow-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Place Bet
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function TeamBadge({ code, label }: { code: string; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: "1.2em", height: "1.2em" }}
      />
      <span>{label}</span>
    </span>
  );
}

function StatBlock({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white md:text-3xl">
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-white/40">{caption}</p>}
    </div>
  );
}

function MarketCard({
  market,
  selectedBet,
  onSelect,
}: {
  market: MatchMarket;
  selectedBet: SelectedBet | null;
  onSelect: (outcome: MarketOutcome) => void;
}) {
  const outcomeColumns =
    market.outcomes.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            <span>{CATEGORY_LABELS[market.category]}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>{market.volume}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-6 text-white">
            {market.title}
          </h3>
          <MarketMetaChips market={market} />
        </div>

        <div className={`grid ${outcomeColumns} gap-2 md:w-72`}>
          {market.outcomes.map((outcome) => {
            const isSelected =
              selectedBet?.marketId === market.id &&
              selectedBet.outcomeId === outcome.id;

            return (
              <button
                key={outcome.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(outcome)}
                className={`min-h-14 rounded-lg border px-3 py-2 text-left transition-all ${
                  isSelected
                    ? "border-yellow-400 bg-yellow-400 text-black"
                    : "border-white/10 bg-gray-900 text-white hover:border-yellow-400/70"
                }`}
              >
                <span className="block text-xs font-medium opacity-70">
                  {outcome.label}
                </span>
                <span className="mt-1 block text-lg font-semibold leading-none">
                  {outcome.odds}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function MarketMetaChips({ market }: { market: MatchMarket }) {
  const chips = [
    formatEventType(market.event_type),
    formatScope(market.team_scope),
  ];

  if (market.category === "chrono") {
    chips.push(`${market.time_window} min`);
  }

  if (market.category === "side") {
    chips.push(formatOrdinal(market));
  }

  if (market.category === "threshold") {
    chips.push(`${market.comparison} ${market.threshold_value}`);
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/55"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function formatEventType(eventType: MarketEventType) {
  const labels: Record<MarketEventType, string> = {
    goal: "Goal",
    corner: "Corner",
    card: "Card",
    free_kick: "Free kick",
    substitution: "Substitution",
  };

  return labels[eventType];
}

function formatScope(scope: MarketTeamScope) {
  const labels: Record<MarketTeamScope, string> = {
    home: "Home",
    away: "Away",
    any: "Any team",
  };

  return labels[scope];
}

function formatOrdinal(market: Extract<MatchMarket, { category: "side" }>) {
  if (market.ordinal === "next") {
    return "Next";
  }

  if (market.ordinal === "last") {
    return "Last";
  }

  return market.ordinal_value ? `No. ${market.ordinal_value}` : "Nth";
}

function formatMoney(value: number) {
  return Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
