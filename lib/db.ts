import { neon } from "@neondatabase/serverless"

// A single connection instance provides access to the Neon database for the entire backend.
export const sql = neon(process.env.DATABASE_URL!)

export type GameTypeWeight = {
  game_type: string
  weight: number
}

// Read "dynamic weights" from the database—this is the memory that makes the Agent more and more accurate the more it is used.
export async function getGameWeights(): Promise<Record<string, number>> {
  const rows = (await sql`SELECT game_type, weight FROM game_type_weights`) as GameTypeWeight[]
  const weights: Record<string, number> = {}
  for (const row of rows) {
    weights[row.game_type] = Number(row.weight)
  }
  return weights
}
