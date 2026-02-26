import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wallet, ArrowUpRight, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Coins, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";

function shortenAddress(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatSol(sol: number) {
  return sol.toFixed(6);
}

export default function Treasury() {
  const { user, isAuthenticated } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Treasury balance (auto-refresh every 15s)
  const { data: treasuryStats, isLoading: statsLoading, refetch: refetchStats } = trpc.treasury.stats.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  // Recent transactions
  const { data: recentTxs, isLoading: txsLoading } = trpc.treasury.recentTransactions.useQuery(
    { limit: 20 },
    { refetchInterval: 30000 }
  );

  // All payouts
  const { data: allPayouts, isLoading: payoutsLoading } = trpc.treasury.allPayouts.useQuery(
    { limit: 30 },
    { refetchInterval: 10000 }
  );

  // User's payouts (if authenticated)
  const { data: myPayouts } = trpc.treasury.myPayouts.useQuery(
    { limit: 20 },
    { enabled: isAuthenticated }
  );

  // User's wallet
  const { data: wallet } = trpc.wallet.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Wallet balance
  const { data: walletBalance } = trpc.treasury.walletBalance.useQuery(
    { address: wallet?.walletAddress ?? "" },
    { enabled: !!wallet?.walletAddress, refetchInterval: 15000 }
  );

  const handleRefresh = () => {
    refetchStats();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="text-xl font-bold font-[Orbitron] text-primary cursor-pointer">LOBSTER RUNNER</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-lg font-semibold">Treasury</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Treasury Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Treasury Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="animate-spin w-6 h-6 text-purple-400" />
              ) : (
                <>
                  <p className="text-3xl font-bold font-[Orbitron] text-white">
                    {formatSol(treasuryStats?.balance?.sol ?? 0)} SOL
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {treasuryStats?.address ? shortenAddress(treasuryStats.address) : "..."}
                  </p>
                  {treasuryStats?.address && (
                    <a
                      href={`https://solscan.io/account/${treasuryStats.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-2"
                    >
                      View on Solscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Payouts Stats Card */}
          <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Total Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="animate-spin w-6 h-6 text-green-400" />
              ) : (
                <>
                  <p className="text-3xl font-bold font-[Orbitron] text-white">
                    {treasuryStats?.payouts?.totalPayouts ?? 0}
                  </p>
                  <p className="text-sm text-green-300 mt-1">
                    {formatSol(treasuryStats?.payouts?.totalSolPaid ?? 0)} SOL distributed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {treasuryStats?.payouts?.pendingCount ?? 0} pending
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Your Wallet Card */}
          <Card className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-cyan-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-cyan-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Your Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <p className="text-sm text-muted-foreground">Sign in to view your wallet</p>
              ) : !wallet ? (
                <div>
                  <p className="text-sm text-muted-foreground">No wallet connected</p>
                  <Link href="/play">
                    <Button size="sm" variant="outline" className="mt-2">
                      Connect Wallet
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold font-[Orbitron] text-white">
                    {walletBalance ? formatSol(walletBalance.sol) : "..."} SOL
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {shortenAddress(wallet.walletAddress)}
                  </p>
                  <a
                    href={`https://solscan.io/account/${wallet.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2"
                  >
                    View on Solscan <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Payouts */}
        {isAuthenticated && myPayouts && myPayouts.length > 0 && (
          <Card className="bg-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-400" />
                Your Prize Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myPayouts.map((payout: any) => (
                  <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      {payout.status === "confirmed" && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {payout.status === "failed" && <XCircle className="w-5 h-5 text-red-400" />}
                      {payout.status === "pending" && <Clock className="w-5 h-5 text-yellow-400" />}
                      {payout.status === "processing" && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                      <div>
                        <p className="text-sm font-semibold">{payout.amountSol} SOL</p>
                        <p className="text-xs text-muted-foreground">
                          Session #{payout.gameSessionId} &middot; {new Date(payout.claimedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        payout.status === "confirmed" ? "default" :
                        payout.status === "failed" ? "destructive" :
                        "secondary"
                      }>
                        {payout.status}
                      </Badge>
                      {payout.txSignature && (
                        <a
                          href={`https://solscan.io/tx/${payout.txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent On-Chain Transactions */}
          <Card className="bg-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Recent On-Chain Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {txsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
                </div>
              ) : !recentTxs || recentTxs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentTxs.map((tx: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50 text-sm">
                      <div>
                        <p className="font-mono text-xs">{shortenAddress(tx.signature)}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : "Pending"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {tx.err ? (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">Success</Badge>
                        )}
                        <a
                          href={`https://solscan.io/tx/${tx.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Payouts Feed */}
          <Card className="bg-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Payout Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
                </div>
              ) : !allPayouts || allPayouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payouts yet. Play the game and claim your prizes!
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allPayouts.map((payout: any) => (
                    <div key={payout.id} className="flex items-center justify-between p-2 rounded bg-background/50 text-sm">
                      <div>
                        <p className="font-semibold">{payout.amountSol} SOL</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          → {shortenAddress(payout.walletAddress)}
                        </p>
                      </div>
                      <Badge variant={
                        payout.status === "confirmed" ? "default" :
                        payout.status === "failed" ? "destructive" :
                        "secondary"
                      }>
                        {payout.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-card/80 border-border/40">
          <CardHeader>
            <CardTitle className="text-lg">How Prize Claims Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "1", title: "Play the Game", desc: "Complete a run and earn a score based on distance and coins collected." },
                { step: "2", title: "Connect Wallet", desc: "Link your Phantom, Backpack, or Solflare wallet to verify your identity." },
                { step: "3", title: "Claim Prize", desc: "After each game, click Claim Prize. The amount is based on your score." },
                { step: "4", title: "Receive SOL", desc: "SOL is sent from the treasury directly to your wallet on Solana mainnet." },
              ].map((item) => (
                <div key={item.step} className="text-center p-4 rounded-lg bg-background/50 border border-border/30">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Prize formula: Base 0.001 SOL + 0.000001 SOL per score point (max 0.1 SOL per claim).</p>
              <p>All transactions are on Solana mainnet and can be verified on Solscan.</p>
              <p>Treasury balance is updated in real-time via Helius DAS API.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
