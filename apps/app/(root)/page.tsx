import MatchCard from "@/components/MatchCard";
import { matchLists } from "@/lib/constants";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <Header />
      <main className="flex-1 container mx-auto px-5 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold text-white font-schibsted-grotesk">
              Live Fixtures
            </h1>
            <p className="text-white/60">
              Select a match to view markets and place your bets on Solana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchLists.map((match) => (
              <MatchCard key={match.id} {...match} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
