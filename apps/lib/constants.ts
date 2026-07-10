export const NAV_ITEMS = [
    { href: "/", label: "Dashboard" },
    { href: "/search", label: "Search" },
    // { href: '/watchlist', label: 'Watchlist' },
];
// constants/matches.ts

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
    venue?: string;
    description?: string;
    totalVolume?: string;
    homeWinProbability?: string;
    drawProbability?: string;
    awayWinProbability?: string;
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