"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, TrendingUp, Clapperboard, Gamepad2, Radio, ThumbsUp, ThumbsDown, Target } from "lucide-react"

type TrendingGame = {
  name: string
  type: string
  hypeScore: number
  source: string
}

type AgentResult = {
  success: boolean
  message?: string
  target_game?: TrendingGame
  candidates?: TrendingGame[]
  ai_content?: unknown
  weights?: Record<string, number>
}

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gameInput, setGameInput] = useState("")
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const fetchRecommendation = async (game?: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setFeedbackMsg(null)
    try {
      const url = game && game.trim() ? `/api/cron?game=${encodeURIComponent(game.trim())}` : "/api/cron"
      const response = await fetch(url)
      const data: AgentResult = await response.json()
      setResult(data)
      if (!data.success) {
        setError(data.message || "No games matched today's criteria")
      }
    } catch (err) {
      console.error("[v0] Fetch failed", err)
      setError("Fetch failed, please try again later")
    } finally {
      setLoading(false)
    }
  }

  const sendFeedback = async (performance: "high" | "low") => {
    if (!result?.target_game) return
    setFeedbackLoading(true)
    setFeedbackMsg(null)
    try {
      const response = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_name: result.target_game.name,
          game_type: result.target_game.type,
          performance,
        }),
      })
      const data = await response.json()
      if (data.success) {
        const w = data.updated_weight
        setFeedbackMsg(`${data.message} (${w.game_type} current weight: ${Number(w.weight).toFixed(1)})`)
        // Sync the "Current Genre Weights" panel with the newly adjusted weight
        setResult((prev) =>
          prev
            ? {
                ...prev,
                weights: { ...(prev.weights ?? {}), [w.game_type]: Number(w.weight) },
              }
            : prev,
        )
      } else {
        setFeedbackMsg(data.error || "Feedback failed")
      }
    } catch (err) {
      console.error("[v0] Feedback failed", err)
      setFeedbackMsg("Feedback failed, please try again later")
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:py-16">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Gamepad2 className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-balance sm:text-3xl">Viral Game Content Agent</h1>
              <p className="text-sm text-muted-foreground">
                Scans Steam and Reddit across platforms, filters by weight, and generates YouTube plans
              </p>
            </div>
          </div>
        </header>

        {/* Manually specify a game */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <label htmlFor="game-input" className="flex items-center gap-2 text-sm font-medium">
            <Target className="size-4" aria-hidden="true" />
            {"I want to cover this game (leave empty to let the Agent choose)"}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="game-input"
              type="text"
              value={gameInput}
              onChange={(e) => setGameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  fetchRecommendation(gameInput)
                }
              }}
              placeholder="e.g. Hollow Knight: Silksong"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
            />
            <Button onClick={() => fetchRecommendation(gameInput)} disabled={loading} className="gap-2">
              <Target className="size-4" aria-hidden="true" />
              Generate Plan for Game
            </Button>
          </div>
        </section>

        {/* Auto recommendation button */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => fetchRecommendation()}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                AI is analyzing web-wide data and generating a script...
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden="true" />
                Get Today's Viral Pick (Auto)
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">Runs automatically once daily at 00:00 via Vercel Cron</span>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Result */}
        {result?.success && result.target_game && (
          <div className="flex flex-col gap-6">
            {/* Target game */}
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="size-4" aria-hidden="true" />
                Today's Top Target
              </div>
              <h2 className="text-xl font-bold text-balance">{result.target_game.name}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge icon={<Gamepad2 className="size-3.5" />} label={result.target_game.type} />
                <Badge icon={<Radio className="size-3.5" />} label={result.target_game.source} />
                {result.target_game.hypeScore > 0 && (
                  <Badge icon={<TrendingUp className="size-3.5" />} label={`Hype Score ${result.target_game.hypeScore}`} />
                )}
              </div>
            </section>

            {/* AI content */}
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clapperboard className="size-4" aria-hidden="true" />
                YouTube Plan Generated by Minds AI
              </div>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                {JSON.stringify(result.ai_content, null, 2)}
              </pre>
            </section>

            {/* Performance feedback */}
            <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="size-4" aria-hidden="true" />
                Report Video Performance (train the Agent)
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {`After making the video, report its performance and the Agent will adjust the weight for the "${result.target_game.type}" genre so future picks get sharper.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => sendFeedback("high")} disabled={feedbackLoading} className="gap-2">
                  <ThumbsUp className="size-4" aria-hidden="true" />
                  High Views
                </Button>
                <Button
                  onClick={() => sendFeedback("low")}
                  disabled={feedbackLoading}
                  variant="outline"
                  className="gap-2"
                >
                  <ThumbsDown className="size-4" aria-hidden="true" />
                  Low Views
                </Button>
                {feedbackLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
              </div>
              {feedbackMsg && <p className="mt-3 text-sm text-primary">{feedbackMsg}</p>}
            </section>

            {/* Current weights */}
            {result.weights && Object.keys(result.weights).length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Agent's Current Genre Weights (Memory)
                </div>
                <ul className="flex flex-wrap gap-2">
                  {Object.entries(result.weights).map(([type, weight]) => (
                    <li key={type}>
                      <Badge icon={<Gamepad2 className="size-3.5" />} label={`${type}: ${Number(weight).toFixed(1)}`} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Candidates */}
            {result.candidates && result.candidates.length > 1 && (
              <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="size-4" aria-hidden="true" />
                  Other Candidate Games
                </div>
                <ul className="flex flex-col divide-y divide-border">
                  {result.candidates.slice(1).map((game, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 py-3">
                      <span className="truncate text-sm">{game.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{game.source}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-card-foreground">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Fetching data and applying weight-based decisions...</p>
          </div>
        )}

        {/* Initial empty state */}
        {!loading && !result && !error && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <Sparkles className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Enter a specific game, or click auto-recommend, to let the Agent generate today's viral content plan.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
      {icon}
      {label}
    </span>
  )
}
