export const NAV_ITEMS = [
    { href: "/", label: "Dashboard" },
    { href: "/search", label: "Search" },
    // { href: '/watchlist', label: 'Watchlist' },
];
// constants/matches.ts

export type MarketEventType =
    | "goal"
    | "corner"
    | "card"
    | "free_kick"
    | "substitution";

export type MarketTeamScope = "home" | "away" | "any";
export type MarketOrdinal = "next" | "nth" | "last";
export type MarketComparison = ">" | "≥" | "<";
export type MarketCategory = "chrono" | "side" | "threshold";

export interface MarketOutcome {
    id: string;
    label: string;
    odds: string;
}

interface BaseMatchMarket {
    id: string;
    title: string;
    category: MarketCategory;
    event_type: MarketEventType;
    team_scope: MarketTeamScope;
    volume: string;
    outcomes: MarketOutcome[];
}

export interface ChronoMarket extends BaseMatchMarket {
    category: "chrono";
    time_window: number;
}

export interface SideMarket extends BaseMatchMarket {
    category: "side";
    team_scope: Exclude<MarketTeamScope, "any">;
    ordinal: MarketOrdinal;
    ordinal_value?: number;
}

export interface ThresholdMarket extends BaseMatchMarket {
    category: "threshold";
    threshold_value: number;
    comparison: MarketComparison;
}

export type MatchMarket = ChronoMarket | SideMarket | ThresholdMarket;

export interface Match {
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
    date: string;
    competition?: string;
    venue?: string;
    description?: string;
    totalVolume?: string;
    homeWinProbability?: string;
    drawProbability?: string;
    awayWinProbability?: string;
    markets?: MatchMarket[];
}

export function buildMatchMarkets(
    match: Pick<Match, "homeTeam" | "awayTeam">,
): MatchMarket[] {
    return [
        {
            id: "chrono-card-any-5",
            title: "Yellow card in next 5 minutes?",
            category: "chrono",
            event_type: "card",
            time_window: 5,
            team_scope: "any",
            volume: "$18.4K",
            outcomes: yesNoOutcomes("3.10", "1.31"),
        },
        {
            id: "chrono-goal-any-10",
            title: "Goal scored in next 10 minutes?",
            category: "chrono",
            event_type: "goal",
            time_window: 10,
            team_scope: "any",
            volume: "$42.7K",
            outcomes: yesNoOutcomes("2.45", "1.54"),
        },
        {
            id: "chrono-corner-any-3",
            title: "Corner awarded in next 3 minutes?",
            category: "chrono",
            event_type: "corner",
            time_window: 3,
            team_scope: "any",
            volume: "$12.9K",
            outcomes: yesNoOutcomes("2.25", "1.62"),
        },
        {
            id: "chrono-free-kick-any-2",
            title: "Free kick awarded in next 2 minutes?",
            category: "chrono",
            event_type: "free_kick",
            time_window: 2,
            team_scope: "any",
            volume: "$9.8K",
            outcomes: yesNoOutcomes("1.74", "2.02"),
        },
        {
            id: "side-home-next-goal",
            title: `${match.homeTeam} to score next goal?`,
            category: "side",
            event_type: "goal",
            team_scope: "home",
            ordinal: "next",
            volume: "$36.2K",
            outcomes: yesNoOutcomes("2.05", "1.78"),
        },
        {
            id: "side-away-next-card",
            title: `${match.awayTeam} to receive next yellow card?`,
            category: "side",
            event_type: "card",
            team_scope: "away",
            ordinal: "next",
            volume: "$15.6K",
            outcomes: yesNoOutcomes("2.20", "1.64"),
        },
        {
            id: "side-home-next-corner",
            title: `${match.homeTeam} to win next corner?`,
            category: "side",
            event_type: "corner",
            team_scope: "home",
            ordinal: "next",
            volume: "$22.1K",
            outcomes: yesNoOutcomes("1.92", "1.88"),
        },
        {
            id: "side-away-next-substitution",
            title: `${match.awayTeam} to make next substitution?`,
            category: "side",
            event_type: "substitution",
            team_scope: "away",
            ordinal: "next",
            volume: "$7.4K",
            outcomes: yesNoOutcomes("2.35", "1.57"),
        },
        {
            id: "threshold-goals-gt-3",
            title: "Total goals greater than 3?",
            category: "threshold",
            event_type: "goal",
            team_scope: "any",
            threshold_value: 3,
            comparison: ">",
            volume: "$51.3K",
            outcomes: yesNoOutcomes("2.70", "1.45"),
        },
        {
            id: "threshold-cards-gt-5",
            title: "Yellow cards greater than 5?",
            category: "threshold",
            event_type: "card",
            team_scope: "any",
            threshold_value: 5,
            comparison: ">",
            volume: "$19.5K",
            outcomes: yesNoOutcomes("1.86", "1.94"),
        },
        {
            id: "threshold-corners-gt-10",
            title: "Corners greater than 10?",
            category: "threshold",
            event_type: "corner",
            team_scope: "any",
            threshold_value: 10,
            comparison: ">",
            volume: "$28.6K",
            outcomes: yesNoOutcomes("2.12", "1.72"),
        },
    ];
}

function yesNoOutcomes(yesOdds: string, noOdds: string): MarketOutcome[] {
    return [
        { id: "yes", label: "Yes", odds: yesOdds },
        { id: "no", label: "No", odds: noOdds },
    ];
}

export const matchLists: Match[] = [
    {
        slug: "france-vs-morocco",
        homeTeam: "France",
        homeCode: "FR",
        awayTeam: "Morocco",
        awayCode: "MA",
        odds: { home: "1.85", draw: "3.20", away: "4.50" },
        volume: "2.4M",
        time: "20:00",
        date: "2026-07-08",
        venue: "Stade de France",
        description: "World Cup semi-final clash between France and Morocco.",
        totalVolume: "$2.4M",
        homeWinProbability: "52%",
        drawProbability: "28%",
        awayWinProbability: "20%",
    },
    {
        slug: "argentina-vs-brazil",
        homeTeam: "Argentina",
        homeCode: "AR",
        awayTeam: "Brazil",
        awayCode: "BR",
        odds: { home: "2.10", draw: "3.00", away: "3.80" },
        volume: "3.1M",
        time: "18:00",
        date: "2026-07-06",
        venue: "Estadio Monumental",
        description: "South American giants clash in the quarter-finals.",
        totalVolume: "$3.1M",
        homeWinProbability: "45%",
        drawProbability: "30%",
        awayWinProbability: "25%",
    },
    {
        slug: "england-vs-germany",
        homeTeam: "England",
        homeCode: "GB-ENG",
        awayTeam: "Germany",
        awayCode: "DE",
        odds: { home: "2.30", draw: "3.10", away: "3.20" },
        volume: "2.8M",
        time: "21:00",
        date: "2026-07-05",
        venue: "Wembley Stadium",
        description: "Classic European rivalry in the round of 16.",
        totalVolume: "$2.8M",
        homeWinProbability: "40%",
        drawProbability: "32%",
        awayWinProbability: "28%",
    },
    {
        slug: "spain-vs-portugal",
        homeTeam: "Spain",
        homeCode: "ES",
        awayTeam: "Portugal",
        awayCode: "PT",
        odds: { home: "1.95", draw: "3.25", away: "4.00" },
        volume: "1.9M",
        time: "17:00",
        date: "2026-07-04",
        venue: "Estadio Santiago Bernabéu",
        description: "Iberian derby in the group stage.",
        totalVolume: "$1.9M",
        homeWinProbability: "48%",
        drawProbability: "27%",
        awayWinProbability: "25%",
    },
    {
        slug: "netherlands-vs-belgium",
        homeTeam: "Netherlands",
        homeCode: "NL",
        awayTeam: "Belgium",
        awayCode: "BE",
        odds: { home: "2.05", draw: "3.30", away: "3.60" },
        volume: "1.5M",
        time: "15:00",
        date: "2026-07-03",
        venue: "Johan Cruyff Arena",
        description: "Benelux showdown in the group stage.",
        totalVolume: "$1.5M",
        homeWinProbability: "44%",
        drawProbability: "29%",
        awayWinProbability: "27%",
    },
    {
        slug: "usa-vs-mexico",
        homeTeam: "USA",
        homeCode: "US",
        awayTeam: "Mexico",
        awayCode: "MX",
        odds: { home: "2.40", draw: "3.00", away: "3.10" },
        volume: "2.2M",
        time: "22:00",
        date: "2026-07-02",
        venue: "SoFi Stadium",
        description: "North American rivalry in the group stage.",
        totalVolume: "$2.2M",
        homeWinProbability: "38%",
        drawProbability: "32%",
        awayWinProbability: "30%",
    },
    // Add more as needed
];
