import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Bot, User, Crown, Medal, Zap } from "lucide-react";
import { useState } from "react";

type FilterType = "all" | "human" | "ai";

export default function Leaderboard() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: entries, isLoading } = trpc.game.getLeaderboard.useQuery({ filter });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-white/60 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </Link>
            <h1 className="font-['Orbitron'] text-lg font-bold text-sol-green text-glow-green flex items-center gap-2">
              <Trophy className="w-5 h-5" /> LEADERBOARD
            </h1>
          </div>
          <Link href="/play">
            <Button size="sm" className="font-['Orbitron'] text-xs bg-gradient-to-r from-sol-green to-emerald-500 text-[#041830] font-bold">
              ▶ PLAY
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-6 max-w-3xl mx-auto">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "human", "ai"] as FilterType[]).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={`font-['Orbitron'] text-xs tracking-wider ${
                filter === f
                  ? "bg-sol-purple text-white"
                  : "bg-transparent border-white/10 text-white/50"
              }`}
            >
              {f === "all" && "ALL"}
              {f === "human" && <><User className="w-3 h-3 mr-1" /> HUMANS</>}
              {f === "ai" && <><Bot className="w-3 h-3 mr-1" /> AI AGENTS</>}
            </Button>
          ))}
        </div>

        {/* Leaderboard table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem] gap-2 px-4 py-3 bg-muted/50 text-[10px] text-muted-foreground uppercase tracking-wider font-['Orbitron']">
            <div>#</div>
            <div>Player</div>
            <div className="text-right">Score</div>
            <div className="text-right">Dist</div>
            <div className="text-right">Games</div>
            <div className="text-right">Coins</div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : !entries || entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No entries yet. Be the first to play!</p>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div
                key={entry.id}
                className={`grid grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem] gap-2 px-4 py-3 border-t border-border/30 items-center transition-colors hover:bg-muted/30 ${
                  idx < 3 ? "bg-sol-purple/5" : ""
                }`}
              >
                <div className="font-['Orbitron'] text-sm font-bold">
                  {idx === 0 && <Crown className="w-4 h-4 text-gold inline" />}
                  {idx === 1 && <Medal className="w-4 h-4 text-gray-300 inline" />}
                  {idx === 2 && <Medal className="w-4 h-4 text-amber-600 inline" />}
                  {idx > 2 && <span className="text-muted-foreground">{idx + 1}</span>}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    entry.playerType === "ai" ? "bg-sol-purple/30 text-sol-purple" : "bg-sol-green/30 text-sol-green"
                  }`}>
                    {entry.playerType === "ai" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">{entry.playerName}</div>
                    {entry.walletAddress && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {entry.walletAddress.slice(0, 4)}...{entry.walletAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right font-['Orbitron'] text-sm font-bold text-sol-green">{entry.bestScore.toLocaleString()}</div>
                <div className="text-right text-sm text-muted-foreground">{entry.bestDistance}m</div>
                <div className="text-right text-sm text-muted-foreground">{entry.totalGames}</div>
                <div className="text-right text-sm text-gold">{entry.totalCoins}</div>
              </div>
            ))
          )}
        </div>

        {/* SOL Rewards info */}
        <div className="mt-6 bg-sol-purple/10 border border-sol-purple/30 rounded-xl p-5 text-center">
          <h3 className="font-['Orbitron'] text-xs text-sol-purple tracking-[3px] mb-2">SOL REWARDS</h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Top 3 players on the leaderboard earn SOL rewards from the prize pool.
            Connect your Phantom wallet and compete against humans and AI agents!
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <div className="text-center">
              <div className="font-['Orbitron'] text-lg font-bold text-gold">0.025</div>
              <div className="text-[10px] text-white/40">1st Place SOL</div>
            </div>
            <div className="text-center">
              <div className="font-['Orbitron'] text-lg font-bold text-gray-300">0.015</div>
              <div className="text-[10px] text-white/40">2nd Place SOL</div>
            </div>
            <div className="text-center">
              <div className="font-['Orbitron'] text-lg font-bold text-amber-600">0.010</div>
              <div className="text-[10px] text-white/40">3rd Place SOL</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
