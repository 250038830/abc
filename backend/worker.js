addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener("scheduled", event => {
  event.waitUntil(handleScheduled(event));
});

async function handleScheduled(event) {
  console.log("Automatic scheduling triggered successfully at 5:00 AM daily.");
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

  // 1. Steam Popular Data Routes
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

  // 🔍 Test and print the actual Alias ​​structure for all existing channels.
  async function getConversationsList(mindsHeaders) {
    const convResponse = await fetch("https://api.hellominds.ai/v1/messaging/conversations", { method: "GET", headers: mindsHeaders });
    return await convResponse.json();
  }

  async function resolveRealAlias(targetName, mindsHeaders) {
    try {
      const convData = await getConversationsList(mindsHeaders);
      if (!convData || convData.length === 0) return null;

      const targetLower = (targetName || "").toLowerCase().trim();

      // Check all fields that may contain names.
      for (const conv of convData) {
        const title = (conv.title || conv.name || conv.topic || conv.channelName || conv.alias || "").toLowerCase().trim();
        if (title.includes(targetLower) || targetLower.includes(title)) {
          return conv.alias;
        }
      }

      // If they don't match at all, return null (the first one will no longer be used by default to prevent them from being mixed up).
      return null;
    } catch (e) {
      return null;
    }
  }

  // 2. Send a message to Minds AI
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

      // Get the actual matched Alias
      const realAlias = await resolveRealAlias(requestedAlias, mindsHeaders);
      
      if (!realAlias) {
        // If the corresponding channel cannot be found, print out all channel information retrieved from the backend for the user to debug.
        const rawConvs = await getConversationsList(mindsHeaders);
        return new Response(JSON.stringify({ 
          error: `Unable to match channel name: "${requestedAlias}"`, 
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

  // 3. Get the latest AI replies
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
          error: `Unable to match channel name: "${requestedAlias}"`, 
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
