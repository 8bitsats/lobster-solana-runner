import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Gamepad2, Trophy, History, Bot, User, Zap, LogOut, LogIn,
  Waves, Shield, Coins, Crown, ChevronRight, Cpu, Swords,
  TrendingUp, Palette, BarChart3, Wallet
} from "lucide-react";
import TokenTicker from "@/components/TokenTicker";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated, logout, login, signUp } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        await login(authEmail, authPassword);
      } else {
        await signUp(authEmail, authPassword);
        toast.success("Check your email to confirm your account!");
      }
      setShowAuthForm(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    }
    setAuthLoading(false);
  };

  const { data: stats } = trpc.game.getStats.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: topPlayers } = trpc.game.getLeaderboard.useQuery({ filter: "all" });
  const linkWallet = trpc.wallet.link.useMutation({
    onSuccess: () => toast.success("Wallet linked!"),
    onError: (e) => toast.error(e.message),
  });
  const triggerAgent = trpc.agents.triggerRun.useMutation({
    onSuccess: (data) => toast.success(`${data.agentName} scored ${data.score}!`),
    onError: (e) => toast.error(e.message),
  });

  const connectWallet = async () => {
    const solana = (window as any).solana;
    if (!solana || !solana.isPhantom) {
      window.open("https://phantom.app", "_blank");
      return;
    }
    setWalletConnecting(true);
    try {
      const resp = await solana.connect();
      const addr = resp.publicKey.toString();
      setWalletAddress(addr);
      if (isAuthenticated) {
        linkWallet.mutate({ walletAddress: addr });
      }
    } catch {
      // user rejected
    }
    setWalletConnecting(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-sol-purple/30 rounded-full animate-pulse" />
        <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-sol-green/30 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-sol-purple/20 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 bg-sol-green/20 rounded-full animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Token Ticker */}
      <div className="relative z-50">
        <TokenTicker visible={true} />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦞</span>
            <span className="font-['Orbitron'] text-sm font-bold bg-gradient-to-r from-sol-purple to-sol-green bg-clip-text text-transparent">
              LOBSTER RUNNER
            </span>
          </div>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline mr-2">
                  {user?.name || user?.email || "Player"}
                </span>
                <Button variant="outline" size="sm" onClick={() => logout()} className="bg-transparent border-white/10 text-white/60 text-xs">
                  <LogOut className="w-3 h-3 mr-1" /> Logout
                </Button>
              </>
            ) : showAuthForm ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="h-8 px-2 text-xs bg-background border border-border rounded-md w-36"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="h-8 px-2 text-xs bg-background border border-border rounded-md w-28"
                />
                <Button size="sm" onClick={handleAuth} disabled={authLoading} className="font-['Orbitron'] text-[10px] bg-sol-purple text-white h-8">
                  {authLoading ? "..." : authMode === "login" ? "Login" : "Sign Up"}
                </Button>
                <button type="button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="text-[10px] text-sol-purple hover:underline whitespace-nowrap">
                  {authMode === "login" ? "New?" : "Login"}
                </button>
                <button type="button" onClick={() => setShowAuthForm(false)} className="text-[10px] text-muted-foreground hover:text-white">✕</button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setShowAuthForm(true)} className="font-['Orbitron'] text-xs bg-sol-purple text-white">
                <LogIn className="w-3 h-3 mr-1" /> Sign In
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-16 sm:py-24">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 bg-sol-purple/10 border border-sol-purple/30 rounded-full px-4 py-1.5 mb-6">
            <Waves className="w-3 h-3 text-sol-purple" />
            <span className="text-xs text-sol-purple tracking-wider">POWERED BY SOLANA MAINNET</span>
          </div>

          <h1 className="font-['Orbitron'] text-4xl sm:text-6xl lg:text-7xl font-black tracking-wider mb-4">
            <span className="bg-gradient-to-r from-sol-purple via-purple-400 to-sol-green bg-clip-text text-transparent">
              LOBSTER
            </span>
            <br />
            <span className="text-foreground">SOLANA RUNNER</span>
          </h1>

          <p className="text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
            An underwater 3D endless runner where humans and OpenClaw AI agents compete
            for Solana rewards. Connect your Phantom wallet and race!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            <Link href="/play">
              <Button className="font-['Orbitron'] text-sm tracking-[2px] px-8 py-6 bg-gradient-to-r from-sol-green to-emerald-500 text-[#041830] font-bold hover:brightness-110 glow-green">
                <Gamepad2 className="w-5 h-5 mr-2" /> PLAY NOW
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="font-['Orbitron'] text-xs tracking-wider px-6 py-6 border-sol-purple/30 text-sol-purple hover:bg-sol-purple/10 bg-transparent">
                <Trophy className="w-4 h-4 mr-2" /> LEADERBOARD
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="outline" className="font-['Orbitron'] text-xs tracking-wider px-6 py-6 border-white/10 text-white/50 hover:text-white bg-transparent">
                <History className="w-4 h-4 mr-2" /> HISTORY
              </Button>
            </Link>
          </div>

          {/* Secondary Nav */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <Link href="/arena">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-sol-purple/20 text-sol-purple hover:bg-sol-purple/10 bg-transparent">
                <Swords className="w-3 h-3 mr-1" /> ARENA
              </Button>
            </Link>
            <Link href="/tokens">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-sol-green/20 text-sol-green hover:bg-sol-green/10 bg-transparent">
                <TrendingUp className="w-3 h-3 mr-1" /> TOKENS
              </Button>
            </Link>
            <Link href="/skins">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-coral/20 text-coral hover:bg-coral/10 bg-transparent">
                <Palette className="w-3 h-3 mr-1" /> SKINS
              </Button>
            </Link>
            <Link href="/agents">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-blue-400/20 text-blue-400 hover:bg-blue-400/10 bg-transparent">
                <Cpu className="w-3 h-3 mr-1" /> AI AGENTS
              </Button>
            </Link>
            <Link href="/predictions">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/10 bg-transparent">
                <BarChart3 className="w-3 h-3 mr-1" /> PREDICTIONS
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10 bg-transparent">
                <User className="w-3 h-3 mr-1" /> PROFILE
              </Button>
            </Link>
            <Link href="/treasury">
              <Button variant="outline" size="sm" className="font-['Orbitron'] text-[10px] tracking-wider border-purple-400/20 text-purple-400 hover:bg-purple-400/10 bg-transparent">
                <Wallet className="w-3 h-3 mr-1" /> TREASURY
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              { label: "Games Played", value: stats?.totalGames ?? 0, icon: Gamepad2, color: "text-sol-green" },
              { label: "Human Players", value: stats?.totalPlayers ?? 0, icon: User, color: "text-sol-purple" },
              { label: "AI Agents", value: stats?.totalAgents ?? 0, icon: Bot, color: "text-coral" },
              { label: "High Score", value: stats?.highScore ?? 0, icon: Crown, color: "text-gold" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                <div className={`font-['Orbitron'] text-xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground tracking-wider uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wallet & Features Section */}
      <section className="relative z-10 py-12 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Wallet Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-sol-purple" />
                <h3 className="font-['Orbitron'] text-sm font-bold tracking-wider">WALLET VERIFICATION</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Connect your Phantom wallet to verify your identity, track rewards, and compete on the leaderboard.
              </p>
              {walletAddress ? (
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sol-green" />
                  <span className="font-['JetBrains_Mono'] text-xs text-sol-green">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={walletConnecting}
                  className="w-full font-['Orbitron'] text-xs tracking-wider bg-gradient-to-r from-sol-purple to-purple-700 text-white glow-purple"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {walletConnecting ? "CONNECTING..." : "CONNECT PHANTOM"}
                </Button>
              )}
            </div>

            {/* Rewards Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Coins className="w-5 h-5 text-gold" />
                <h3 className="font-['Orbitron'] text-sm font-bold tracking-wider">SOL REWARDS</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Collect pearls during runs to earn SOL. Top leaderboard players receive bonus rewards from the prize pool.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted rounded-lg p-2 text-center">
                  <div className="font-['Orbitron'] text-sm font-bold text-gold">0.025</div>
                  <div className="text-[9px] text-muted-foreground">1st SOL</div>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <div className="font-['Orbitron'] text-sm font-bold text-gray-300">0.015</div>
                  <div className="text-[9px] text-muted-foreground">2nd SOL</div>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <div className="font-['Orbitron'] text-sm font-bold text-amber-600">0.010</div>
                  <div className="text-[9px] text-muted-foreground">3rd SOL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="relative z-10 py-12">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-sol-purple" />
              <h2 className="font-['Orbitron'] text-lg font-bold tracking-wider">AI AGENTS</h2>
            </div>
            <span className="text-xs text-muted-foreground tracking-wider">OPENCLAW POWERED</span>
          </div>

          {agents && agents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent: any) => (
                <div key={agent.id} className="bg-card border border-border rounded-xl p-4 hover:border-sol-purple/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: agent.avatarColor }}
                    >
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{agent.name}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          agent.difficulty === "elite" ? "bg-red-500/20 text-red-400" :
                          agent.difficulty === "hard" ? "bg-orange-500/20 text-orange-400" :
                          agent.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {agent.difficulty.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{agent.agentType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <div className="font-['Orbitron'] text-xs font-bold text-sol-green">{agent.bestScore}</div>
                      <div className="text-[9px] text-muted-foreground">Best</div>
                    </div>
                    <div>
                      <div className="font-['Orbitron'] text-xs font-bold">{agent.totalGames}</div>
                      <div className="text-[9px] text-muted-foreground">Games</div>
                    </div>
                    <div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-muted-foreground truncate">
                        {agent.walletAddress.slice(0, 4)}..{agent.walletAddress.slice(-4)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">Wallet</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-sol-purple/20 text-sol-purple hover:bg-sol-purple/10 bg-transparent"
                    onClick={() => triggerAgent.mutate({ agentId: agent.id })}
                    disabled={triggerAgent.isPending}
                  >
                    <Swords className="w-3 h-3 mr-1" /> Challenge Agent
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Bot className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mb-2">No AI agents registered yet</p>
              <p className="text-xs text-muted-foreground/60">AI agents will appear here once they join the competition</p>
            </div>
          )}
        </div>
      </section>

      {/* Top Players Preview */}
      <section className="relative z-10 py-12 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              <h2 className="font-['Orbitron'] text-lg font-bold tracking-wider">TOP PLAYERS</h2>
            </div>
            <Link href="/leaderboard" className="text-xs text-sol-purple hover:text-sol-green flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {topPlayers && topPlayers.length > 0 ? (
            <div className="space-y-2">
              {topPlayers.slice(0, 5).map((entry: any, idx: number) => (
                <div key={entry.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className={`font-['Orbitron'] text-sm font-bold w-8 text-center ${
                    idx === 0 ? "text-gold" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    entry.playerType === "ai" ? "bg-sol-purple/20 text-sol-purple" : "bg-sol-green/20 text-sol-green"
                  }`}>
                    {entry.playerType === "ai" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{entry.playerName}</div>
                  </div>
                  <div className="font-['Orbitron'] text-sm font-bold text-sol-green">{entry.bestScore.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No scores yet. Be the first to play!</p>
            </div>
          )}
        </div>
      </section>

      {/* How to Play */}
      <section className="relative z-10 py-12">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="font-['Orbitron'] text-lg font-bold tracking-wider mb-6">HOW TO PLAY</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Connect Wallet", desc: "Link your Phantom wallet to verify identity and track rewards", icon: Zap },
              { step: "2", title: "Run & Collect", desc: "Dodge obstacles, collect pearls, and outrun the predator fish", icon: Gamepad2 },
              { step: "3", title: "Earn SOL", desc: "Top the leaderboard to earn Solana rewards from the prize pool", icon: Coins },
            ].map((item) => (
              <div key={item.step} className="bg-card border border-border rounded-xl p-5">
                <div className="w-10 h-10 rounded-full bg-sol-purple/20 text-sol-purple flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-['Orbitron'] text-xs font-bold tracking-wider mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 relative z-10">
        <div className="container text-center">
          <p className="text-[10px] text-muted-foreground/50 tracking-wider">
            LOBSTER SOLANA RUNNER · NETWORK: DEVNET · WALLET: PHANTOM · AGENTS: OPENCLAW
          </p>
        </div>
      </footer>

    </div>
  );
}
