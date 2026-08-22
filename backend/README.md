# Viral Game Content Agent - Backend Proxy 🚀

This is a serverless proxy API built on **Cloudflare Workers**. It serves as a backend bridge for the "Viral Game Content Agent" frontend web application, resolving CORS (Cross-Origin Resource Sharing) restrictions and facilitating data communication between the [Steam API] and [Minds AI API].

## ✨ Core Features

*   **🛡️ CORS Solution**: Enables frontend web applications to directly call APIs without being blocked by browser CORS policies.
*   **🤖 Minds AI Communication Bridge**:
    *   Supports sending messages to designated AI channels.
    *   Supports polling to retrieve the latest AI responses.
    *   **Dynamic Alias Resolution**: Automatically resolves custom aliases provided by the frontend into their corresponding backend UUID/Hash identifiers, enabling seamless multi-channel isolation.
*   **🎮 Steam Data Integration**: Directly interfaces with the official Steam API to fetch current trending games and concurrent player counts.
*   **⏰ Cron Triggers**: Includes built-in scheduling functionality for automated daily tasks (e.g., daily data updates at 5:00 AM).

---

## 🛣️ API Endpoints

### 1. `GET /steam`
Retrieves the most popular games on Steam ranked by current concurrent player counts.
*   **Response**: Steam official data in `JSON` format.

### 2. `POST /minds/send`
Sends a message to a specified Minds AI conversation channel.
*   **Headers**: 
    *   `Content-Type: application/json`
    *   `X-Auth-Token: <Your Minds Token>`
*   **Body**:
    ```json
    {
      "mindId": "64db433e-...",
      "messageText": "Please help me generate a game proposal",
      "alias": "Game News" 
    }
    ```
*   **Note**: The system will automatically resolve the `alias` into the actual channel ID.

### 3. `POST /minds/reply`
Retrieves the latest AI response from a specified Minds channel.
*   **Headers**: Same as above.
*   **Body**:
    ```json
    {
      "alias": "Game News"
    }
    ```
*   **Response**:
    ```json
    {
      "reply": "AI response content...",
      "createdAt": "2026-08-22T...",
      "messageId": "...",
      "alias": "webapp:thread-..."
    }
    ```

---

## 🛠️ Development & Deployment Guide

### Prerequisites
1. Register a [Cloudflare](https://dash.cloudflare.com/) account.
2. Install Node.js and npm.
3. Install the official Cloudflare command-line tool, Wrangler:
   ```bash
   npm install -g wrangler
   ```
