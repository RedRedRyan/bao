import { matchLists } from "@/lib/constants";
import MatchDetails from "@/components/MatchDetails";

export default async function MatchDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>; // ✅ changed from 'id' to 'slug'
}) {
  const { slug } = await params; // ✅ use 'slug'
  const match = matchLists.find((item) => item.slug === slug);

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
