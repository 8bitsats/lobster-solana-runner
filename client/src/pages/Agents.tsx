import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Bot, Zap, Shield, Brain, Play, Trophy, Clock, Activity,
  ChevronRight, Loader2, Sparkles, Eye, Plus, ArrowLeft
} from "lucide-react";

const MODEL_OPTIONS = {
  xai: [
    { value: "grok-3-mini-fast", label: "Grok 3 Mini Fast" },
    { value: "grok-3-mini", label: "Grok 3 Mini" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  anthropic: [
    { value: "claude-sonnet", label: "Claude Sonnet" },
    { value: "claude-haiku", label: "Claude Haiku" },
  ],
};

const DIFFICULTY_COLORS: Record<string, string> = {
  cautious: "text-blue-400 bg-blue-500/10",
  balanced: "text-green-400 bg-green-500/10",
  aggressive: "text-orange-400 bg-orange-500/10",
  reckless: "text-red-400 bg-red-500/10",
};

const PROVIDER_COLORS: Record<string, string> = {
  xai: "text-purple-400 bg-purple-500/10",
  openai: "text-emerald-400 bg-emerald-500/10",
  anthropic: "text-amber-400 bg-amber-500/10",
};

export default function Agents() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState("browse");
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🦞");
  const [color, setColor] = useState("#ff4422");
  const [provider, setProvider] = useState<"xai" | "openai" | "anthropic">("xai");
  const [model, setModel] = useState("grok-3-mini-fast");
  const [personality, setPersonality] = useState("");
  const [difficulty, setDifficulty] = useState<"cautious" | "balanced" | "aggressive" | "reckless">("balanced");
  const [reactionSpeed, setReactionSpeed] = useState(50);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [coinPriority, setCoinPriority] = useState(50);

  const { data: agents, refetch: refetchAgents } = trpc.autonomous.list.useQuery();
  const createMutation = trpc.autonomous.create.useMutation({
    onSuccess: () => {
      toast.success("Agent created!");
      refetchAgents();
      setShowCreate(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const runMutation = trpc.autonomous.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Run complete! Score: ${data.score.toLocaleString()}`);
      refetchAgents();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setName(""); setSlug(""); setDescription(""); setEmoji("🦞");
    setColor("#ff4422"); setProvider("xai"); setModel("grok-3-mini-fast");
    setPersonality(""); setDifficulty("balanced");
    setReactionSpeed(50); setRiskTolerance(50); setCoinPriority(50);
  };

  const handleCreate = () => {
    if (!name || !slug) { toast.error("Name and slug are required"); return; }
    createMutation.mutate({
      name, slug, description, avatarEmoji: emoji, avatarColor: color,
      modelProvider: provider, modelName: model,
      personality: personality || undefined,
      difficulty, reactionSpeed, riskTolerance, coinPriority,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            </Link>
            <Bot className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-bold font-orbitron">Autonomous Agents</h1>
          </div>
          {isAuthenticated && (
            <Button onClick={() => setShowCreate(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-1" /> Create Agent
            </Button>
          )}
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-card/50">
            <TabsTrigger value="browse"><Bot className="w-4 h-4 mr-1" /> Browse Agents</TabsTrigger>
            <TabsTrigger value="spectate"><Eye className="w-4 h-4 mr-1" /> Spectate</TabsTrigger>
          </TabsList>

          {/* Browse Agents */}
          <TabsContent value="browse" className="space-y-4">
            {!agents || agents.length === 0 ? (
              <Card className="bg-card/50 border-border/30">
                <CardContent className="py-12 text-center">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No autonomous agents yet. Create the first one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <Card key={agent.id} className="bg-card/50 border-border/30 hover:border-purple-500/30 transition-all group cursor-pointer"
                    onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ backgroundColor: agent.avatarColor + "22", borderColor: agent.avatarColor + "44", borderWidth: 1 }}>
                            {agent.avatarEmoji}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold">{agent.name}</CardTitle>
                            <CardDescription className="text-xs">@{agent.slug}</CardDescription>
                          </div>
                        </div>
                        <Badge className={PROVIDER_COLORS[agent.modelProvider]}>{agent.modelProvider.toUpperCase()}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agent.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={DIFFICULTY_COLORS[agent.difficulty]}>
                          {agent.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          {agent.modelName}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background/50 rounded p-2">
                          <div className="text-sm font-bold text-purple-400">{agent.totalGames}</div>
                          <div className="text-[10px] text-muted-foreground">Games</div>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <div className="text-sm font-bold text-yellow-400">{agent.bestScore.toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">Best</div>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <div className="text-sm font-bold text-green-400">{agent.winRate}%</div>
                          <div className="text-[10px] text-muted-foreground">Win Rate</div>
                        </div>
                      </div>

                      {/* Strategy bars */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Reaction</span>
                          <span className="text-blue-400">{agent.reactionSpeed}%</span>
                        </div>
                        <div className="h-1 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${agent.reactionSpeed}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Risk</span>
                          <span className="text-orange-400">{agent.riskTolerance}%</span>
                        </div>
                        <div className="h-1 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${agent.riskTolerance}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Coin Focus</span>
                          <span className="text-yellow-400">{agent.coinPriority}%</span>
                        </div>
                        <div className="h-1 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${agent.coinPriority}%` }} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700"
                          disabled={runMutation.isPending}
                          onClick={(e) => { e.stopPropagation(); runMutation.mutate({ agentId: agent.id }); }}>
                          {runMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          Run
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1"
                          onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent.id); setTab("spectate"); }}>
                          <Eye className="w-3 h-3 mr-1" /> Spectate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Spectate */}
          <TabsContent value="spectate" className="space-y-4">
            <SpectateView agentId={selectedAgent} agents={agents || []} onSelectAgent={setSelectedAgent} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Agent Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-orbitron">
              <Sparkles className="w-5 h-5 text-purple-400" /> Create Autonomous Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Identity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Grok Runner" className="bg-background/50" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="grok-runner" className="bg-background/50" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A fast and aggressive lobster agent..." className="bg-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Emoji</Label>
                <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="bg-background/50 text-center text-xl" />
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="bg-background/50 h-9" />
              </div>
            </div>

            <Separator />

            {/* Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">AI Provider</Label>
                <Select value={provider} onValueChange={(v: any) => { setProvider(v); setModel(MODEL_OPTIONS[v as keyof typeof MODEL_OPTIONS][0].value); }}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xai">xAI (Grok)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS[provider].map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Personality Prompt (optional)</Label>
              <Input value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="Aggressive coin collector, never retreats..." className="bg-background/50" />
            </div>

            <Separator />

            {/* Strategy */}
            <div>
              <Label className="text-xs">Difficulty</Label>
              <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cautious">Cautious</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="reckless">Reckless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Reaction Speed</Label>
                  <span className="text-blue-400">{reactionSpeed}%</span>
                </div>
                <Slider value={[reactionSpeed]} onValueChange={([v]) => setReactionSpeed(v)} min={10} max={100} step={5} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Risk Tolerance</Label>
                  <span className="text-orange-400">{riskTolerance}%</span>
                </div>
                <Slider value={[riskTolerance]} onValueChange={([v]) => setRiskTolerance(v)} min={0} max={100} step={5} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Coin Priority</Label>
                  <span className="text-yellow-400">{coinPriority}%</span>
                </div>
                <Slider value={[coinPriority]} onValueChange={([v]) => setCoinPriority(v)} min={0} max={100} step={5} />
              </div>
            </div>

            <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full bg-purple-600 hover:bg-purple-700">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Create Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Spectate View ───
function SpectateView({ agentId, agents, onSelectAgent }: {
  agentId: number | null;
  agents: any[];
  onSelectAgent: (id: number) => void;
}): React.JSX.Element {
  const { data: runs } = trpc.autonomous.runs.useQuery(
    { agentId: agentId || 0, limit: 10 },
    { enabled: !!agentId }
  );
  const agent = agents.find((a: any) => a.id === agentId) as any;
  const runMutation = trpc.autonomous.run.useMutation({
    onSuccess: (data) => toast.success(`Run complete! Score: ${data.score.toLocaleString()}`),
    onError: (e) => toast.error(e.message),
  });

  if (!agentId || !agent) {
    return (
      <Card className="bg-card/50 border-border/30">
        <CardContent className="py-12 text-center">
          <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Select an agent to spectate</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {agents.map(a => (
              <Button key={a.id} variant="outline" size="sm" onClick={() => onSelectAgent(a.id)}>
                {a.avatarEmoji} {a.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Agent Header */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: agent.avatarColor + "22", borderColor: agent.avatarColor + "44", borderWidth: 2 }}>
                {agent.avatarEmoji}
              </div>
              <div>
                <h2 className="text-xl font-bold font-orbitron">{agent.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={PROVIDER_COLORS[agent.modelProvider]}>{agent.modelProvider}</Badge>
                  <Badge variant="outline" className={DIFFICULTY_COLORS[agent.difficulty]}>{agent.difficulty}</Badge>
                  <Badge variant="outline" className="text-muted-foreground">{agent.modelName}</Badge>
                </div>
              </div>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate({ agentId: agent.id })}>
              {runMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Running...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Run Agent</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="py-3 text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 text-purple-400" />
            <div className="text-lg font-bold text-purple-400">{agent.totalGames as React.ReactNode}</div>
            <div className="text-[10px] text-muted-foreground">Total Games</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="py-3 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <div className="text-lg font-bold text-yellow-400">{agent.bestScore.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Best Score</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="py-3 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <div className="text-lg font-bold text-blue-400">{agent.totalGames > 0 ? Math.floor(agent.totalScore / agent.totalGames).toLocaleString() : "0"}</div>
            <div className="text-[10px] text-muted-foreground">Avg Score</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="py-3 text-center">
            <Shield className="w-5 h-5 mx-auto mb-1 text-green-400" />
            <div className="text-lg font-bold text-green-400">{agent.winRate}%</div>
            <div className="text-[10px] text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Run History */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> Run History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!runs || runs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">No runs yet. Click "Run Agent" to start!</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {runs.map((run: any) => (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${run.status === "completed" ? "bg-green-400" : run.status === "running" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
                      <div>
                        <div className="text-sm font-medium">
                          Score: <span className="text-yellow-400">{run.score.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {run.distance}m · {run.coinsCollected} coins · {run.llmTokensUsed} tokens
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={run.status === "completed" ? "text-green-400" : run.status === "running" ? "text-yellow-400" : "text-red-400"}>
                        {run.status}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {run.createdAt ? new Date(run.createdAt).toLocaleTimeString() : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Decision Log (latest run) */}
      {runs && runs.length > 0 && runs[0].decisionLog != null ? (
        <Card className="bg-card/50 border-border/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" /> Decision Log (Latest Run)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 font-mono text-xs">
                {(runs[0].decisionLog as any[]).slice(-30).map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-background/30">
                    <span className="text-muted-foreground w-8 shrink-0">#{entry.frame}</span>
                    <Badge variant="outline" className={
                      entry.action === "jump" ? "text-yellow-400" :
                      entry.action === "left" ? "text-blue-400" :
                      entry.action === "right" ? "text-green-400" : "text-muted-foreground"
                    }>
                      {entry.action}
                    </Badge>
                    <span className="text-muted-foreground truncate">{entry.reasoning}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
