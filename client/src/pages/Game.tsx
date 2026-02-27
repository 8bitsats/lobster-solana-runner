import { useRef, useEffect, useState, useCallback } from "react";
import { useGameEngine } from "@/components/GameEngine";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Zap, ChevronLeft, ChevronRight, ArrowUp, Shield, Magnet, Rocket, Eye, Wallet, CheckCircle, Loader2, Coins, Clock, CreditCard, X } from "lucide-react";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { toast } from "sonner";
import TokenTicker from "@/components/TokenTicker";
import CharacterSelect from "@/components/CharacterSelect";
import ShareOnX from "@/components/ShareOnX";
import LiveChat from "@/components/LiveChat";

type GameScreen = "title" | "playing" | "gameover";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [screen, setScreen] = useState<GameScreen>("title");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [solEarned, setSolEarned] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [chaserDanger, setChaserDanger] = useState(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [speedBoostActive, setSpeedBoostActive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "claimed" | "error">("idle");
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [claimAmount, setClaimAmount] = useState<number>(0);

  // Credit system state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1);
  const [depositLoading, setDepositLoading] = useState(false);
  const [isPaidGame, setIsPaidGame] = useState(false);
  const [spendingCredit, setSpendingCredit] = useState(false);

  const saveSession = trpc.game.saveSession.useMutation({
    onSuccess: (data: any) => {
      if (data?.id) setSessionId(data.id);
    },
  });
  const shareReplay = trpc.replays.share.useMutation({
    onSuccess: (data: any) => {
      if (data?.shareCode) setShareCode(data.shareCode);
    },
  });

  const claimPrize = trpc.treasury.claimPrize.useMutation({
    onSuccess: (data: any) => {
      setClaimStatus("claimed");
      setClaimTx(data.signature);
      setClaimAmount(data.amountSol);
      toast.success(`Claimed ${data.amountSol.toFixed(6)} SOL!`);
    },
    onError: (err: any) => {
      setClaimStatus("error");
      toast.error(err.message || "Claim failed");
    },
  });

  // Credit system queries & mutations
  const creditBalance = trpc.credits.balance.useQuery(undefined, { enabled: !!user });
  const depositMutation = trpc.credits.deposit.useMutation();
  const verifyDepositMutation = trpc.credits.verifyDeposit.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.creditsAdded} credits added! Balance: ${data.newBalance}`);
      setShowDepositModal(false);
      setDepositLoading(false);
      creditBalance.refetch();
    },
    onError: (e) => { toast.error(e.message); setDepositLoading(false); },
  });
  const spendCreditMutation = trpc.credits.spend.useMutation({
    onSuccess: () => {
      setIsPaidGame(true);
      setSpendingCredit(false);
      creditBalance.refetch();
      handleStart();
    },
    onError: (e) => { toast.error(e.message); setSpendingCredit(false); },
  });

  const handleClaimPrize = () => {
    if (!sessionId || !walletAddress) return;
    setClaimStatus("claiming");
    claimPrize.mutate({ gameSessionId: sessionId, walletAddress });
  };

  const handleDeposit = async () => {
    if (!walletAddress || !user) return;
    setDepositLoading(true);
    try {
      const depositInfo = await depositMutation.mutateAsync({
        creditsToBuy: depositAmount,
        walletAddress,
      });

      // Build and sign the SOL transfer transaction via Phantom
      const solana = (window as any).solana;
      if (!solana?.isPhantom) { toast.error("Phantom wallet not found"); setDepositLoading(false); return; }

      const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(depositInfo.treasuryAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: depositInfo.lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const { signature } = await solana.signAndSendTransaction(transaction);

      // Verify on backend and add credits
      verifyDepositMutation.mutate({
        txSignature: signature,
        creditsToBuy: depositAmount,
        walletAddress,
      });
    } catch (err: any) {
      if (err?.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(err?.message || "Deposit failed");
      }
      setDepositLoading(false);
    }
  };

  const handlePaidPlay = () => {
    setSpendingCredit(true);
    spendCreditMutation.mutate();
  };

  const handleScoreUpdate = useCallback((s: number, c: number, d: number, sol: number, extra?: any) => {
    setScore(s);
    setCoins(c);
    setDistance(d);
    setSolEarned(sol);
    if (extra) {
      setShieldActive(!!extra.shieldActive);
      setMagnetActive(!!extra.magnetActive);
      setSpeedBoostActive(!!extra.speedBoostActive);
    }
  }, []);

  const handleGameOver = useCallback((state: { score: number; distance: number; coins: number; solEarned: number; survivalTime: number }) => {
    setScreen("gameover");
    setSurvivalTime(state.survivalTime);
    if (user) {
      saveSession.mutate({
        score: state.score,
        distance: state.distance,
        coinsCollected: state.coins,
        survivalTimeMs: Math.floor(state.survivalTime * 1000),
        outcome: "fail",
        walletAddress: walletAddress || undefined,
        solEarned: state.solEarned.toFixed(6),
      });
    }
  }, [user, walletAddress, saveSession]);

  const { init, startGame, stopGame, gameReady, handleTouchLeft, handleTouchRight, handleTouchJump, getChaserProgress } = useGameEngine(canvasRef, {
    onScoreUpdate: handleScoreUpdate,
    onGameOver: handleGameOver,
  });

  useEffect(() => {
    const cleanup = init();
    return () => { cleanup?.(); };
  }, [init]);

  useEffect(() => {
    if (screen !== "playing") return;
    const interval = setInterval(() => {
      setChaserDanger(getChaserProgress());
    }, 100);
    return () => clearInterval(interval);
  }, [screen, getChaserProgress]);

  const handleStart = () => {
    setScreen("playing");
    setScore(0); setCoins(0); setDistance(0); setSolEarned(0);
    setShareCode(null); setSessionId(null);
    startGame();
  };

  const handleRestart = () => {
    setScreen("playing");
    setScore(0); setCoins(0); setDistance(0); setSolEarned(0);
    setShareCode(null); setSessionId(null);
    setClaimStatus("idle"); setClaimTx(null); setClaimAmount(0);
    setIsPaidGame(false);
    startGame();
  };

  const handleBackToTitle = () => {
    setScreen("title");
    stopGame();
  };

  const handleShareReplay = () => {
    if (!user || !sessionId) return;
    shareReplay.mutate({
      gameSessionId: sessionId,
      characterSlug: selectedCharacter?.slug,
      mapName: "deep_ocean",
      score, distance, coinsCollected: coins,
    });
  };

  const linkWalletMutation = trpc.wallet.link.useMutation({
    onSuccess: () => toast.success("Wallet linked to your account!"),
    onError: (e: any) => {
      if (!e.message?.includes("already")) toast.error("Failed to link wallet");
    },
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
      if (user) {
        linkWalletMutation.mutate({ walletAddress: addr });
      }
    } catch { /* user rejected */ }
    setWalletConnecting(false);
  };

  const disconnectWallet = async () => {
    const solana = (window as any).solana;
    if (solana) await solana.disconnect();
    setWalletAddress(null);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#041830]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: "none" }} />
      <div className="absolute inset-0 pointer-events-none scanlines z-[5]" />

      {/* Token Ticker during gameplay */}
      {screen === "playing" && (
        <div className="absolute top-0 left-0 right-0 z-[8]">
          <TokenTicker visible={true} compact />
        </div>
      )}

      {/* ─── HUD ─── */}
      {screen === "playing" && (
        <>
          <div className="absolute top-9 left-0 right-0 flex justify-between items-start p-3 sm:p-4 pointer-events-none z-10">
            <div className="flex gap-2 sm:gap-3 items-start">
              <div className="bg-[#041830]/85 border border-sol-purple/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-[9px] text-sol-purple tracking-[3px] uppercase">SOL</div>
                <div className="font-['Orbitron'] text-base font-bold text-sol-green text-glow-green">{solEarned.toFixed(4)}</div>
              </div>
              <div className="bg-[#041830]/85 border border-sol-purple/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-[9px] text-sol-purple tracking-[3px] uppercase">Coins</div>
                <div className="font-['Orbitron'] text-base font-bold text-gold">{coins}</div>
              </div>
              <div className="bg-[#041830]/85 border border-sol-purple/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-[9px] text-sol-purple tracking-[3px] uppercase">Dist</div>
                <div className="font-['Orbitron'] text-base font-bold text-white">{typeof distance === 'number' ? distance.toFixed(1) : distance}m</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              {/* Active power-ups */}
              <div className="flex gap-1">
                {shieldActive && (
                  <div className="bg-blue-500/30 border border-blue-400/50 rounded-lg p-1.5 animate-pulse">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                {magnetActive && (
                  <div className="bg-amber-500/30 border border-amber-400/50 rounded-lg p-1.5 animate-pulse">
                    <Magnet className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                {speedBoostActive && (
                  <div className="bg-green-500/30 border border-green-400/50 rounded-lg p-1.5 animate-pulse">
                    <Rocket className="w-4 h-4 text-green-400" />
                  </div>
                )}
              </div>

              <div className="bg-[#041830]/85 border border-sol-purple/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="text-[9px] text-sol-purple tracking-[3px] uppercase">Score</div>
                <div className="font-['Orbitron'] text-base font-bold text-sol-green text-glow-green">{score.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Character indicator */}
          {selectedCharacter && (
            <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-[#041830]/85 border border-sol-purple/40 rounded-lg px-3 py-1 backdrop-blur-sm z-10 pointer-events-none">
              <span className="text-lg">{selectedCharacter.emoji}</span>
              <span className="text-[9px] text-sol-purple ml-1">{selectedCharacter.name}</span>
            </div>
          )}

          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="absolute top-20 right-3 z-20 bg-[#041830]/85 border border-sol-purple/40 rounded-lg p-2 text-white/60 hover:text-white transition-colors"
          >
            💬
          </button>

          {/* Live chat sidebar */}
          {showChat && (
            <div className="absolute top-28 right-3 w-72 z-20">
              <LiveChat roomId="game-spectate" compact />
            </div>
          )}

          {/* Controls hint */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/30 tracking-[2px] text-center z-10 pointer-events-none hidden sm:block">
            ← → LANES &nbsp;&nbsp; SPACE / ↑ JUMP
          </div>

          {/* Chaser danger bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 z-10 pointer-events-none">
            <div className="h-full transition-all duration-100" style={{
              width: `${chaserDanger * 100}%`,
              background: `linear-gradient(90deg, #9945ff, #ff2244)`,
              boxShadow: `0 0 8px rgba(255,34,68,0.8)`,
            }} />
          </div>

          {/* Mobile controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4 z-10 sm:hidden">
            <div className="flex gap-2 items-end">
              <button onTouchStart={handleTouchLeft} className="w-14 h-14 bg-sol-purple/25 border border-sol-purple/50 rounded-xl flex items-center justify-center active:bg-sol-purple/50 select-none">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onTouchStart={handleTouchJump} className="w-14 h-14 bg-sol-green/25 border border-sol-green/50 rounded-xl flex items-center justify-center active:bg-sol-green/50 select-none">
                <ArrowUp className="w-6 h-6" />
              </button>
              <button onTouchStart={handleTouchRight} className="w-14 h-14 bg-sol-purple/25 border border-sol-purple/50 rounded-xl flex items-center justify-center active:bg-sol-purple/50 select-none">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── TITLE SCREEN ─── */}
      {screen === "title" && (
        <div className="absolute inset-0 flex flex-col items-center z-[100] bg-gradient-radial from-[#041830]/95 to-[#020c18]/98 overflow-y-auto py-6">
          <Link href="/" className="absolute top-4 left-4 text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <h1 className="font-['Orbitron'] text-3xl sm:text-5xl lg:text-6xl font-black tracking-wider bg-gradient-to-r from-sol-purple to-sol-green bg-clip-text text-transparent animate-pulse mb-1 mt-8">
            LOBSTER RUNNER
          </h1>
          <p className="text-xs text-white/40 tracking-[6px] mb-4 uppercase">Solana Underwater Racing</p>

          {/* Character Selection */}
          <div className="w-[90%] max-w-lg mb-4">
            <CharacterSelect onSelect={setSelectedCharacter} selectedId={selectedCharacter?.id} />
          </div>

          {/* Prize pool */}
          <div className="bg-sol-purple/10 border border-sol-purple/30 rounded-xl px-6 py-4 mb-4 max-w-sm w-[90%] text-center">
            <h3 className="font-['Orbitron'] text-xs text-sol-purple tracking-[3px] mb-1">PRIZE POOL</h3>
            <span className="font-['Orbitron'] text-2xl font-bold text-sol-green text-glow-green block mb-1">0.05 SOL</span>
            <p className="text-xs text-white/60 leading-relaxed">
              Collect pearls. Dodge obstacles. Outrun the predator.
            </p>
          </div>

          {/* Wallet */}
          <div className="mb-4">
            {walletAddress ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 bg-[#041830] border border-sol-green/40 rounded-lg px-4 py-2">
                  <Zap className="w-4 h-4 text-sol-green" />
                  <span className="font-['Orbitron'] text-xs text-sol-green">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                </div>
                <button onClick={disconnectWallet} className="text-[10px] text-white/30 hover:text-white/60">Disconnect</button>
              </div>
            ) : (
              <Button onClick={connectWallet} disabled={walletConnecting} className="font-['Orbitron'] text-xs tracking-wider bg-gradient-to-r from-sol-purple to-purple-700 hover:brightness-110 text-white border-none glow-purple">
                <Zap className="w-4 h-4 mr-2" />
                {walletConnecting ? "CONNECTING..." : "CONNECT PHANTOM"}
              </Button>
            )}
          </div>

          {/* Credit Balance & Paid Play */}
          {user && walletAddress && creditBalance.data && (
            <div className="bg-[#041830]/80 border border-gold/30 rounded-xl px-5 py-3 mb-4 max-w-sm w-[90%]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gold" />
                  <span className="font-['Orbitron'] text-xs text-gold tracking-[2px]">CREDITS</span>
                </div>
                <span className="font-['Orbitron'] text-lg font-bold text-gold">{creditBalance.data.balance}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/40 mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {creditBalance.data.remainingToday}/{creditBalance.data.dailyLimit} games left today
                </span>
                <span>{creditBalance.data.entryFee} SOL/credit</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDepositModal(true)}
                  size="sm"
                  className="flex-1 font-['Orbitron'] text-[10px] tracking-wider bg-gradient-to-r from-gold/80 to-amber-600 text-[#041830] hover:brightness-110"
                >
                  <Coins className="w-3 h-3 mr-1" /> BUY CREDITS
                </Button>
                <Button
                  onClick={handlePaidPlay}
                  size="sm"
                  disabled={spendingCredit || creditBalance.data.balance < 1 || creditBalance.data.remainingToday < 1}
                  className="flex-1 font-['Orbitron'] text-[10px] tracking-wider bg-gradient-to-r from-sol-purple to-indigo-500 text-white hover:brightness-110"
                >
                  {spendingCredit ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" /> PAID PLAY</>}
                </Button>
              </div>
            </div>
          )}

          {/* Play buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={handleStart} className="font-['Orbitron'] text-sm tracking-[2px] px-8 py-6 bg-gradient-to-r from-sol-green to-emerald-500 text-[#041830] font-bold hover:brightness-110 glow-green">
              ▶ FREE PLAY
            </Button>
            <Link href="/leaderboard">
              <Button variant="outline" className="font-['Orbitron'] text-xs tracking-wider px-6 py-6 border-sol-purple/40 text-sol-purple bg-transparent">
                <Trophy className="w-4 h-4 mr-2" /> LEADERBOARD
              </Button>
            </Link>
          </div>

          <div className="mt-4 text-[10px] text-white/25 tracking-[2px] text-center">
            {selectedCharacter ? `PLAYING AS: ${selectedCharacter.name} · ` : ""}NETWORK: MAINNET · WALLET: PHANTOM
          </div>
        </div>
      )}

      {/* ─── GAME OVER SCREEN ─── */}
      {screen === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] bg-[#041830]/95 backdrop-blur-sm">
          <div className="font-['Orbitron'] text-2xl text-lobster-red mb-2" style={{ textShadow: "0 0 20px rgba(255,71,87,0.6)" }}>
            CAUGHT!
          </div>
          <p className="text-sm text-white/40 mb-4">
            Survived {survivalTime.toFixed(1)}s · Collected {coins} pearls
          </p>

          {/* Character played */}
          {selectedCharacter && (
            <div className="flex items-center gap-2 mb-4 bg-[#041830]/80 border border-sol-purple/30 rounded-lg px-4 py-2">
              <span className="text-2xl">{selectedCharacter.emoji}</span>
              <div>
                <div className="text-sm font-bold" style={{ color: selectedCharacter.primaryColor }}>{selectedCharacter.name}</div>
                <div className="text-[10px] text-muted-foreground">{selectedCharacter.role}</div>
              </div>
            </div>
          )}

          {/* Score summary */}
          <div className="bg-sol-purple/10 border border-sol-purple/30 rounded-xl px-6 py-5 mb-4 max-w-sm w-[90%]">
            <h3 className="font-['Orbitron'] text-xs text-sol-purple tracking-[3px] mb-3 text-center">RUN SUMMARY</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[10px] text-white/40 uppercase">Score</div>
                <div className="font-['Orbitron'] text-lg font-bold text-sol-green">{score.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase">Distance</div>
                <div className="font-['Orbitron'] text-lg font-bold text-white">{distance}m</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase">Coins</div>
                <div className="font-['Orbitron'] text-lg font-bold text-gold">{coins}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase">SOL Earned</div>
                <div className="font-['Orbitron'] text-lg font-bold text-sol-green">{solEarned.toFixed(4)}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap justify-center mb-3">
            <Button onClick={handleRestart} className="font-['Orbitron'] text-sm tracking-[2px] px-6 py-5 bg-gradient-to-r from-sol-green to-emerald-500 text-[#041830] font-bold hover:brightness-110">
              ↺ TRY AGAIN
            </Button>
            <Button onClick={handleBackToTitle} variant="outline" className="font-['Orbitron'] text-xs tracking-wider px-6 py-5 border-white/20 text-white/50 bg-transparent">
              ⌂ MENU
            </Button>
          </div>

          {/* Claim Prize */}
          {user && walletAddress && sessionId && (
            <div className="mb-3 w-[90%] max-w-sm">
              {claimStatus === "idle" && (
                <Button
                  onClick={handleClaimPrize}
                  className="w-full font-['Orbitron'] text-sm tracking-[2px] py-5 bg-gradient-to-r from-sol-purple to-indigo-500 text-white font-bold hover:brightness-110"
                >
                  <Wallet className="w-4 h-4 mr-2" /> CLAIM {solEarned.toFixed(4)} SOL
                </Button>
              )}
              {claimStatus === "claiming" && (
                <div className="flex items-center justify-center gap-2 bg-sol-purple/10 border border-sol-purple/30 rounded-lg py-3 text-sm text-sol-purple">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing claim on Solana mainnet...
                </div>
              )}
              {claimStatus === "claimed" && (
                <div className="bg-sol-green/10 border border-sol-green/30 rounded-lg py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-sol-green text-sm font-bold mb-1">
                    <CheckCircle className="w-4 h-4" /> {claimAmount.toFixed(6)} SOL Claimed!
                  </div>
                  {claimTx && (
                    <a
                      href={`https://solscan.io/tx/${claimTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sol-purple hover:underline"
                    >
                      View on Solscan →
                    </a>
                  )}
                </div>
              )}
              {claimStatus === "error" && (
                <div className="text-center">
                  <div className="text-xs text-red-400 mb-2">Claim failed. Try again?</div>
                  <Button onClick={handleClaimPrize} variant="outline" size="sm" className="border-red-400/30 text-red-400 bg-transparent">
                    Retry Claim
                  </Button>
                </div>
              )}
            </div>
          )}
          {user && !walletAddress && (
            <div className="mb-3 text-xs text-white/40 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
              <Wallet className="w-3 h-3 inline mr-1" /> Connect your wallet to claim SOL prizes
            </div>
          )}

          {/* Share buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <ShareOnX
              score={score}
              distance={distance}
              coins={coins}
              characterName={selectedCharacter?.name}
              shareCode={shareCode || undefined}
            />
            {user && !shareCode && (
              <Button
                onClick={handleShareReplay}
                variant="outline"
                className="border-sol-purple/40 text-sol-purple bg-transparent text-xs"
                disabled={shareReplay.isPending}
              >
                <Eye className="w-4 h-4 mr-1" /> {shareReplay.isPending ? "Saving..." : "Save Replay"}
              </Button>
            )}
            {shareCode && (
              <div className="text-xs text-sol-green bg-sol-green/10 border border-sol-green/30 rounded-lg px-3 py-2">
                Replay code: <span className="font-bold">{shareCode}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DEPOSIT CREDITS MODAL ─── */}
      {showDepositModal && (
        <div className="absolute inset-0 flex items-center justify-center z-[200] bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a1e3d] border border-gold/30 rounded-2xl p-6 max-w-sm w-[90%] relative">
            <button type="button" onClick={() => { setShowDepositModal(false); setDepositLoading(false); }} className="absolute top-3 right-3 text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-['Orbitron'] text-lg font-bold text-gold mb-1">Buy Credits</h3>
            <p className="text-xs text-white/50 mb-4">
              Each credit = 1 paid game entry ({creditBalance.data?.entryFee || 0.01} SOL)
            </p>

            {/* Amount selector */}
            <div className="flex gap-2 mb-4">
              {[1, 5, 10, 25].map(amt => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setDepositAmount(amt)}
                  className={`flex-1 py-3 rounded-lg text-center font-['Orbitron'] text-sm font-bold transition-all ${
                    depositAmount === amt
                      ? "bg-gold/20 border-2 border-gold text-gold shadow-lg shadow-gold/10"
                      : "bg-white/5 border border-white/10 text-white/60 hover:border-white/30"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            <div className="bg-white/5 rounded-lg p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Credits</span>
                <span className="text-white font-bold">{depositAmount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Price per credit</span>
                <span className="text-white">{creditBalance.data?.entryFee || 0.01} SOL</span>
              </div>
              <div className="border-t border-white/10 mt-1 pt-1 flex justify-between text-sm">
                <span className="text-white/60">Total</span>
                <span className="font-['Orbitron'] font-bold text-gold">
                  {(depositAmount * (creditBalance.data?.entryFee || 0.01)).toFixed(3)} SOL
                </span>
              </div>
            </div>

            <Button
              onClick={handleDeposit}
              disabled={depositLoading || !walletAddress}
              className="w-full font-['Orbitron'] text-sm tracking-[2px] py-5 bg-gradient-to-r from-gold/80 to-amber-600 text-[#041830] font-bold hover:brightness-110"
            >
              {depositLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
              ) : (
                <><Wallet className="w-4 h-4 mr-2" /> PAY WITH PHANTOM</>
              )}
            </Button>

            {!walletAddress && (
              <p className="text-xs text-red-400 text-center mt-2">Connect wallet first</p>
            )}
          </div>
        </div>
      )}

      {/* Paid game indicator during gameplay */}
      {screen === "playing" && isPaidGame && (
        <div className="absolute top-9 left-1/2 -translate-x-1/2 mt-8 bg-gold/20 border border-gold/40 rounded-lg px-3 py-1 z-10 pointer-events-none">
          <span className="font-['Orbitron'] text-[10px] text-gold tracking-[2px]">PAID GAME</span>
        </div>
      )}
    </div>
  );
}
