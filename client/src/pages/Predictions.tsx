import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Trophy, Clock, Coins, Users,
  Target, Zap, ArrowRight, Loader2, CheckCircle, XCircle
} from "lucide-react";
import { Link } from "wouter";

export default function Predictions() {
  const { user, isAuthenticated } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(100);

  const { data: markets, refetch: refetchMarkets } = trpc.predictions.markets.useQuery({ status: "open" });
  const { data: agents } = trpc.autonomous.list.useQuery();
  const { data: myPredictions } = trpc.predictions.myBets.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createMarketMutation = trpc.predictions.createMarket.useMutation({
    onSuccess: () => {
      toast.success("Market created!");
      refetchMarkets();
    },
    onError: (e) => toast.error(e.message),
  });

  const placeBetMutation = trpc.predictions.placeBet.useMutation({
    onSuccess: () => {
      toast.success("Prediction placed!");
      refetchMarkets();
    },
    onError: (e) => toast.error(e.message),
  });

  const totalPool = useMemo(() => {
    if (!markets) return 0;
    return markets.reduce((sum: number, m: any) => sum + (m.totalPool || 0), 0);
  }, [markets]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-orbitron bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Prediction Market
              </h1>
              <p className="text-muted-foreground mt-1">Bet on which AI agent will score highest</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Pool</div>
                <div className="text-xl font-bold text-yellow-400 font-orbitron">
                  {totalPool.toLocaleString()} pts
                </div>
              </div>
              <Link href="/agents">
                <Button variant="outline" className="border-purple-500/30 text-purple-400">
                  <Zap className="w-4 h-4 mr-2" /> View Agents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Tabs defaultValue="markets" className="space-y-6">
          <TabsList className="bg-card/50 border border-border/30">
            <TabsTrigger value="markets" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
              <Target className="w-4 h-4 mr-2" /> Active Markets
            </TabsTrigger>
            <TabsTrigger value="my-bets" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Coins className="w-4 h-4 mr-2" /> My Predictions
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              <TrendingUp className="w-4 h-4 mr-2" /> Create Market
            </TabsTrigger>
          </TabsList>

          {/* Active Markets */}
          <TabsContent value="markets" className="space-y-4">
            {!markets || markets.length === 0 ? (
              <Card className="bg-card/50 border-border/30">
                <CardContent className="py-16 text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-xl font-bold mb-2">No Active Markets</h3>
                  <p className="text-muted-foreground mb-6">Create a prediction market to get started</p>
                  <Button className="bg-yellow-600 hover:bg-yellow-700">
                    Create First Market
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {markets.map((market: any) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    agents={agents || []}
                    isAuthenticated={isAuthenticated}
                    selectedAgent={selectedAgent}
                    setSelectedAgent={setSelectedAgent}
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    onPlaceBet={(marketId: number, agentId: number, amount: number) => {
                      placeBetMutation.mutate({ marketId, agentId, betAmount: String(amount), predictionType: "win" as const, side: "yes" as const });
                    }}
                    isPending={placeBetMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Predictions */}
          <TabsContent value="my-bets" className="space-y-4">
            {!isAuthenticated ? (
              <Card className="bg-card/50 border-border/30">
                <CardContent className="py-16 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-xl font-bold mb-2">Sign In Required</h3>
                  <p className="text-muted-foreground mb-6">Connect to view your predictions</p>
                  <a href={"/"}>
                    <Button className="bg-purple-600 hover:bg-purple-700">Sign In</Button>
                  </a>
                </CardContent>
              </Card>
            ) : !myPredictions || myPredictions.length === 0 ? (
              <Card className="bg-card/50 border-border/30">
                <CardContent className="py-16 text-center">
                  <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-xl font-bold mb-2">No Predictions Yet</h3>
                  <p className="text-muted-foreground">Place your first bet on an active market</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {myPredictions.map((pred: any) => (
                    <Card key={pred.id} className="bg-card/50 border-border/30">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              pred.outcome === "won" ? "bg-green-500/20" :
                              pred.outcome === "lost" ? "bg-red-500/20" : "bg-yellow-500/20"
                            }`}>
                              {pred.outcome === "won" ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : pred.outcome === "lost" ? (
                                <XCircle className="w-5 h-5 text-red-400" />
                              ) : (
                                <Clock className="w-5 h-5 text-yellow-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                Bet on: <span className="text-purple-400">{pred.agentName || `Agent #${pred.agentId}`}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Market #{pred.marketId} · {pred.createdAt ? new Date(pred.createdAt).toLocaleDateString() : ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-yellow-400">{pred.amount} pts</div>
                            {pred.payout > 0 && (
                              <div className="text-xs text-green-400">+{pred.payout} won</div>
                            )}
                            <Badge variant="outline" className={
                              pred.outcome === "won" ? "text-green-400" :
                              pred.outcome === "lost" ? "text-red-400" : "text-yellow-400"
                            }>
                              {pred.outcome || "pending"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Create Market */}
          <TabsContent value="create" className="space-y-4">
            <Card className="bg-card/50 border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Create Prediction Market
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Sign in to create markets</p>
                    <a href={"/"}>
                      <Button className="bg-purple-600 hover:bg-purple-700">Sign In</Button>
                    </a>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Competing Agents</label>
                      <p className="text-xs text-muted-foreground mb-3">Choose 2+ agents for the market</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(agents || []).map((agent: any) => (
                          <Button
                            key={agent.id}
                            variant="outline"
                            className={`justify-start ${selectedAgent === agent.id ? "border-yellow-500 bg-yellow-500/10" : "border-border/30"}`}
                            onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                          >
                            <span className="mr-2">{agent.avatarEmoji}</span>
                            <span className="truncate">{agent.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                      disabled={createMarketMutation.isPending || !agents || agents.length < 2}
                      onClick={() => {
                        if (agents && agents.length >= 2) {
                          createMarketMutation.mutate({
                            title: `Agent Showdown #${Date.now().toString(36).slice(-4).toUpperCase()}`,
                            marketType: "head_to_head" as const,
                            agentId: agents[0]?.id,
                          });
                        }
                      }}
                    >
                      {createMarketMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                      ) : (
                        <><Target className="w-4 h-4 mr-2" /> Create Market with All Agents</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Market Card ───
function MarketCard({ market, agents, isAuthenticated, selectedAgent, setSelectedAgent, betAmount, setBetAmount, onPlaceBet, isPending }: {
  market: any;
  agents: any[];
  isAuthenticated: boolean;
  selectedAgent: number | null;
  setSelectedAgent: (id: number | null) => void;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onPlaceBet: (marketId: number, agentId: number, amount: number) => void;
  isPending: boolean;
}) {
  const [localAgent, setLocalAgent] = useState<number | null>(null);
  const agentIds: number[] = Array.isArray(market.agentIds) ? market.agentIds : [];
  const marketAgents = agents.filter(a => agentIds.includes(a.id));

  const timeLeft = market.endsAt ? Math.max(0, new Date(market.endsAt).getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / 3600000);
  const minsLeft = Math.floor((timeLeft % 3600000) / 60000);

  return (
    <Card className="bg-card/50 border-border/30 overflow-hidden">
      <CardContent className="py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg font-orbitron">{market.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : "Ended"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {market.totalBets || 0} bets
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Pool</div>
            <div className="text-lg font-bold text-yellow-400 font-orbitron">
              {(market.totalPool || 0).toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Agent Odds */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {marketAgents.map((agent: any) => {
            const isSelected = localAgent === agent.id;
            const odds = marketAgents.length > 0 ? (100 / marketAgents.length).toFixed(0) : "0";
            return (
              <button
                key={agent.id}
                onClick={() => setLocalAgent(isSelected ? null : agent.id)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isSelected
                    ? "border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/10"
                    : "border-border/30 bg-background/30 hover:border-border/60"
                }`}
              >
                <div className="text-2xl mb-1">{agent.avatarEmoji}</div>
                <div className="text-xs font-medium truncate">{agent.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{odds}% odds</div>
                {isSelected && <ArrowRight className="w-3 h-3 mx-auto mt-1 text-yellow-400" />}
              </button>
            );
          })}
        </div>

        {/* Bet Controls */}
        {market.status === "open" && isAuthenticated && (
          <div className="flex items-center gap-3 pt-3 border-t border-border/20">
            <div className="flex items-center gap-1">
              {[50, 100, 250, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    betAmount === amt
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-background/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="ml-auto bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
              disabled={!localAgent || isPending}
              onClick={() => {
                if (localAgent) {
                  onPlaceBet(market.id, localAgent, betAmount);
                  setLocalAgent(null);
                }
              }}
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>Place Bet ({betAmount} pts)</>
              )}
            </Button>
          </div>
        )}

        {market.status === "resolved" && (
          <div className="flex items-center gap-2 pt-3 border-t border-border/20">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">
              Winner: <span className="text-yellow-400">
                {agents.find(a => a.id === market.winnerId)?.name || `Agent #${market.winnerId}`}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
