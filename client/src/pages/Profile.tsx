import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { User, Trophy, Gamepad2, Coins, MapPin, Share2, Edit3, Save, ArrowLeft, CreditCard, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const SPRITE_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/102392112/kttHnXDpoKaCpYKM.png";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const profileQuery = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const charactersQuery = trpc.characters.list.useQuery();
  const replaysQuery = trpc.replays.myReplays.useQuery(undefined, { enabled: isAuthenticated });
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success("Profile updated!"); setEditing(false); profileQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const creditBalance = trpc.credits.balance.useQuery(undefined, { enabled: isAuthenticated });
  const paidStats = trpc.credits.paidStats.useQuery(undefined, { enabled: isAuthenticated });
  const creditHistory = trpc.credits.history.useQuery(undefined, { enabled: isAuthenticated });

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | undefined>();

  useEffect(() => {
    if (profileQuery.data) {
      setDisplayName(profileQuery.data.displayName || "");
      setBio(profileQuery.data.bio || "");
      setXHandle(profileQuery.data.xHandle || "");
      setIsPublic(profileQuery.data.isPublic);
      setSelectedCharacterId(profileQuery.data.selectedCharacterId ?? undefined);
    }
  }, [profileQuery.data]);

  const profile = profileQuery.data;
  const characters = charactersQuery.data || [];
  const replays = replaysQuery.data || [];
  const selectedChar = characters.find(c => c.id === selectedCharacterId);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md w-full bg-card/80 border-primary/30">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-primary/50" />
            <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">Connect your account to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-3xl font-bold font-[Orbitron] text-primary">Player Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="md:col-span-1 bg-card/80 border-primary/30">
            <CardContent className="p-6 text-center">
              {/* Avatar - Character sprite */}
              <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-primary/50 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                {selectedChar ? (
                  <span className="text-6xl">{selectedChar.emoji}</span>
                ) : (
                  <span className="text-6xl">🦞</span>
                )}
              </div>

              {editing ? (
                <div className="space-y-3 text-left">
                  <div>
                    <Label>Display Name</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={64} className="bg-background/50" />
                  </div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3} className="bg-background/50" />
                  </div>
                  <div>
                    <Label>X Handle</Label>
                    <Input value={xHandle} onChange={e => setXHandle(e.target.value)} placeholder="@username" maxLength={64} className="bg-background/50" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Public Profile</Label>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateProfile.mutate({ displayName, bio, xHandle, isPublic, selectedCharacterId })} disabled={updateProfile.isPending}>
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{profile?.displayName || user?.name || "Anonymous"}</h2>
                  {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
                  {profile?.xHandle && (
                    <a href={`https://x.com/${profile.xHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 block">
                      @{profile.xHandle.replace("@", "")}
                    </a>
                  )}
                  {selectedChar && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Main: <span className="text-foreground">{selectedChar.emoji} {selectedChar.name}</span>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-1" /> Edit Profile
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="md:col-span-2 bg-card/80 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "High Score", value: profile?.highScore?.toLocaleString() || "0", icon: <Trophy className="w-5 h-5 text-yellow-400" /> },
                  { label: "Total Games", value: profile?.totalGames?.toString() || "0", icon: <Gamepad2 className="w-5 h-5 text-blue-400" /> },
                  { label: "Total Wins", value: profile?.totalWins?.toString() || "0", icon: <Trophy className="w-5 h-5 text-green-400" /> },
                  { label: "Total Coins", value: profile?.totalCoins?.toLocaleString() || "0", icon: <Coins className="w-5 h-5 text-amber-400" /> },
                  { label: "Total Distance", value: `${(profile?.totalDistance || 0).toLocaleString()}m`, icon: <MapPin className="w-5 h-5 text-cyan-400" /> },
                  { label: "Win Rate", value: profile && profile.totalGames > 0 ? `${Math.round((profile.totalWins / profile.totalGames) * 100)}%` : "0%", icon: <Share2 className="w-5 h-5 text-purple-400" /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-background/50 rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <div className="text-lg font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Character Selection */}
          <Card className="md:col-span-3 bg-card/80 border-primary/30">
            <CardHeader>
              <CardTitle>Select Your Character</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {characters.map(char => {
                  const abilities = typeof char.abilities === "string" ? JSON.parse(char.abilities) : char.abilities as any;
                  const isSelected = selectedCharacterId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        setSelectedCharacterId(char.id);
                        updateProfile.mutate({ selectedCharacterId: char.id });
                      }}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all border-2 ${isSelected ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" : "border-border/50 bg-background/30 hover:border-primary/50"}`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">SELECTED</div>
                      )}
                      <div className="text-center mb-3">
                        <span className="text-5xl">{char.emoji}</span>
                        <h3 className="text-lg font-bold mt-2" style={{ color: char.primaryColor }}>{char.name}</h3>
                        <div className="text-xs text-muted-foreground">{char.role} • {char.characterClass}</div>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                          char.rarity === "mythic" ? "bg-purple-500/20 text-purple-300" :
                          char.rarity === "legendary" ? "bg-amber-500/20 text-amber-300" :
                          "bg-blue-500/20 text-blue-300"
                        }`}>{char.rarity.toUpperCase()}</span>
                      </div>

                      {/* Stats bars */}
                      <div className="space-y-1 text-xs mb-3">
                        {[
                          { label: "Speed", value: char.speed, color: "#22d3ee" },
                          { label: "Coin Bonus", value: char.coinBonus, color: "#fbbf24" },
                          { label: "Survivability", value: char.survivability, color: "#4ade80" },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className="w-20 text-muted-foreground">{s.label}</span>
                            <div className="flex-1 h-2 bg-background/50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                            </div>
                            <span className="w-8 text-right">{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Abilities */}
                      {abilities && (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span>{abilities.passive?.icon}</span>
                            <span className="text-muted-foreground">Passive:</span>
                            <span>{abilities.passive?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{abilities.active?.icon}</span>
                            <span className="text-muted-foreground">Active:</span>
                            <span>{abilities.active?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{abilities.ultimate?.icon}</span>
                            <span className="text-muted-foreground">Ultimate:</span>
                            <span>{abilities.ultimate?.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Credit Balance Card */}
          <Card className="md:col-span-1 bg-card/80 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-yellow-400" /> Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold font-[Orbitron] text-yellow-400">
                  {creditBalance.data?.balance ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Available Credits</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Games Today</span>
                  <span>{creditBalance.data?.paidGamesToday ?? 0} / {creditBalance.data?.dailyLimit ?? 10}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span>{creditBalance.data?.entryFee ?? 0.01} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Prize</span>
                  <span>{creditBalance.data?.prizeAmount ?? 0.1} SOL</span>
                </div>
              </div>
              <Link href="/play">
                <Button className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700" size="sm">
                  <Wallet className="w-4 h-4 mr-1" /> Buy Credits
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Paid Game Stats */}
          <Card className="md:col-span-2 bg-card/80 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /> Paid Mode Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {paidStats.data ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Paid Games", value: paidStats.data.totalPaidGames.toString(), icon: <Gamepad2 className="w-5 h-5 text-blue-400" /> },
                    { label: "Wins", value: paidStats.data.wins.toString(), icon: <Trophy className="w-5 h-5 text-green-400" /> },
                    { label: "Losses", value: paidStats.data.losses.toString(), icon: <TrendingDown className="w-5 h-5 text-red-400" /> },
                    { label: "Credits Spent", value: paidStats.data.totalSpent.toString(), icon: <Coins className="w-5 h-5 text-amber-400" /> },
                    { label: "Wins", value: paidStats.data.totalWon.toString(), icon: <Coins className="w-5 h-5 text-green-400" /> },
                    { label: "SOL Won", value: `${(paidStats.data.totalPayoutSol || 0).toFixed(4)}`, icon: <Wallet className="w-5 h-5 text-cyan-400" /> },
                    {
                      label: "Net P&L (SOL)",
                      value: `${paidStats.data.netPLSol >= 0 ? "+" : ""}${paidStats.data.netPLSol.toFixed(4)}`,
                      icon: paidStats.data.netPLSol >= 0
                        ? <TrendingUp className="w-5 h-5 text-green-400" />
                        : <TrendingDown className="w-5 h-5 text-red-400" />,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-background/50 rounded-lg p-3 text-center">
                      <div className="flex justify-center mb-1">{stat.icon}</div>
                      <div className="text-lg font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No paid games yet. Buy credits and play to see your stats!</p>
              )}
            </CardContent>
          </Card>

          {/* Credit Transaction History */}
          <Card className="md:col-span-3 bg-card/80 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Credit History</CardTitle>
            </CardHeader>
            <CardContent>
              {!creditHistory.data || creditHistory.data.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No credit transactions yet.</p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {creditHistory.data.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === "deposit" ? "bg-green-500/20" :
                            tx.type === "spend" ? "bg-red-500/20" :
                            tx.type === "prize" ? "bg-yellow-500/20" : "bg-blue-500/20"
                          }`}>
                            {tx.type === "deposit" ? <TrendingUp className="w-4 h-4 text-green-400" /> :
                             tx.type === "spend" ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                             tx.type === "prize" ? <Trophy className="w-4 h-4 text-yellow-400" /> :
                             <Coins className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium capitalize">{tx.type}</div>
                            <div className="text-xs text-muted-foreground">
                              {tx.note || (tx.type === "spend" ? "Game entry" : tx.type)}
                              {tx.createdAt && ` · ${new Date(tx.createdAt).toLocaleDateString()}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={tx.amount > 0 ? "text-green-400" : "text-red-400"}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </Badge>
                          {tx.txSignature && (
                            <a
                              href={`https://solscan.io/tx/${tx.txSignature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[10px] text-primary hover:underline mt-0.5"
                            >
                              View tx →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Shared Replays */}
          <Card className="md:col-span-3 bg-card/80 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" /> My Shared Replays</CardTitle>
            </CardHeader>
            <CardContent>
              {replays.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No shared replays yet. Play a game and share your score on X!</p>
              ) : (
                <div className="space-y-2">
                  {replays.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3">
                      <div>
                        <span className="font-bold">{r.score?.toLocaleString()}</span>
                        <span className="text-muted-foreground text-sm ml-2">{r.distance}m • {r.coinsCollected} coins</span>
                        {r.characterSlug && <span className="text-xs text-primary ml-2">{r.characterSlug}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{r.viewCount} views</span>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{r.shareCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
