import { NextResponse } from "next/server"
import { sql, getGameWeights } from "@/lib/db"

// Force every call to fetch live data, no caching
export const dynamic = "force-dynamic"
export const revalidate = 0

type TrendingGame = {
  name: string
  type: string
  hypeScore: number
  source: string
}

// 1. Fetch Steam's official top sellers list
async function fetchRealSteamGames(): Promise<TrendingGame[]> {
  try {
    const response = await fetch("https://store.steampowered.com/api/featuredcategories/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GameTrendBot/1.0)" },
      cache: "no-store",
    })
    const data = await response.json()
    const items = data?.top_sellers?.items ?? []

    // The Steam list mixes in hardware (Steam Machine / Steam Deck / controllers) and duplicate bundles, so filter first.
    const hardwareKeywords = ["steam machine", "steam deck", "steam controller", "valve index", "steam link"]
    const seen = new Set<string>()

    return items
      .filter((game: any) => {
        const name = String(game?.name ?? "").toLowerCase()
        if (!name) return false
        if (typeof game.type === "number" && game.type !== 0) return false
        if (hardwareKeywords.some((kw) => name.includes(kw))) return false
        if (seen.has(name)) return false
        seen.add(name)
        return true
      })
      .slice(0, 5)
      .map((game: any) => ({
        name: game.name,
        type: "Indie",
        hypeScore: game.discount_percent > 0 ? 90 : 80,
        source: "Steam Top Sellers",
      }))
  } catch (error) {
    console.error("[v0] Steam fetch failed:", error)
    return []
  }
}

// 2. Fetch Reddit trending discussions
async function fetchRealRedditTrending(): Promise<TrendingGame[]> {
  try {
    const response = await fetch("https://www.reddit.com/r/indiegaming/hot.json?limit=5", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GameTrendBot/1.0)" },
      cache: "no-store",
    })
    const data = await response.json()
    const children = data?.data?.children ?? []
    return children
      .filter((post: any) => !post.data.stickied)
      .map((post: any) => ({
        name: post.data.title.substring(0, 40) + "...",
        type: "Action",
        hypeScore: post.data.ups,
        source: `Reddit (upvotes: ${post.data.ups})`,
      }))
  } catch (error) {
    console.error("[v0] Reddit fetch failed:", error)
    return []
  }
}

// 3. Call the Minds Agent (the indispensable core of the system)
async function callHelloMindsBrain(gameData: TrendingGame) {
  const apiKey = process.env.MINDS_BUILDER_API_KEY
  const mindId = process.env.HELLOMINDS_MIND_ID

  if (!apiKey || !mindId) {
    return {
      note: "MINDS_BUILDER_API_KEY or HELLOMINDS_MIND_ID environment variables are not set; skipping AI script generation for now.",
    }
  }

  const promptMessage = `
    Please produce a complete YouTube plan for this trending game:
    Game name: ${gameData.name}
    Trend source: ${gameData.source}
    Strictly follow the [YouTube Title Generation Rules] and [Script Writing Rules] and output ALL of the following:
    1. 3 A/B test titles.
    2. A 30-second opening hook.
    3. A full narration script for the whole video (intro, main body broken into clear sections/beats, and outro with a call to action).
  `

  const response = await fetch("https://hellominds.ai", {
    method: "POST",
    headers: {
      "X-Access-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mind_id: mindId,
      message: promptMessage,
    }),
  })

  return await response.json()
}

async function runAgent(requestedGame?: string) {
  console.log("[v0] [Vercel API triggered] Starting cross-platform scan for potential games...")

  // Read dynamic weights from the database (they change based on performance feedback)
  const gameWeights = await getGameWeights()

  let targetGame: TrendingGame
  let candidates: TrendingGame[] = []

  if (requestedGame && requestedGame.trim()) {
    // User manually specified a game: skip auto-filtering and lock onto that game.
    targetGame = {
      name: requestedGame.trim(),
      type: "Manual",
      hypeScore: 0,
      source: "Manually Specified",
    }
  } else {
    // A. Collect data
    const [steamGames, redditGames] = await Promise.all([fetchRealSteamGames(), fetchRealRedditTrending()])
    const allTrendingGames = [...steamGames, ...redditGames]

    // B. AI weight-based decision (weights come from the database)
    candidates = allTrendingGames
      .filter((game) => (gameWeights[game.type] || 0) >= 1.0)
      .sort((a, b) => b.hypeScore * (gameWeights[b.type] || 1) - a.hypeScore * (gameWeights[a.type] || 1))

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No games matched the weight criteria today", weights: gameWeights },
        { status: 200 },
      )
    }

    targetGame = candidates[0]
  }

  try {
    // C. Hand off to Minds for content generation
    const mindsOutput = await callHelloMindsBrain(targetGame)

    // D. Return to the frontend or push notification
    return NextResponse.json({
      success: true,
      target_game: targetGame,
      candidates,
      ai_content: mindsOutput,
      weights: gameWeights,
    })
  } catch (error) {
    console.error("[v0] Calling the Minds engine failed:", error)
    return NextResponse.json({ success: false, error: "Calling the Minds engine failed" }, { status: 500 })
  }
}

// GET: triggered automatically by Vercel Cron, or called by the frontend button. Supports ?game=XXX to specify a game manually.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedGame = searchParams.get("game") ?? undefined
  return runAgent(requestedGame)
}

// POST: report video performance (high/low) and dynamically adjust that game genre's weight so the Agent learns.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const gameName: string = body?.game_name ?? ""
    const gameType: string = body?.game_type ?? ""
    const performance: string = body?.performance ?? ""

    if (!gameName || !gameType || (performance !== "high" && performance !== "low")) {
      return NextResponse.json(
        { success: false, error: "Invalid parameters (need game_name, game_type, performance:high|low)" },
        { status: 400 },
      )
    }

    // High views -> weight +0.2; low views -> weight -0.2 (never below 0.1)
    const delta = performance === "high" ? 0.2 : -0.2

    // Record this performance feedback
    await sql`
      INSERT INTO video_feedback (game_name, game_type, performance)
      VALUES (${gameName}, ${gameType}, ${performance})
    `

    // Dynamically adjust the weight and persist it to the database (create with a 1.0 baseline if the genre does not exist)
    const updated = (await sql`
      INSERT INTO game_type_weights (game_type, weight, updated_at)
      VALUES (${gameType}, GREATEST(0.1, 1.0 + ${delta}), now())
      ON CONFLICT (game_type)
      DO UPDATE SET weight = GREATEST(0.1, game_type_weights.weight + ${delta}), updated_at = now()
      RETURNING game_type, weight
    `) as { game_type: string; weight: number }[]

    return NextResponse.json({
      success: true,
      message:
        performance === "high"
          ? "Recorded: high views, genre weight increased"
          : "Recorded: low views, genre weight decreased",
      updated_weight: updated[0],
    })
  } catch (error) {
    console.error("[v0] Reporting performance failed:", error)
    return NextResponse.json({ success: false, error: "Reporting performance failed" }, { status: 500 })
  }
}
