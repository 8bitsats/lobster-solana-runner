import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface ShareOnXProps {
  score: number;
  distance: number;
  coins: number;
  characterName?: string;
  shareCode?: string;
  className?: string;
}

export default function ShareOnX({ score, distance, coins, characterName, shareCode, className }: ShareOnXProps) {
  const handleShare = () => {
    const lines = [
      `🦞 I just scored ${score.toLocaleString()} in Lobster Solana Runner!`,
      ``,
      `📏 Distance: ${distance}m`,
      `🪙 Coins: ${coins}`,
    ];
    if (characterName) lines.push(`🎮 Playing as: ${characterName}`);
    lines.push(``);
    lines.push(`Can you beat my score? 🏆`);
    if (shareCode) lines.push(`Replay: ${window.location.origin}/replay/${shareCode}`);
    lines.push(`\n#LobsterRunner #Solana #Web3Gaming`);

    const text = lines.join("\n");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  return (
    <Button
      onClick={handleShare}
      className={`bg-black hover:bg-gray-900 text-white border border-gray-700 ${className || ""}`}
    >
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share on X
    </Button>
  );
}
