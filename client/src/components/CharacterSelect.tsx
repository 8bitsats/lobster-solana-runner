import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface CharacterSelectProps {
  onSelect: (character: any) => void;
  selectedId?: number;
}

export default function CharacterSelect({ onSelect, selectedId }: CharacterSelectProps) {
  const { data: characters } = trpc.characters.list.useQuery();
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (!characters || characters.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-bold text-primary mb-3 font-[Orbitron] uppercase tracking-wider">Choose Your Character</h3>
      <div className="grid grid-cols-3 gap-3">
        {characters.map(char => {
          const abilities = typeof char.abilities === "string" ? JSON.parse(char.abilities) : char.abilities as any;
          const isSelected = selectedId === char.id;
          const isHovered = hoveredId === char.id;

          return (
            <div
              key={char.id}
              onClick={() => onSelect(char)}
              onMouseEnter={() => setHoveredId(char.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative rounded-xl p-3 cursor-pointer transition-all duration-300 border-2 ${
                isSelected
                  ? "border-primary bg-primary/15 shadow-lg shadow-primary/30 scale-[1.02]"
                  : "border-border/30 bg-background/20 hover:border-primary/50 hover:bg-background/40"
              }`}
            >
              {/* Glow effect */}
              {isSelected && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
              )}

              {/* Character emoji */}
              <div className="text-center mb-2">
                <span className={`text-4xl transition-transform duration-300 inline-block ${isHovered || isSelected ? "scale-110" : ""}`}>
                  {char.emoji}
                </span>
              </div>

              {/* Name and class */}
              <h4 className="text-sm font-bold text-center" style={{ color: char.primaryColor }}>
                {char.name}
              </h4>
              <p className="text-[10px] text-muted-foreground text-center">{char.role}</p>

              {/* Rarity badge */}
              <div className="flex justify-center mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  char.rarity === "mythic" ? "bg-purple-500/20 text-purple-300" :
                  char.rarity === "legendary" ? "bg-amber-500/20 text-amber-300" :
                  "bg-blue-500/20 text-blue-300"
                }`}>{char.rarity.toUpperCase()}</span>
              </div>

              {/* Mini stat bars */}
              <div className="mt-2 space-y-0.5">
                {[
                  { label: "SPD", value: char.speed, color: "#22d3ee" },
                  { label: "COIN", value: char.coinBonus, color: "#fbbf24" },
                  { label: "HP", value: char.survivability, color: "#4ade80" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1 text-[9px]">
                    <span className="w-7 text-muted-foreground">{s.label}</span>
                    <div className="flex-1 h-1 bg-background/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Abilities tooltip on hover */}
              {isHovered && abilities && (
                <div className="absolute left-full top-0 ml-2 z-50 bg-card border border-primary/30 rounded-lg p-3 w-56 shadow-xl pointer-events-none">
                  <h5 className="text-xs font-bold mb-2" style={{ color: char.primaryColor }}>{char.name} Abilities</h5>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Passive: </span>
                      <span className="font-bold">{abilities.passive?.icon} {abilities.passive?.name}</span>
                      <p className="text-muted-foreground text-[10px]">{abilities.passive?.description}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Active: </span>
                      <span className="font-bold">{abilities.active?.icon} {abilities.active?.name}</span>
                      <p className="text-muted-foreground text-[10px]">{abilities.active?.description}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ultimate: </span>
                      <span className="font-bold">{abilities.ultimate?.icon} {abilities.ultimate?.name}</span>
                      <p className="text-muted-foreground text-[10px]">{abilities.ultimate?.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
