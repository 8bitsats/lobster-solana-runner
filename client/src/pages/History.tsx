import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, History as HistoryIcon, Bot, User, Trophy, XCircle, Clock } from "lucide-react";

export default function History() {
  const { user } = useAuth();

  const { data: sessions, isLoading } = trpc.game.getHistory.useQuery(undefined, {
    enabled: !!user,
  });

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
            <h1 className="font-['Orbitron'] text-lg font-bold text-sol-purple flex items-center gap-2">
              <HistoryIcon className="w-5 h-5" /> MATCH HISTORY
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
        {!user ? (
          <div className="text-center py-12">
            <HistoryIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-4">Sign in to view your match history</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading history...</div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center py-12">
            <HistoryIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-4">No games played yet</p>
            <Link href="/play">
              <Button className="font-['Orbitron'] text-xs bg-gradient-to-r from-sol-green to-emerald-500 text-[#041830] font-bold">
                Play Your First Game
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Outcome icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  session.outcome === "win"
                    ? "bg-sol-green/20 text-sol-green"
                    : "bg-destructive/20 text-destructive"
                }`}>
                  {session.outcome === "win" ? <Trophy className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-['Orbitron'] text-sm font-bold text-foreground">
                      {session.score.toLocaleString()} pts
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      session.playerType === "ai"
                        ? "bg-sol-purple/20 text-sol-purple"
                        : "bg-sol-green/20 text-sol-green"
                    }`}>
                      {session.playerType === "ai" ? "AI" : "HUMAN"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      session.outcome === "win" ? "bg-sol-green/20 text-sol-green" : "bg-destructive/20 text-destructive"
                    }`}>
                      {session.outcome.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{session.distance}m</span>
                    <span>{session.coinsCollected} coins</span>
                    <span>{(session.survivalTimeMs / 1000).toFixed(1)}s</span>
                    {session.solEarned && parseFloat(session.solEarned) > 0 && (
                      <span className="text-sol-green">+{parseFloat(session.solEarned).toFixed(4)} SOL</span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
