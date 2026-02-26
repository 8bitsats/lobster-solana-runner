CREATE TYPE "public"."agent_difficulty" AS ENUM('cautious', 'balanced', 'aggressive', 'reckless');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('openclaw', 'autonomous', 'bot');--> statement-breakpoint
CREATE TYPE "public"."character_rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard', 'elite');--> statement-breakpoint
CREATE TYPE "public"."market_outcome" AS ENUM('pending', 'yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('open', 'locked', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."market_type" AS ENUM('agent_win', 'score_threshold', 'head_to_head');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('waiting', 'ready', 'playing', 'finished', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('human_vs_human', 'agent_vs_agent', 'human_vs_agent');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('chat', 'system', 'cheer', 'prediction');--> statement-breakpoint
CREATE TYPE "public"."model_provider" AS ENUM('xai', 'openai', 'anthropic');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('win', 'fail', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."player_type" AS ENUM('human', 'ai');--> statement-breakpoint
CREATE TYPE "public"."prediction_result" AS ENUM('pending', 'correct', 'incorrect');--> statement-breakpoint
CREATE TYPE "public"."prediction_status" AS ENUM('open', 'locked', 'won', 'lost', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."prediction_type" AS ENUM('win', 'score_over', 'score_under', 'survive_time');--> statement-breakpoint
CREATE TYPE "public"."reward_reason" AS ENUM('game_win', 'leaderboard_top', 'daily_bonus', 'referral');--> statement-breakpoint
CREATE TYPE "public"."reward_status" AS ENUM('pending', 'claimed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."skin_accessory" AS ENUM('none', 'crown', 'sunglasses', 'tophat', 'pirate', 'antenna', 'cape');--> statement-breakpoint
CREATE TYPE "public"."skin_pattern" AS ENUM('solid', 'striped', 'spotted', 'gradient', 'cosmic');--> statement-breakpoint
CREATE TYPE "public"."skin_rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."winner_type" AS ENUM('player1', 'player2', 'draw');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"run_status" "run_status" DEFAULT 'pending' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"distance" integer DEFAULT 0 NOT NULL,
	"coins_collected" integer DEFAULT 0 NOT NULL,
	"survival_time_ms" integer DEFAULT 0 NOT NULL,
	"decision_log" json,
	"ghost_data" json,
	"llm_tokens_used" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"wallet_address" varchar(64) NOT NULL,
	"agent_type" "agent_type" DEFAULT 'openclaw' NOT NULL,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"avatar_color" varchar(7) DEFAULT '#ff6b35' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"total_score" bigint DEFAULT 0 NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agents_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "autonomous_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"description" text,
	"avatar_emoji" varchar(8) DEFAULT '🦞' NOT NULL,
	"avatar_color" varchar(7) DEFAULT '#ff4422' NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"model_name" varchar(128) NOT NULL,
	"personality" text,
	"agent_difficulty" "agent_difficulty" DEFAULT 'balanced' NOT NULL,
	"reaction_speed" integer DEFAULT 50 NOT NULL,
	"risk_tolerance" integer DEFAULT 50 NOT NULL,
	"coin_priority" integer DEFAULT 50 NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"total_score" bigint DEFAULT 0 NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"win_rate" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "autonomous_agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(128) NOT NULL,
	"room_id" varchar(128) NOT NULL,
	"message" text NOT NULL,
	"message_type" "message_type" DEFAULT 'chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"description" text,
	"role" varchar(64) NOT NULL,
	"character_class" varchar(64) NOT NULL,
	"character_rarity" character_rarity DEFAULT 'epic' NOT NULL,
	"faction" varchar(64) NOT NULL,
	"sprite_url" text,
	"primary_color" varchar(7) NOT NULL,
	"secondary_color" varchar(7) NOT NULL,
	"glow_color" varchar(7) NOT NULL,
	"emoji" varchar(8) DEFAULT '🦞' NOT NULL,
	"abilities" json,
	"speed" integer DEFAULT 50 NOT NULL,
	"coin_bonus" integer DEFAULT 50 NOT NULL,
	"survivability" integer DEFAULT 50 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_characters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"ai_agent_id" integer,
	"player_type" "player_type" NOT NULL,
	"wallet_address" varchar(64),
	"score" integer DEFAULT 0 NOT NULL,
	"distance" integer DEFAULT 0 NOT NULL,
	"coins_collected" integer DEFAULT 0 NOT NULL,
	"survival_time_ms" integer DEFAULT 0 NOT NULL,
	"outcome" "outcome" DEFAULT 'fail' NOT NULL,
	"is_paid_mode" boolean DEFAULT false NOT NULL,
	"sol_earned" varchar(32) DEFAULT '0',
	"game_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_type" "player_type" NOT NULL,
	"user_id" integer,
	"ai_agent_id" integer,
	"player_name" varchar(128) NOT NULL,
	"wallet_address" varchar(64),
	"best_score" integer DEFAULT 0 NOT NULL,
	"best_distance" integer DEFAULT 0 NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"total_coins" integer DEFAULT 0 NOT NULL,
	"avg_score" integer DEFAULT 0 NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobster_skins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"description" text,
	"body_color" varchar(7) NOT NULL,
	"head_color" varchar(7) NOT NULL,
	"claw_color" varchar(7) NOT NULL,
	"tail_color" varchar(7) NOT NULL,
	"eye_color" varchar(7) DEFAULT '#111111' NOT NULL,
	"glow_color" varchar(7),
	"pattern" "skin_pattern" DEFAULT 'solid' NOT NULL,
	"accessory" "skin_accessory" DEFAULT 'none' NOT NULL,
	"rarity" "skin_rarity" DEFAULT 'common' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lobster_skins_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_type" "match_type" NOT NULL,
	"match_status" "match_status" DEFAULT 'waiting' NOT NULL,
	"player1_user_id" integer,
	"player1_agent_id" integer,
	"player1_name" varchar(128),
	"player1_wallet_address" varchar(64),
	"player1_score" integer DEFAULT 0 NOT NULL,
	"player1_distance" integer DEFAULT 0 NOT NULL,
	"player1_coins" integer DEFAULT 0 NOT NULL,
	"player1_ready" boolean DEFAULT false NOT NULL,
	"player2_user_id" integer,
	"player2_agent_id" integer,
	"player2_name" varchar(128),
	"player2_wallet_address" varchar(64),
	"player2_score" integer DEFAULT 0 NOT NULL,
	"player2_distance" integer DEFAULT 0 NOT NULL,
	"player2_coins" integer DEFAULT 0 NOT NULL,
	"player2_ready" boolean DEFAULT false NOT NULL,
	"winner_id" integer,
	"winner_type" "winner_type",
	"prize_pool" varchar(32) DEFAULT '0',
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_address" varchar(64) NOT NULL,
	"game_session_id" integer,
	"amount_lamports" bigint NOT NULL,
	"amount_sol" varchar(20) NOT NULL,
	"tx_signature" varchar(128),
	"payout_status" "payout_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" varchar(64),
	"bio" text,
	"avatar_url" text,
	"selected_character_id" integer,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"high_score" integer DEFAULT 0 NOT NULL,
	"total_coins" integer DEFAULT 0 NOT NULL,
	"total_distance" integer DEFAULT 0 NOT NULL,
	"favorite_map" varchar(32),
	"x_handle" varchar(64),
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "player_skins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"skin_id" integer NOT NULL,
	"is_equipped" boolean DEFAULT false NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"agent_id" integer,
	"match_id" integer,
	"market_type" "market_type" NOT NULL,
	"target_value" integer,
	"market_status" "market_status" DEFAULT 'open' NOT NULL,
	"total_pool" varchar(32) DEFAULT '0' NOT NULL,
	"yes_pool" varchar(32) DEFAULT '0' NOT NULL,
	"no_pool" varchar(32) DEFAULT '0' NOT NULL,
	"yes_odds" varchar(16) DEFAULT '2.0' NOT NULL,
	"no_odds" varchar(16) DEFAULT '2.0' NOT NULL,
	"market_outcome" "market_outcome" DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer,
	"agent_id" integer,
	"prediction_type" "prediction_type" NOT NULL,
	"target_value" integer,
	"user_id" integer NOT NULL,
	"wallet_address" varchar(64),
	"bet_amount" varchar(32) NOT NULL,
	"odds" varchar(16) DEFAULT '2.0' NOT NULL,
	"potential_payout" varchar(32) NOT NULL,
	"prediction_status" "prediction_status" DEFAULT 'open' NOT NULL,
	"prediction_result" "prediction_result" DEFAULT 'pending' NOT NULL,
	"paid_out" boolean DEFAULT false NOT NULL,
	"tx_signature" varchar(128),
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"wallet_address" varchar(64) NOT NULL,
	"amount" varchar(32) NOT NULL,
	"reason" "reward_reason" DEFAULT 'game_win' NOT NULL,
	"status" "reward_status" DEFAULT 'pending' NOT NULL,
	"tx_signature" varchar(128),
	"game_session_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shared_replays" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_session_id" integer NOT NULL,
	"share_code" varchar(32) NOT NULL,
	"character_slug" varchar(64),
	"map_name" varchar(32),
	"score" integer DEFAULT 0 NOT NULL,
	"distance" integer DEFAULT 0 NOT NULL,
	"coins_collected" integer DEFAULT 0 NOT NULL,
	"ghost_data" json,
	"x_post_url" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_replays_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"supabase_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_address" varchar(64) NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_wallet_address_unique" UNIQUE("wallet_address")
);
