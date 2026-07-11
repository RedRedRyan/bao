import MatchCard from "@/components/MatchCard";
import { getFixtureMatches } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

const Page = async () => {
  const matches = await getFixtureMatches();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {matches.map((match) => (
        <MatchCard key={match.slug} {...match} />
      ))}
      {matches.length === 0 && (
        <p className="col-span-full text-sm text-white/60">
          No fixtures available.
        </p>
      )}
    </div>
  );
};

export default Page;
