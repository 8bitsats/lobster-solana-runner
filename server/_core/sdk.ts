import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const supabaseAdmin = createClient(
  ENV.supabaseUrl,
  ENV.supabaseServiceRoleKey,
);

class AuthService {
  async authenticateRequest(req: Request): Promise<User> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);

    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      throw new Error("Invalid or expired token");
    }

    const signedInAt = new Date();
    let user = await db.getUserBySupabaseId(supabaseUser.id);

    if (!user) {
      await db.upsertUser({
        supabaseId: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || null,
        email: supabaseUser.email ?? null,
        loginMethod: supabaseUser.app_metadata?.provider ?? "email",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserBySupabaseId(supabaseUser.id);
    } else {
      await db.upsertUser({
        supabaseId: user.supabaseId,
        lastSignedIn: signedInAt,
      });
    }

    if (!user) {
      throw new Error("User not found after upsert");
    }

    return user;
  }
}

export const sdk = new AuthService();
