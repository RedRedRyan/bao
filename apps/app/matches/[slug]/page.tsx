import { matchLists } from "@/lib/constants";
import MatchDetails from "@/components/MatchDetails";
import Header from "@/components/Header";

export default async function MatchDetailsPage({
                                                   params,
                                               }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const match = matchLists.find((item) => item.slug === slug);

    if (!match) {
        return (
            <div className="bg-black min-h-screen">
                <Header />
                <section className="pt-28 pb-16 container mx-auto px-5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
                        Match not found.
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen">
            <Header />
            <MatchDetails {...match} />
        </div>
    );
}
