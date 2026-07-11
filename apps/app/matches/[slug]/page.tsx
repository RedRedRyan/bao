import MatchDetails from "@/components/MatchDetails";
import { getFixtureMatches } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export default async function MatchDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const matches = await getFixtureMatches();
  const match = matches.find((item) => item.slug === slug);

  if (!match) {
    return (
      <section className="min-h-screen pt-28 pb-16 container mx-auto px-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
          Match not found.
        </div>
      </section>
    );
  }

  return <MatchDetails {...match} />;
}
