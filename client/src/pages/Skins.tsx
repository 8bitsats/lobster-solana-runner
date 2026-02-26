import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Lock, ShoppingCart, Sparkles, Crown, Glasses, Anchor, Radio, Shirt } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const RARITY_COLORS: Record<string, string> = {
  common: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  uncommon: "bg-green-500/20 text-green-300 border-green-500/40",
  rare: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  epic: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  legendary: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
};

const ACCESSORY_ICONS: Record<string, any> = {
  none: null,
  crown: Crown,
  sunglasses: Glasses,
  tophat: Sparkles,
  pirate: Anchor,
  antenna: Radio,
  cape: Shirt,
};

function LobsterPreview({ skin, size = 180 }: { skin: any; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 0.5, 0);

    const ambient = new THREE.AmbientLight(0x6688cc, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(2, 4, 3);
    scene.add(dir);

    if (skin.glowColor) {
      const glow = new THREE.PointLight(parseInt(skin.glowColor.replace("#", "0x")), 1, 8);
      glow.position.set(0, 1, 1);
      scene.add(glow);
    }

    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 12);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: skin.bodyColor,
      shininess: 80,
      emissive: skin.glowColor ? parseInt(skin.glowColor.replace("#", "0x")) : 0x000000,
      emissiveIntensity: skin.glowColor ? 0.15 : 0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.5;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: skin.headColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.55, 0.6);
    group.add(head);

    // Eyes
    [-0.15, 0.15].forEach(x => {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6),
        new THREE.MeshPhongMaterial({ color: skin.headColor })
      );
      stalk.position.set(x, 0.85, 0.65);
      group.add(stalk);
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 6),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
      );
      eyeWhite.position.set(x, 0.98, 0.68);
      group.add(eyeWhite);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshPhongMaterial({ color: skin.eyeColor })
      );
      eye.position.set(x, 0.98, 0.73);
      group.add(eye);
    });

    // Claws
    const clawMat = new THREE.MeshPhongMaterial({ color: skin.clawColor });
    [-0.55, 0.55].forEach(x => {
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.4), clawMat);
      claw.position.set(x, 0.35, 0.3);
      group.add(claw);
      const pincer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.2), clawMat);
      pincer.position.set(x, 0.42, 0.5);
      group.add(pincer);
    });

    // Tail
    const tailMat = new THREE.MeshPhongMaterial({ color: skin.tailColor });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35 - i * 0.06, 0.15, 6, 8),
        tailMat
      );
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0.45 - i * 0.03, -0.5 - i * 0.2);
      group.add(seg);
    }

    // Accessory
    if (skin.accessory === "crown") {
      const crownMat = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0x886600, emissiveIntensity: 0.3 });
      const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 8), crownMat);
      crownBase.position.set(0, 1.1, 0.65);
      group.add(crownBase);
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), crownMat);
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.15, 1.2, 0.65 + Math.sin(angle) * 0.15);
        group.add(spike);
      }
    } else if (skin.accessory === "sunglasses") {
      const glassMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 100 });
      const frameMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
      [-0.15, 0.15].forEach(x => {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.02), glassMat);
        lens.position.set(x, 0.96, 0.78);
        group.add(lens);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), frameMat);
      bridge.position.set(0, 0.96, 0.78);
      group.add(bridge);
    } else if (skin.accessory === "pirate") {
      const hatMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.15, 6), hatMat);
      hat.position.set(0, 1.1, 0.65);
      hat.rotation.z = 0.15;
      group.add(hat);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 8), hatMat);
      brim.position.set(0, 1.03, 0.65);
      group.add(brim);
    }

    // Pattern effects
    if (skin.pattern === "striped" && skin.glowColor) {
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.82, 0.03, 0.05),
          new THREE.MeshBasicMaterial({ color: skin.glowColor })
        );
        stripe.position.set(0, 0.3 + i * 0.2, 0.4);
        stripe.rotation.x = Math.PI / 2;
        group.add(stripe);
      }
    }

    scene.add(group);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      group.rotation.y = Math.sin(t * 0.8) * 0.3;
      group.position.y = Math.sin(t * 1.2) * 0.05;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [skin, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="mx-auto" />;
}

export default function Skins() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedSkin, setSelectedSkin] = useState<number | null>(null);

  const { data: allSkins, isLoading: skinsLoading } = trpc.skins.list.useQuery();
  const { data: mySkins, isLoading: mySkinsLoading, refetch: refetchMySkins } = trpc.skins.mySkins.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: equippedSkin, refetch: refetchEquipped } = trpc.skins.equipped.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const purchaseMutation = trpc.skins.purchase.useMutation({
    onSuccess: () => {
      toast.success("Skin purchased!");
      refetchMySkins();
    },
    onError: (e) => toast.error(e.message),
  });

  const equipMutation = trpc.skins.equip.useMutation({
    onSuccess: () => {
      toast.success("Skin equipped!");
      refetchEquipped();
      refetchMySkins();
    },
    onError: (e) => toast.error(e.message),
  });

  const isOwned = (skinId: number) => mySkins?.some(s => s.skin.id === skinId);
  const isEquipped = (skinId: number) => equippedSkin?.id === skinId;

  const previewSkin = selectedSkin !== null
    ? allSkins?.find(s => s.id === selectedSkin)
    : equippedSkin || allSkins?.[0];

  if (skinsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <span className="text-foreground font-semibold">Customize</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/play">
              <Button variant="outline" size="sm">Play</Button>
            </Link>
            <Link href="/tokens">
              <Button variant="outline" size="sm">Tokens</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-card/60 border-border/40 sticky top-20">
              <CardHeader>
                <CardTitle className="text-center font-mono">
                  {previewSkin?.name || "Select a Skin"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {previewSkin && (
                  <>
                    <div className="bg-gradient-to-b from-[#041830] to-[#0a2a4a] rounded-xl p-4 w-full flex justify-center">
                      <LobsterPreview skin={previewSkin} size={200} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={RARITY_COLORS[previewSkin.rarity]}>
                        {previewSkin.rarity}
                      </Badge>
                      {previewSkin.accessory !== "none" && (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {previewSkin.accessory}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-muted-foreground/40">
                        {previewSkin.pattern}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {previewSkin.description}
                    </p>

                    {isAuthenticated && (
                      <div className="w-full space-y-2">
                        {isOwned(previewSkin.id) ? (
                          isEquipped(previewSkin.id) ? (
                            <Button disabled className="w-full" variant="outline">
                              <Check className="w-4 h-4 mr-2" /> Equipped
                            </Button>
                          ) : (
                            <Button
                              className="w-full"
                              onClick={() => equipMutation.mutate({ skinId: previewSkin.id })}
                              disabled={equipMutation.isPending}
                            >
                              {equipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              Equip Skin
                            </Button>
                          )
                        ) : previewSkin.price === 0 ? (
                          <Button
                            className="w-full"
                            onClick={() => purchaseMutation.mutate({ skinId: previewSkin.id })}
                            disabled={purchaseMutation.isPending}
                          >
                            Claim Free Skin
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => purchaseMutation.mutate({ skinId: previewSkin.id })}
                            disabled={purchaseMutation.isPending}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buy for {previewSkin.price.toLocaleString()} coins
                          </Button>
                        )}
                      </div>
                    )}

                    {!isAuthenticated && (
                      <a href={"/"}>
                        <Button className="w-full">Login to Purchase</Button>
                      </a>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skin Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold font-mono mb-6">Lobster Skins</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allSkins?.map(skin => {
                const owned = isOwned(skin.id);
                const equipped = isEquipped(skin.id);
                const selected = selectedSkin === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => setSelectedSkin(skin.id)}
                    className={`cursor-pointer rounded-xl border-2 p-3 transition-all duration-200 hover:scale-105 ${
                      selected
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                        : equipped
                        ? "border-green-500/60 bg-green-500/5"
                        : owned
                        ? "border-border/60 bg-card/40"
                        : "border-border/30 bg-card/20 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="bg-gradient-to-b from-[#041830] to-[#0a2a4a] rounded-lg mb-2 flex justify-center p-1">
                      <LobsterPreview skin={skin} size={100} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold font-mono truncate">{skin.name}</p>
                      <Badge className={`text-[10px] mt-1 ${RARITY_COLORS[skin.rarity]}`}>
                        {skin.rarity}
                      </Badge>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {equipped ? (
                          <span className="text-green-400 font-bold">✓ EQUIPPED</span>
                        ) : owned ? (
                          <span className="text-blue-400">OWNED</span>
                        ) : skin.price === 0 ? (
                          <span className="text-green-400">FREE</span>
                        ) : (
                          <span>{skin.price.toLocaleString()} coins</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
