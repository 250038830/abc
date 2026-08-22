# Viral Game Content Agent - Backend Proxy 🚀

這是一個基於 **Cloudflare Workers** 構建的無伺服器代理 API (Serverless Proxy)。
主要用於為「Viral Game Content Agent」前端網頁解決 CORS 跨網域限制，並橋接 [Steam API] 與 [Minds AI API] 的數據通訊。

## ✨ 核心功能 (Features)

*   **🛡️ 跨網域 (CORS) 解決方案**：允許前端網頁直接呼叫 API，避免瀏覽器的 CORS 阻擋。
*   **🤖 Minds AI 通訊橋樑**：
    *   支援發送訊息至指定的 AI 頻道。
    *   支援輪詢 (Polling) 獲取 AI 的最新回覆。
    *   **動態頻道解析 (Dynamic Alias Resolution)**：自動將前端傳入的自訂名稱，對應並解析為 Minds 後台真實的 UUID/Hash，實現多頻道的完美隔離。
*   **🎮 Steam 數據整合**：直接串接 Steam 官方 API，獲取當前最熱門的遊戲與在線人數。
*   **⏰ 自動排程 (Cron Triggers)**：內建預留了每日定時觸發的排程功能（例如：每日凌晨 5 點自動更新數據）。

---

## 🛣️ API 路由 (Endpoints)

### 1. `GET /steam`
獲取 Steam 當前最多人在線的熱門遊戲數據。
*   **Response**: `JSON` 格式的 Steam 官方數據。

### 2. `POST /minds/send`
發送訊息至 Minds AI 指定的對話頻道。
*   **Headers**: 
    *   `Content-Type: application/json`
    *   `X-Auth-Token: <你的 Minds Token>`
*   **Body**:
    ```json
    {
      "mindId": "64db433e-...",
      "messageText": "請幫我生成遊戲企劃",
      "alias": "Game News" 
    }
    ```
*   **備註**: 系統會自動將 `alias` 解析為真實頻道 ID。

### 3. `POST /minds/reply`
獲取 Minds AI 在指定頻道的最新一筆回覆。
*   **Headers**: 同上。
*   **Body**:
    ```json
    {
      "alias": "Game News"
    }
    ```
*   **Response**:
    ```json
    {
      "reply": "AI 的回覆內容...",
      "createdAt": "2026-08-22T...",
      "messageId": "...",
      "alias": "webapp:thread-..."
    }
    ```

---

## 🛠️ 開發與部署指南 (Deployment)

### 前置作業 (Prerequisites)
1. 註冊 [Cloudflare](https://dash.cloudflare.com/) 帳號。
2. 安裝 Node.js 與 npm。
3. 安裝 Cloudflare 官方的命令列工具 Wrangler：
   ```bash
   npm install -g wrangler