addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener("scheduled", event => {
  event.waitUntil(handleScheduled(event));
});

async function handleScheduled(event) {
  console.log("每日 5:00 自動排程觸發成功");
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders });
  }

  // 1. Steam 熱門數據路由
  if (path === "/steam") {
    try {
      const steamUrl = "https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/";
      const response = await fetch(steamUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 🔍 測試與印出所有現有頻道的真實 Alias 結構
  async function getConversationsList(mindsHeaders) {
    const convResponse = await fetch("https://api.hellominds.ai/v1/messaging/conversations", { method: "GET", headers: mindsHeaders });
    return await convResponse.json();
  }

  async function resolveRealAlias(targetName, mindsHeaders) {
    try {
      const convData = await getConversationsList(mindsHeaders);
      if (!convData || convData.length === 0) return null;

      const targetLower = (targetName || "").toLowerCase().trim();

      // 檢查所有可能包含名稱的欄位
      for (const conv of convData) {
        const title = (conv.title || conv.name || conv.topic || conv.channelName || conv.alias || "").toLowerCase().trim();
        if (title.includes(targetLower) || targetLower.includes(title)) {
          return conv.alias;
        }
      }

      // 若完全對不上，回傳 null（不再預設用第一個，防止混在一起）
      return null;
    } catch (e) {
      return null;
    }
  }

  // 2. 發送消息給 Minds AI
  if (path === "/minds/send") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      const apiKey = request.headers.get("X-Auth-Token") || "";
      const bodyText = await request.text();
      const parsed = JSON.parse(bodyText || "{}");
      const mindId = parsed.mindId || "";
      const messageText = parsed.messageText || "";
      const requestedAlias = parsed.alias || "";

      const mindsHeaders = {
        "Content-Type": "application/json",
        "Cookie": "auth_token=" + apiKey,
        "origin": "https://app.hellominds.ai",
        "referer": "https://app.hellominds.ai/"
      };

      // 取得實際匹配到的 Alias
      const realAlias = await resolveRealAlias(requestedAlias, mindsHeaders);
      
      if (!realAlias) {
        // 如果找不到對應頻道，把後端拉到的所有頻道資訊印出給用戶除錯
        const rawConvs = await getConversationsList(mindsHeaders);
        return new Response(JSON.stringify({ 
          error: `無法對應頻道名稱: "${requestedAlias}"`, 
          mindsConversationsList: rawConvs 
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let mindsUrl = "https://api.hellominds.ai/v1/messaging/message";
      if (mindId) {
        mindsUrl += "?mindId=" + encodeURIComponent(mindId);
      }

      const mindsResponse = await fetch(mindsUrl, {
        method: "POST",
        headers: mindsHeaders,
        body: JSON.stringify({ alias: realAlias, messageText: messageText })
      });

      const result = await mindsResponse.text();
      return new Response(result, {
        status: mindsResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Send failed: " + e.message }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  // 3. 獲取最新 AI 回覆
  if (path === "/minds/reply") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      const apiKey = request.headers.get("X-Auth-Token") || "";
      const bodyText = await request.text();
      let requestedAlias = "";
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          requestedAlias = parsed.alias || "";
        } catch(e) {}
      }

      const mindsHeaders = {
        "Content-Type": "application/json",
        "Cookie": "auth_token=" + apiKey,
        "origin": "https://app.hellominds.ai",
        "referer": "https://app.hellominds.ai/"
      };

      const realAlias = await resolveRealAlias(requestedAlias, mindsHeaders);
      if (!realAlias) {
        const rawConvs = await getConversationsList(mindsHeaders);
        return new Response(JSON.stringify({ 
          error: `無法對應頻道名稱: "${requestedAlias}"`, 
          mindsConversationsList: rawConvs 
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const historyUrl = "https://api.hellominds.ai/v1/messaging/histories/" + encodeURIComponent(realAlias) + "?limit=10";
      const historyResponse = await fetch(historyUrl, { method: "GET", headers: mindsHeaders });
      const historyData = await historyResponse.json();

      let aiReply = "";
      let aiCreatedAt = "";
      let aiMessageId = "";
      if (historyData && historyData.length > 0) {
        for (let i = 0; i < historyData.length; i++) {
          if (historyData[i].senderType === 0) {
            aiReply = historyData[i].messageText;
            aiCreatedAt = historyData[i].createdAt;
            aiMessageId = historyData[i].messageId;
            break;
          }
        }
      }

      return new Response(JSON.stringify({ reply: aiReply, createdAt: aiCreatedAt, messageId: aiMessageId, alias: realAlias }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Get reply failed: " + e.message }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ status: "ok", routes: ["/steam", "/minds/send", "/minds/reply"] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}