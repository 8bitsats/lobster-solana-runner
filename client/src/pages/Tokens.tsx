import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, TrendingDown, Search, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight, Coins, BarChart3, Droplets } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

function formatPrice(price: number | undefined | null): string {
  if (!price) return "$0.00";
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(3)}`;
}

function formatVolume(vol: number | undefined | null): string {
  if (!vol) return "$0";
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toFixed(2)}`;
}

function formatMcap(mcap: number | undefined | null): string {
  if (!mcap) return "N/A";
  if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(2)}B`;
  if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(2)}M`;
  if (mcap >= 1e3) return `$${(mcap / 1e3).toFixed(1)}K`;
  return `$${mcap.toFixed(2)}`;
}

function PriceChange({ value }: { value: number | undefined | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const isPositive = value >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-mono font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function TokenRow({ token, rank }: { token: any; rank: number }) {
  const addr = token.address || "";
  const shortAddr = addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";

  return (
    <tr className="border-b border-border/20 hover:bg-primary/5 transition-colors group">
      <td className="py-3 px-3 text-center text-muted-foreground font-mono text-sm">{rank}</td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full bg-card border border-border/40" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(token.symbol || "?")[0]}
            </div>
          )}
          <div>
            <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
              {token.symbol || "???"}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
              {token.name || shortAddr}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-right font-mono text-sm font-bold text-foreground">
        {formatPrice(token.price)}
      </td>
      <td className="py-3 px-3 text-right">
        <PriceChange value={token.priceChange24hPercent} />
      </td>
      <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
        {formatVolume(token.volume24hUSD)}
      </td>
      <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
        {formatMcap(token.mc)}
      </td>
      <td className="py-3 px-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
        {formatVolume(token.liquidity)}
      </td>
      <td className="py-3 px-3 text-center hidden sm:table-cell">
        {addr && (
          <a
            href={`https://birdeye.so/token/${addr}?chain=solana`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </td>
    </tr>
  );
}

export default function Tokens() {
  const [interval, setInterval] = useState<"1h" | "4h" | "24h">("24h");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const { data: trendingData, isLoading, refetch, isRefetching } = trpc.tokens.trending.useQuery(
    { sortBy: "rank", interval, limit: 20 },
    { refetchInterval: 30000 } // Auto-refresh every 30s
  );

  const { data: searchData, isLoading: searchLoading } = trpc.tokens.search.useQuery(
    { keyword: searchQuery },
    { enabled: isSearching && searchQuery.length > 1 }
  );

  const handleSearch = () => {
    if (searchQuery.length > 1) {
      setIsSearching(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const tokens = isSearching ? (searchData?.tokens || []) : (trendingData?.tokens || []);
  const error = isSearching ? searchData?.error : trendingData?.error;

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
              <BarChart3 className="w-4 h-4" /> Tokens
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/play">
              <Button variant="outline" size="sm">Play</Button>
            </Link>
            <Link href="/skins">
              <Button variant="outline" size="sm">Skins</Button>
            </Link>
            <Link href="/arena">
              <Button variant="default" size="sm">Arena</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Title + Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Trending Solana Tokens
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time prices powered by Birdeye API — auto-refreshes every 30s
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Interval Selector */}
            <div className="flex bg-card/60 border border-border/40 rounded-lg overflow-hidden">
              {(["1h", "4h", "24h"] as const).map(i => (
                <button
                  key={i}
                  onClick={() => { setInterval(i); setIsSearching(false); }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold transition-colors ${
                    interval === i && !isSearching
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens by name or symbol..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length < 2) setIsSearching(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 bg-card/60 border-border/40"
            />
          </div>
          {searchQuery && (
            <>
              <Button variant="default" size="sm" onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearSearch}>Clear</Button>
            </>
          )}
        </div>

        {/* Stats Cards */}
        {!isSearching && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="bg-card/40 border-border/30">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3" /> Tokens Listed</div>
                <div className="text-lg font-bold font-mono text-foreground">{tokens.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-border/30">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Interval</div>
                <div className="text-lg font-bold font-mono text-primary">{interval}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-border/30">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Gainers</div>
                <div className="text-lg font-bold font-mono text-green-400">
                  {tokens.filter((t: any) => (t.priceChange24hPercent || 0) > 0).length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-border/30">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Losers</div>
                <div className="text-lg font-bold font-mono text-red-400">
                  {tokens.filter((t: any) => (t.priceChange24hPercent || 0) < 0).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Token Table */}
        <Card className="bg-card/40 border-border/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-card/60">
                  <th className="py-2.5 px-3 text-center text-xs font-mono text-muted-foreground w-12">#</th>
                  <th className="py-2.5 px-3 text-left text-xs font-mono text-muted-foreground">Token</th>
                  <th className="py-2.5 px-3 text-right text-xs font-mono text-muted-foreground">Price</th>
                  <th className="py-2.5 px-3 text-right text-xs font-mono text-muted-foreground">24h %</th>
                  <th className="py-2.5 px-3 text-right text-xs font-mono text-muted-foreground hidden md:table-cell">Volume</th>
                  <th className="py-2.5 px-3 text-right text-xs font-mono text-muted-foreground hidden lg:table-cell">MCap</th>
                  <th className="py-2.5 px-3 text-right text-xs font-mono text-muted-foreground hidden lg:table-cell">Liquidity</th>
                  <th className="py-2.5 px-3 text-center text-xs font-mono text-muted-foreground hidden sm:table-cell">Link</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || searchLoading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading tokens...</p>
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-muted-foreground">
                      {isSearching ? "No tokens found for your search." : "No trending tokens available."}
                    </td>
                  </tr>
                ) : (
                  tokens.map((token: any, i: number) => (
                    <TokenRow key={token.address || i} token={token} rank={i + 1} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Birdeye Attribution */}
        <div className="text-center mt-4 text-xs text-muted-foreground">
          Data powered by{" "}
          <a href="https://birdeye.so" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Birdeye
          </a>{" "}
          — Solana DeFi analytics
        </div>
      </div>
    </div>
  );
}
