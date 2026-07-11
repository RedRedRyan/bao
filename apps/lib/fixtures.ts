import type { Match } from "@/lib/constants";

export interface FixturesQuery {
  fromDate?: string | null;
  toDate?: string | null;
}

export class FixturesApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FixturesApiError";
    this.status = status;
  }
}

export async function fetchFixturesSnapshot({
  fromDate,
  toDate,
}: FixturesQuery = {}) {
  const upstreamParams = new URLSearchParams();

  if (fromDate) {
    upstreamParams.set("fromDate", fromDate);
  }

  if (toDate) {
    upstreamParams.set("toDate", toDate);
  }

  const query = upstreamParams.toString();
  const txRes = await fetch(
    `https://txline.txodds.com/api/fixtures/snapshot${query ? `?${query}` : ""}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.TXLINE_JWT}`,
        "X-Api-Token": process.env.TXLINE_API_KEY!,
        "Content-Type": "application/json",
      },
    },
  );

  if (!txRes.ok) {
    const text = await txRes.text();
    throw new FixturesApiError(text || "Failed to fetch fixtures", txRes.status);
  }

  return txRes.json() as Promise<unknown>;
}

export async function getFixtureMatches(query?: FixturesQuery) {
  const data = await fetchFixturesSnapshot(query);
  return normalizeFixturesResponse(data);
}

export function normalizeFixturesResponse(data: unknown): Match[] {
  return extractFixtureItems(data).map((fixture, index) =>
    normalizeFixture(fixture, index),
  );
}

type FixtureRecord = Record<string, unknown>;

function normalizeFixture(fixture: FixtureRecord, index: number): Match {
  const homeTeam = getTeamName(fixture, "home");
  const awayTeam = getTeamName(fixture, "away");
  const competition = getString(fixture, ["Competition", "competition"]);
  const startedAt = getString(fixture, [
    "StartTime",
    "startTime",
    "start_time",
    "startsAt",
    "starts_at",
    "kickoff",
    "kickoffTime",
    "fixtureDate",
    "fixture_date",
    "date",
  ]);

  return {
    slug: getFixtureSlug(fixture, homeTeam, awayTeam, index),
    homeTeam,
    homeCode: getTeamCode(fixture, "home"),
    awayTeam,
    awayCode: getTeamCode(fixture, "away"),
    odds: getFixtureOdds(fixture),
    volume: formatVolume(
      getValue(fixture, [
        "volume",
        "totalVolume",
        "total_volume",
        "liquidity",
        "matched",
      ]),
    ),
    time: formatTime(startedAt),
    date: formatDate(startedAt),
    competition,
    venue: getString(fixture, ["venue", "stadium", "ground", "Competition"]),
    description: `${competition || "Fixture"}: ${homeTeam} vs ${awayTeam}`,
  };
}

function extractFixtureItems(data: unknown): FixtureRecord[] {
  const records = findFixtureCollection(data);

  return records
    .map((record) => asRecord(record))
    .filter((record): record is FixtureRecord => record !== null);
}

function findFixtureCollection(data: unknown, depth = 0): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (depth > 3) {
    return [];
  }

  const record = asRecord(data);

  if (!record) {
    return [];
  }

  const collectionKeys = [
    "fixtures",
    "matches",
    "events",
    "items",
    "results",
    "data",
  ];

  for (const key of collectionKeys) {
    const collection = findFixtureCollection(record[key], depth + 1);

    if (collection.length > 0) {
      return collection;
    }
  }

  return [];
}

function getTeamName(fixture: FixtureRecord, side: "home" | "away") {
  const txLineName = getTxLineParticipantName(fixture, side);

  if (txLineName) {
    return txLineName;
  }

  const directName = getString(fixture, [
    `${side}Team`,
    `${side}TeamName`,
    `${side}_team`,
    `${side}_team_name`,
    `${side}Name`,
    `${side}_name`,
  ]);

  if (directName) {
    return directName;
  }

  const team = getTeamRecord(fixture, side);
  return (
    getString(team, ["name", "teamName", "displayName", "shortName"]) ||
    (side === "home" ? "Home" : "Away")
  );
}

function getTeamCode(fixture: FixtureRecord, side: "home" | "away") {
  const directCode = getString(fixture, [
    `${side === "home" ? "Home" : "Away"}Code`,
    `${side === "home" ? "Home" : "Away"}CountryCode`,
    `${side}Code`,
    `${side}CountryCode`,
    `${side}_code`,
    `${side}_country_code`,
  ]);

  const teamCode =
    directCode ||
    getString(getTeamRecord(fixture, side), [
      "countryCode",
      "country_code",
      "isoCode",
      "iso_code",
      "code",
    ]);

  return normalizeCountryCode(
    teamCode || getCountryCodeByTeamName(getTeamName(fixture, side)),
  );
}

function getTeamRecord(fixture: FixtureRecord, side: "home" | "away") {
  const direct =
    asRecord(fixture[side]) ||
    asRecord(fixture[`${side}Team`]) ||
    asRecord(asRecord(fixture.teams)?.[side]);

  if (direct) {
    return direct;
  }

  const participants = [
    fixture.participants,
    fixture.competitors,
    fixture.contestants,
  ]
    .find(Array.isArray)
    ?.map((participant) => asRecord(participant))
    .filter((participant): participant is FixtureRecord => participant !== null);

  return (
    participants?.find((participant) => {
      const role = getString(participant, [
        "role",
        "side",
        "position",
        "qualifier",
        "homeAway",
      ]);

      return role?.toLowerCase() === side;
    }) || null
  );
}

function getFixtureOdds(fixture: FixtureRecord): Match["odds"] {
  const odds =
    asRecord(fixture.odds) ||
    asRecord(fixture.prices) ||
    asRecord(fixture.probabilities) ||
    asRecord(fixture.market);

  return {
    home:
      formatDecimal(
        getValue(odds, ["home", "homeWin", "home_win", "1", "homeOdds"]),
      ) || "-",
    draw:
      formatDecimal(getValue(odds, ["draw", "x", "X", "drawOdds"])) || "-",
    away:
      formatDecimal(
        getValue(odds, ["away", "awayWin", "away_win", "2", "awayOdds"]),
      ) || "-",
  };
}

function getFixtureSlug(
  fixture: FixtureRecord,
  homeTeam: string,
  awayTeam: string,
  index: number,
) {
  const existingSlug = getString(fixture, ["slug"]);

  if (existingSlug) {
    return slugify(existingSlug);
  }

  const id = getString(fixture, [
    "FixtureId",
    "id",
    "fixtureId",
    "fixture_id",
    "eventId",
    "event_id",
  ]);
  const base = slugify(`${homeTeam} vs ${awayTeam}`);

  return id ? `${base}-${slugify(id)}` : `${base}-${index + 1}`;
}

function getTxLineParticipantName(
  fixture: FixtureRecord,
  side: "home" | "away",
) {
  const participant1IsHome = fixture.Participant1IsHome !== false;
  const key =
    side === "home"
      ? participant1IsHome
        ? "Participant1"
        : "Participant2"
      : participant1IsHome
        ? "Participant2"
        : "Participant1";

  return getString(fixture, [key]);
}

function getValue(record: FixtureRecord | null, keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function getString(record: FixtureRecord | null, keys: string[]) {
  const value = getValue(record, keys);

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function asRecord(value: unknown): FixtureRecord | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as FixtureRecord;
  }

  return null;
}

function normalizeCountryCode(code: string | undefined) {
  if (!code) {
    return "UN";
  }

  const normalized = code.toUpperCase();

  if (/^[A-Z]{2}$/.test(normalized) || /^GB-[A-Z]{3}$/.test(normalized)) {
    return normalized;
  }

  return "UN";
}

function formatDecimal(value: unknown) {
  if (typeof value === "number") {
    return value.toFixed(2);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : value.trim();
  }

  return undefined;
}

function formatVolume(value: unknown) {
  if (typeof value === "number") {
    return Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "-";
}

function formatTime(value: string | undefined) {
  if (!value) {
    return "TBD";
  }

  const date = parseFixtureDate(value);

  if (!Number.isNaN(date.getTime())) {
    if (!isToday(date)) {
      return Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        ...(date.getFullYear() !== new Date().getFullYear()
          ? { year: "numeric" }
          : {}),
      }).format(date);
    }

    return Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  return value;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "";
  }

  const date = parseFixtureDate(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return value;
}

function parseFixtureDate(value: string) {
  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    return new Date(
      numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue,
    );
  }

  return new Date(value);
}

function isToday(date: Date) {
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getCountryCodeByTeamName(teamName: string) {
  return COUNTRY_CODES_BY_TEAM[teamName.toLowerCase()];
}

const COUNTRY_CODES_BY_TEAM: Record<string, string> = {
  argentina: "AR",
  australia: "AU",
  belgium: "BE",
  brazil: "BR",
  england: "GB-ENG",
  france: "FR",
  germany: "DE",
  morocco: "MA",
  myanmar: "MM",
  netherlands: "NL",
  norway: "NO",
  portugal: "PT",
  spain: "ES",
  switzerland: "CH",
  usa: "US",
  vietnam: "VN",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
