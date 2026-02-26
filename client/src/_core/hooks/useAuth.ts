import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const utils = trpc.useUtils();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
      // Invalidate tRPC queries when auth state changes
      utils.auth.me.invalidate();
    });

    return () => subscription.unsubscribe();
  }, [utils]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!session,
  });

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const loginWithOAuth = useCallback(async (provider: "google" | "github" | "discord") => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: sessionLoading || (!!session && meQuery.isLoading),
    error: meQuery.error ?? null,
    isAuthenticated: !!session && Boolean(meQuery.data),
    session,
  }), [meQuery.data, meQuery.error, meQuery.isLoading, session, sessionLoading]);

  return {
    ...state,
    login,
    signUp,
    loginWithOAuth,
    logout,
    refresh: () => meQuery.refetch(),
  };
}
