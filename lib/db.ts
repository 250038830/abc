import { neon } from "@neondatabase/serverless"

// 單一連線實例，供整個後端讀寫 Neon 資料庫。
export const sql = neon(process.env.DATABASE_URL!)

export type GameTypeWeight = {
  game_type: string
  weight: number
}

// 從資料庫讀取「動態權重」——這就是 Agent 越用越準的記憶庫。
export async function getGameWeights(): Promise<Record<string, number>> {
  const rows = (await sql`SELECT game_type, weight FROM game_type_weights`) as GameTypeWeight[]
  const weights: Record<string, number> = {}
  for (const row of rows) {
    weights[row.game_type] = Number(row.weight)
  }
  return weights
}
