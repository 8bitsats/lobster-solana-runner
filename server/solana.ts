/**
 * Solana Treasury Service
 * Uses Helius RPC for mainnet connection and DAS API for asset queries.
 * Handles SOL balance checks, micropayments to winners, and payout tracking.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { ENV } from "./_core/env";

// --- Connection & Keypair ---

let _connection: Connection | null = null;
let _treasuryKeypair: Keypair | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    if (!ENV.heliusRpcUrl) throw new Error("HELIUS_RPC_URL not configured");
    _connection = new Connection(ENV.heliusRpcUrl, "confirmed");
  }
  return _connection;
}

export function getTreasuryKeypair(): Keypair {
  if (!_treasuryKeypair) {
    if (!ENV.treasuryPrivateKey) throw new Error("TREASURY_PRIVATE_KEY not configured");
    const decoded = bs58.decode(ENV.treasuryPrivateKey);
    _treasuryKeypair = Keypair.fromSecretKey(decoded);
  }
  return _treasuryKeypair;
}

export function getTreasuryAddress(): string {
  return ENV.treasuryWalletAddress || getTreasuryKeypair().publicKey.toBase58();
}

// --- Balance Queries ---

/**
 * Get SOL balance of the treasury wallet in lamports and SOL
 */
export async function getTreasuryBalance(): Promise<{
  lamports: number;
  sol: number;
}> {
  const connection = getConnection();
  const pubkey = new PublicKey(getTreasuryAddress());
  const lamports = await connection.getBalance(pubkey);
  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
  };
}

/**
 * Get SOL balance of any wallet address
 */
export async function getWalletBalance(address: string): Promise<{
  lamports: number;
  sol: number;
}> {
  const connection = getConnection();
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey);
  return {
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
  };
}

/**
 * Get all assets owned by a wallet using Helius DAS API (getAssetsByOwner)
 */
export async function getWalletAssets(ownerAddress: string): Promise<any> {
  const rpcUrl = ENV.heliusRpcUrl;
  if (!rpcUrl) throw new Error("HELIUS_RPC_URL not configured");

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "lobster-runner-das",
      method: "getAssetsByOwner",
      params: {
        ownerAddress,
        page: 1,
        limit: 100,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
        },
      },
    }),
  });

  const data = await response.json();
  return data.result;
}

// --- SOL Transfer (Micropayments) ---

/** Minimum prize payout in SOL */
export const MIN_PRIZE_SOL = 0.001;
/** Maximum prize payout in SOL */
export const MAX_PRIZE_SOL = 0.1;

/**
 * Calculate prize amount based on game score.
 * Returns SOL amount (not lamports).
 * Formula: base 0.001 SOL + 0.000001 per score point, capped at MAX_PRIZE_SOL
 */
export function calculatePrize(score: number): number {
  const base = 0.001;
  const perPoint = 0.000001;
  const raw = base + score * perPoint;
  return Math.min(Math.max(raw, MIN_PRIZE_SOL), MAX_PRIZE_SOL);
}

/**
 * Send SOL from treasury to a recipient wallet.
 * Returns the transaction signature on success.
 */
export async function sendSolToWinner(
  recipientAddress: string,
  solAmount: number
): Promise<{ signature: string; lamports: number }> {
  if (solAmount < MIN_PRIZE_SOL) {
    throw new Error(`Prize amount ${solAmount} SOL is below minimum ${MIN_PRIZE_SOL}`);
  }
  if (solAmount > MAX_PRIZE_SOL) {
    throw new Error(`Prize amount ${solAmount} SOL exceeds maximum ${MAX_PRIZE_SOL}`);
  }

  const connection = getConnection();
  const treasury = getTreasuryKeypair();
  const recipient = new PublicKey(recipientAddress);
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  // Check treasury has enough balance (including ~0.001 SOL for fees)
  const treasuryBalance = await connection.getBalance(treasury.publicKey);
  const requiredLamports = lamports + 10000; // 10000 lamports for tx fee
  if (treasuryBalance < requiredLamports) {
    throw new Error(
      `Treasury balance (${treasuryBalance / LAMPORTS_PER_SOL} SOL) insufficient for payout of ${solAmount} SOL`
    );
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: recipient,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [treasury], {
    commitment: "confirmed",
  });

  return { signature, lamports };
}

/**
 * Verify a transaction signature exists on-chain
 */
export async function verifyTransaction(signature: string): Promise<{
  confirmed: boolean;
  slot?: number;
  blockTime?: number | null;
}> {
  const connection = getConnection();
  const status = await connection.getSignatureStatus(signature);
  if (!status.value) {
    return { confirmed: false };
  }
  return {
    confirmed: status.value.confirmationStatus === "confirmed" || status.value.confirmationStatus === "finalized",
    slot: status.value.slot,
  };
}

/**
 * Get recent transaction history for the treasury wallet
 */
export async function getTreasuryTransactions(limit = 20): Promise<any[]> {
  const connection = getConnection();
  const pubkey = new PublicKey(getTreasuryAddress());
  const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
  return signatures.map((sig) => ({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime,
    err: sig.err,
    memo: sig.memo,
  }));
}
