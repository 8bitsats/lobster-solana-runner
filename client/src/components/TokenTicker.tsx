import { trpc } from "@/lib/trpc";
import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

function formatPrice(price: number | undefined | null): string {
  if (!price) return "$0.00";
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

interface TokenTickerProps {
  visible?: boolean;
  compact?: boolean;
}

export default function TokenTicker({ visible = true, compact = false }: TokenTickerProps) {
  const { data } = trpc.tokens.trending.useQuery(
    { sortBy: "rank", interval: "24h", limit: 10 },
    { refetchInterval: 30000, enabled: visible }
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const tokens = data?.tokens || [];

  if (!visible || tokens.length === 0) return null;

  // Duplicate tokens for seamless scroll
  const displayTokens = [...tokens, ...tokens];

  return (
    <div
      className={`w-full overflow-hidden ${compact ? "bg-black/60" : "bg-black/80"} backdrop-blur-sm border-b border-primary/20`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center h-8">
        {/* Label */}
        <div className="flex-shrink-0 px-3 flex items-center gap-1.5 border-r border-primary/20 h-full bg-primary/10">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">Live</span>
        </div>

        {/* Scrolling Ticker */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={scrollRef}
            className={`flex items-center gap-6 whitespace-nowrap ticker-scroll ${isPaused ? "paused" : ""}`}
            style={{
              animation: `ticker-scroll ${tokens.length * 4}s linear infinite`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {displayTokens.map((token: any, i: number) => {
              const change = token.priceChange24hPercent || 0;
              const isPositive = change >= 0;

              return (
                <div key={`${token.address}-${i}`} className="flex items-center gap-2 flex-shrink-0">
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-4 h-4 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
                      {(token.symbol || "?")[0]}
                    </div>
                  )}
                  <span className="text-xs font-mono font-bold text-foreground">
                    {token.symbol}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatPrice(token.price)}
                  </span>
                  <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5" />
                    )}
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-border/40 mx-1">|</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
