import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Users, Bot, Zap, Trophy, Clock, Play, X, Check, ArrowLeft, Crown, Shield, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";

type MatchType = "human_vs_human" | "agent_vs_agent" | "human_vs_agent";
type TabType = "lobby" | "active" | "history";

function MatchTypeBadge({ type }: { type: MatchType }) {
  const config = {
    human_vs_human: { label: "Human vs Human", icon: Users, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    agent_vs_agent: { label: "Agent vs Agent", icon: Bot, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    human_vs_agent: { label: "Human vs Agent", icon: Swords, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  }[type];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.color} text-[10px] font-mono`}>
      <Icon className="w-3 h-3 mr-1" /> {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    waiting: { label: "Waiting", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    ready: { label: "Ready", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    playing: { label: "In Progress", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    finished: { label: "Finished", color: "bg-muted text-muted-foreground border-border/30" },
    cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[status] || config.waiting;
  return <Badge variant="outline" className={`${c.color} text-[10px] font-mono`}>{c.label}</Badge>;
}

function MatchCard({ match, userId, onJoin, onCancel, onSimulate }: {
  match: any;
  userId?: number;
  onJoin?: (matchId: number) => void;
  onCancel?: (matchId: number) => void;
  onSimulate?: (matchId: number) => void;
}) {
  const isPlayer1 = match.player1UserId === userId;
  const isPlayer2 = match.player2UserId === userId;
  const isMyMatch = isPlayer1 || isPlayer2;
  const canJoin = match.status === "waiting" && !isMyMatch && match.matchType === "human_vs_human";
  const canSimulate = match.status === "waiting" && match.matchType === "agent_vs_agent";
  const isFinished = match.status === "finished";

  return (
    <Card className="bg-card/40 border-border/30 hover:border-primary/30 transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MatchTypeBadge type={match.matchType} />
            <StatusBadge status={match.status} />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">#{match.id}</span>
        </div>

        {/* Players */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-3">
          {/* Player 1 */}
          <div className="text-center">
            <div className={`text-xs font-bold ${isFinished && match.winnerType === "player1" ? "text-sol-green" : "text-foreground"}`}>
              {isFinished && match.winnerType === "player1" && <Crown className="w-3 h-3 inline mr-1 text-gold" />}
              {match.player1Name || "???"}
            </div>
            {match.player1WalletAddress && (
              <div className="text-[9px] text-muted-foreground font-mono">
                {match.player1WalletAddress.slice(0, 4)}...{match.player1WalletAddress.slice(-4)}
              </div>
            )}
            {isFinished && (
              <div className="text-xs font-mono font-bold text-sol-green mt-1">{match.player1Score.toLocaleString()}</div>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center">
            <Swords className="w-5 h-5 text-primary" />
            <span className="text-[9px] text-muted-foreground font-mono">VS</span>
          </div>

          {/* Player 2 */}
          <div className="text-center">
            {match.player2Name ? (
              <>
                <div className={`text-xs font-bold ${isFinished && match.winnerType === "player2" ? "text-sol-green" : "text-foreground"}`}>
                  {isFinished && match.winnerType === "player2" && <Crown className="w-3 h-3 inline mr-1 text-gold" />}
                  {match.player2Name}
                </div>
                {match.player2WalletAddress && (
                  <div className="text-[9px] text-muted-foreground font-mono">
                    {match.player2WalletAddress.slice(0, 4)}...{match.player2WalletAddress.slice(-4)}
                  </div>
                )}
                {isFinished && (
                  <div className="text-xs font-mono font-bold text-sol-green mt-1">{match.player2Score.toLocaleString()}</div>
                )}
              </>
            ) : (
              <div className="text-xs text-muted-foreground italic">Waiting for opponent...</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {canJoin && onJoin && (
            <Button size="sm" onClick={() => onJoin(match.id)} className="text-xs font-mono bg-sol-green text-[#041830] hover:brightness-110">
              <Play className="w-3 h-3 mr-1" /> Join
            </Button>
          )}
          {canSimulate && onSimulate && (
            <Button size="sm" onClick={() => onSimulate(match.id)} className="text-xs font-mono bg-sol-purple text-white hover:brightness-110">
              <Bot className="w-3 h-3 mr-1" /> Auto-Match & Simulate
            </Button>
          )}
          {isMyMatch && match.status === "waiting" && onCancel && (
            <Button size="sm" variant="outline" onClick={() => onCancel(match.id)} className="text-xs font-mono border-red-500/30 text-red-400 hover:bg-red-500/10">
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          )}
          {isFinished && match.winnerType === "draw" && (
            <Badge variant="outline" className="bg-muted/20 text-muted-foreground border-border/30 text-[10px]">Draw</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Arena() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<TabType>("lobby");
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchType>("human_vs_human");
  const [creating, setCreating] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: waitingMatches, isLoading: loadingWaiting } = trpc.arena.waiting.useQuery(
    { matchType: matchTypeFilter },
    { refetchInterval: 5000 }
  );
  const { data: activeMatches, isLoading: loadingActive } = trpc.arena.active.useQuery(
    undefined,
    { refetchInterval: 5000, enabled: tab === "active" }
  );
  const { data: recentMatches, isLoading: loadingRecent } = trpc.arena.recent.useQuery(
    undefined,
    { enabled: tab === "history" }
  );
  const { data: agents } = trpc.agents.list.useQuery();

  // Mutations
  const createMatch = trpc.arena.create.useMutation({
    onSuccess: () => {
      utils.arena.waiting.invalidate();
      utils.arena.active.invalidate();
      setCreating(false);
    },
  });
  const createAgentMatch = trpc.arena.createAgentMatch.useMutation({
    onSuccess: () => {
      utils.arena.waiting.invalidate();
      utils.arena.active.invalidate();
    },
  });
  const joinMatch = trpc.arena.join.useMutation({
    onSuccess: () => {
      utils.arena.waiting.invalidate();
      utils.arena.active.invalidate();
    },
  });
  const joinAsAgent = trpc.arena.joinAsAgent.useMutation();
  const simulateMatch = trpc.arena.simulateAgentMatch.useMutation({
    onSuccess: () => {
      utils.arena.waiting.invalidate();
      utils.arena.active.invalidate();
      utils.arena.recent.invalidate();
    },
  });
  const cancelMatch = trpc.arena.cancel.useMutation({
    onSuccess: () => {
      utils.arena.waiting.invalidate();
      utils.arena.active.invalidate();
    },
  });

  const handleCreateHumanMatch = () => {
    if (!isAuthenticated) { window.location.href = "/"; return; }
    createMatch.mutate({ matchType: "human_vs_human" });
  };

  const handleCreateAgentMatch = () => {
    if (!agents || agents.length === 0) return;
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    createAgentMatch.mutate({ agent1Id: randomAgent.id });
  };

  const handleJoin = (matchId: number) => {
    if (!isAuthenticated) { window.location.href = "/"; return; }
    joinMatch.mutate({ matchId });
  };

  const handleSimulate = async (matchId: number) => {
    // Pick a random agent to join as player 2
    if (!agents || agents.length < 2) return;
    const match = waitingMatches?.find((m: any) => m.id === matchId);
    if (!match) return;
    const availableAgents = agents.filter((a: any) => a.id !== match.player1AgentId);
    const agent2 = availableAgents[Math.floor(Math.random() * availableAgents.length)];
    await joinAsAgent.mutateAsync({ matchId, agentId: agent2.id });
    await simulateMatch.mutateAsync({ matchId });
    utils.arena.waiting.invalidate();
    utils.arena.active.invalidate();
    utils.arena.recent.invalidate();
  };

  const handleCancel = (matchId: number) => {
    cancelMatch.mutate({ matchId });
  };

  const displayMatches = tab === "lobby" ? (waitingMatches || [])
    : tab === "active" ? (activeMatches || [])
    : (recentMatches || []);

  const isLoading = tab === "lobby" ? loadingWaiting : tab === "active" ? loadingActive : loadingRecent;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold font-mono text-primary flex items-center gap-2">
              🦞 <span className="hidden sm:inline">LOBSTER RUNNER</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-semibold flex items-center gap-1.5">
              <Swords className="w-4 h-4" /> Arena
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/play">
              <Button variant="outline" size="sm">Play Solo</Button>
            </Link>
            <Link href="/tokens">
              <Button variant="outline" size="sm">Tokens</Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" size="sm">
                <Trophy className="w-3 h-3 mr-1" /> Board
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
              <Swords className="w-6 h-6 text-primary" />
              Multiplayer Arena
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create or join matches — humans vs humans, agents vs agents
            </p>
          </div>
        </div>

        {/* Create Match Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <Card className="bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer" onClick={handleCreateHumanMatch}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">Human vs Human</div>
                <div className="text-xs text-muted-foreground">Challenge another player</div>
              </div>
              <Play className="w-4 h-4 text-blue-400" />
            </CardContent>
          </Card>

          <Card className="bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer" onClick={handleCreateAgentMatch}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">Agent vs Agent</div>
                <div className="text-xs text-muted-foreground">Watch AI agents compete</div>
              </div>
              <Play className="w-4 h-4 text-purple-400" />
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer" onClick={() => {
            if (!isAuthenticated) { window.location.href = "/"; return; }
            createMatch.mutate({ matchType: "human_vs_agent" });
          }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Swords className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">Human vs Agent</div>
                <div className="text-xs text-muted-foreground">Test your skills against AI</div>
              </div>
              <Play className="w-4 h-4 text-amber-400" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-card/40 border border-border/30 rounded-lg p-1 w-fit">
          {([
            { key: "lobby", label: "Open Lobbies", icon: Clock },
            { key: "active", label: "Active Matches", icon: Play },
            { key: "history", label: "Match History", icon: Trophy },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Match Type Filter (for lobby tab) */}
        {tab === "lobby" && (
          <div className="flex items-center gap-1 mb-4 bg-card/40 border border-border/30 rounded-lg p-1 w-fit">
            {([
              { key: "human_vs_human" as MatchType, label: "Human vs Human" },
              { key: "agent_vs_agent" as MatchType, label: "Agent vs Agent" },
              { key: "human_vs_agent" as MatchType, label: "Human vs Agent" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMatchTypeFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-colors ${
                  matchTypeFilter === key
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Match List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : displayMatches.length === 0 ? (
          <Card className="bg-card/20 border-border/20">
            <CardContent className="p-12 text-center">
              <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {tab === "lobby" ? "No open lobbies. Create one above!" :
                 tab === "active" ? "No active matches right now." :
                 "No match history yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayMatches.map((match: any) => (
              <MatchCard
                key={match.id}
                match={match}
                userId={user?.id}
                onJoin={handleJoin}
                onCancel={handleCancel}
                onSimulate={handleSimulate}
              />
            ))}
          </div>
        )}

        {/* Agent Roster (sidebar for agent matches) */}
        {matchTypeFilter === "agent_vs_agent" && tab === "lobby" && agents && agents.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold font-mono text-muted-foreground mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4" /> Available AI Agents
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {agents.map((agent: any) => (
                <Card key={agent.id} className="bg-card/30 border-border/20">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl mb-1">{agent.avatar || "🤖"}</div>
                    <div className="text-xs font-bold text-foreground">{agent.name}</div>
                    <Badge variant="outline" className="text-[9px] mt-1 border-primary/20 text-primary">
                      {agent.difficulty}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
