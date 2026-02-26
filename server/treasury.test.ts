import { describe, expect, it } from "vitest";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

describe("treasury secrets validation", () => {
  it("TREASURY_WALLET_ADDRESS is a valid Solana public key", () => {
    const addr = process.env.TREASURY_WALLET_ADDRESS;
    expect(addr).toBeTruthy();
    expect(() => new PublicKey(addr!)).not.toThrow();
  });

  it("TREASURY_PRIVATE_KEY decodes to a valid Keypair", () => {
    const pk = process.env.TREASURY_PRIVATE_KEY;
    expect(pk).toBeTruthy();
    const decoded = bs58.decode(pk!);
    expect(decoded.length).toBe(64);
    const keypair = Keypair.fromSecretKey(decoded);
    expect(keypair.publicKey.toBase58()).toBeTruthy();
  });

  it("TREASURY_PRIVATE_KEY matches TREASURY_WALLET_ADDRESS", () => {
    const pk = process.env.TREASURY_PRIVATE_KEY!;
    const addr = process.env.TREASURY_WALLET_ADDRESS!;
    const keypair = Keypair.fromSecretKey(bs58.decode(pk));
    expect(keypair.publicKey.toBase58()).toBe(addr);
  });

  it("HELIUS_RPC_URL is set and reachable", async () => {
    const rpcUrl = process.env.HELIUS_RPC_URL;
    expect(rpcUrl).toBeTruthy();
    const connection = new Connection(rpcUrl!);
    const version = await connection.getVersion();
    expect(version).toBeTruthy();
    expect(version["solana-core"]).toBeTruthy();
  }, 15000);

  it("can fetch treasury SOL balance via Helius RPC", async () => {
    const rpcUrl = process.env.HELIUS_RPC_URL!;
    const addr = process.env.TREASURY_WALLET_ADDRESS!;
    const connection = new Connection(rpcUrl);
    const balance = await connection.getBalance(new PublicKey(addr));
    expect(typeof balance).toBe("number");
    expect(balance).toBeGreaterThanOrEqual(0);
  }, 15000);
});
