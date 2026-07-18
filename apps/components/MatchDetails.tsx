"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactCountryFlag from "react-country-flag";
import { Clock, Loader2 } from "lucide-react";
import { Match } from "@/lib/constants";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../../oracle/idl/flashBaoIdl.json";

// ── Extend Match with extra fields for the details page ──
interface MatchDetailsProps extends Match {
    totalVolume?: string;
    homeWinProbability?: string;
    drawProbability?: string;
    awayWinProbability?: string;
}

interface BackendMarket {
    _id: string;
    marketId: string; // hex string
    question: string;
    outcomes: { index: number; label: string }[];
    status: string;
}

// ── Small helper for detail rows ──
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-white/40">{label}</span>
            {children}
        </div>
    );
}

export default function MatchDetails({
                                         id: fixtureId,
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
    const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number | null>(null);
    const [markets, setMarkets] = useState<BackendMarket[]>([]);
    const [selectedMarket, setSelectedMarket] = useState<BackendMarket | null>(null);
    const [loading, setLoading] = useState(true);
    const [betting, setBetting] = useState(false);

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const program = useMemo(() => {
        const provider = new AnchorProvider(connection, (window as any).solana, AnchorProvider.defaultOptions());
        return new Program(idl as any, provider);
    }, [connection]);

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
                const response = await fetch(`${baseUrl}/api/markets?fixtureId=${fixtureId}`);
                const data = await response.json();
                setMarkets(data);
                if (data.length > 0) {
                    setSelectedMarket(data[0]);
                }
            } catch (error) {
                console.error("Failed to fetch markets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMarkets();
    }, [fixtureId]);

    const handlePlaceBet = async () => {
        if (!publicKey || !selectedMarket || selectedOutcomeIndex === null || !betAmount) return;

        setBetting(true);
        try {
            const amountBN = new BN(parseFloat(betAmount) * web3.LAMPORTS_PER_SOL);
            const marketIdBuffer = Buffer.from(selectedMarket.marketId, 'hex');
            
            // Derive PDAs
            const [configPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                program.programId
            );
            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), marketIdBuffer],
                program.programId
            );
            const [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), marketPda.toBuffer()],
                program.programId
            );

            const outcomeBuffer = Buffer.alloc(2);
            outcomeBuffer.writeUInt16LE(selectedOutcomeIndex);
            const [betPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bet"), marketPda.toBuffer(), publicKey.toBuffer(), outcomeBuffer],
                program.programId
            );

            const tx = await program.methods
                .placeBet(amountBN, selectedOutcomeIndex)
                .accounts({
                    bettor: publicKey,
                    config: configPda,
                    market: marketPda,
                    bet: betPda,
                    vault: vaultPda,
                    systemProgram: web3.SystemProgram.programId,
                } as any)
                .transaction();

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, "processed");
            alert(`Bet placed successfully! Signature: ${signature}`);
        } catch (error) {
            console.error("Betting failed:", error);
            alert("Betting failed. Check console for details.");
        } finally {
            setBetting(false);
        }
    };

    const selectedOutcomeLabel = selectedMarket?.outcomes.find(o => o.index === selectedOutcomeIndex)?.label;
    const projectedReturn =
        betAmount && !isNaN(Number(betAmount))
            ? `$${(Number(betAmount) * 2.0).toFixed(2)}` // Simplified return for UI
            : "$0.00";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue animate-spin" />
            </div>
        );
    }

    return (
        <section className="min-h-screen pt-28 pb-16 container mx-auto px-5 2xl:px-0 bg-black">
            <div className="flex flex-col-reverse lg:flex-row gap-10 lg:gap-8 items-start w-full">

                {/* ─── LEFT PANEL (2/3) ────────────────────────────── */}
                <div className="flex flex-col gap-8 lg:flex-[2] w-full">

                    {/* Title row with flags and team names */}
                    <div className="flex flex-col gap-3">
                        <h1 className="text-4xl md:text-5xl font-schibsted-grotesk font-bold tracking-tight text-white">
                            {homeTeam} <span className="text-white/40 font-light">vs</span> {awayTeam}
                        </h1>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                                <ReactCountryFlag countryCode={homeCode} svg style={{ width: "1.2em", height: "1.2em" }} />
                                <span>{homeCode}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                                <ReactCountryFlag countryCode={awayCode} svg style={{ width: "1.2em", height: "1.2em" }} />
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

                    {/* Market Selection */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-white">Available Markets</h2>
                        <div className="flex flex-wrap gap-2">
                            {markets.map((m) => (
                                <button
                                    key={m._id}
                                    onClick={() => {
                                        setSelectedMarket(m);
                                        setSelectedOutcomeIndex(null);
                                    }}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                        selectedMarket?._id === m._id
                                            ? "bg-blue text-white"
                                            : "bg-white/5 text-white/60 hover:bg-white/10"
                                    }`}
                                >
                                    {m.question}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 pt-8">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-white/40 uppercase tracking-widest">Total Volume</span>
                            <span className="text-3xl md:text-4xl font-schibsted-grotesk font-semibold text-white">
                                {totalVolume || volume}
                            </span>
                        </div>
                        {/* Probability stats could be updated based on real market data if available */}
                    </div>
                </div>

                {/* ─── RIGHT PANEL – Betting slip (1/3) ────────────── */}
                <div className="lg:flex-1 w-full flex flex-col gap-3 lg:sticky lg:top-28">

                    {/* ── Bet input card ── */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/60">Place Bet</span>
                            <span className="text-sm text-white/60">Select Outcome</span>
                        </div>

                        {/* Outcome selection buttons */}
                        <div className="grid grid-cols-1 gap-2">
                            {selectedMarket?.outcomes.map((outcome) => (
                                <button
                                    key={outcome.index}
                                    onClick={() => setSelectedOutcomeIndex(outcome.index)}
                                    className={`py-3 px-4 rounded-xl font-bold text-sm text-left transition-colors ${
                                        selectedOutcomeIndex === outcome.index
                                            ? "bg-blue text-white"
                                            : "bg-white/10 text-white/60 hover:bg-white/20"
                                    }`}
                                >
                                    {outcome.label}
                                </button>
                            ))}
                        </div>

                        {/* Amount input */}
                        <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    placeholder="0.00"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(e.target.value)}
                                    className="bg-transparent text-4xl font-schibsted-grotesk font-semibold text-white placeholder-white/20 outline-none w-full"
                                />
                                <span className="text-2xl font-bold text-blue">SOL</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/40">
                                <span>≈ ${betAmount ? (Number(betAmount) * 150).toFixed(2) : "0.00"}</span>
                                <button
                                    onClick={() => setBetAmount("1")}
                                    className="bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold px-2 py-0.5 rounded"
                                >
                                    1 SOL
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Details card ── */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 flex flex-col gap-3 text-sm">
                        <DetailRow label="Match">
                            <span className="text-white">{homeTeam} vs {awayTeam}</span>
                        </DetailRow>
                        <DetailRow label="Market">
                            <span className="text-white">{selectedMarket?.question || "-"}</span>
                        </DetailRow>
                        <DetailRow label="Selected">
                            <span className="text-white">{selectedOutcomeLabel || "-"}</span>
                        </DetailRow>
                        <div className="border-t border-white/10 my-1" />
                        <DetailRow label="Projected Return">
                            <span className="text-white font-semibold">{projectedReturn}</span>
                        </DetailRow>
                    </div>

                    {/* ── CTA Button ── */}
                    <button
                        onClick={handlePlaceBet}
                        disabled={!publicKey || !selectedOutcomeIndex === null || !betAmount || betting}
                        className="w-full rounded-xl bg-blue hover:bg-blue/80 active:scale-[0.98] transition-all text-white font-semibold text-lg py-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {betting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Placing Bet...
                            </>
                        ) : !publicKey ? (
                            "Connect Wallet"
                        ) : (
                            "Place Bet"
                        )}
                    </button>
                </div>
            </div>
        </section>
    );
}
