// ========== 配置區 ==========
var KEY_PART1 = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImFybjphd3M6a21zOmFwLW5vcnRoZWFzdC0xOjYyODg4NDA0NTY0NTprZXkvMTBmN2QyMWUtOTgwZS00ZTY1LTlkZGMtYzdjN2EwNjRjMWU0In0";
    var KEY_PART2 = ".eyJlbWFpbCI6ImNodW55aW43NDNAZ21haWwuY29tIiwiaHVtYW5JZCI6IjRlZGI0MzNlLWYzNmItMTQxMC04NDY2LTAwMDM5Y2U3ZGYxMSIsInJvbGUiOiJidWlsZGVyIiwidmVyc2lvbiI6MSwiaXNzIjoidXNlbWluZHMtYmFja2VuZC1hdXRoZW50aWNhdGlvbiIsImlhdCI6MTc4NTc0MTE3NSwiZXhwIjoxNzkzNTE3MTc1LCJzdWIiOiJjaHVueWluNzQzQGdtYWlsLmNvbSIsImp0aSI6IjRkZDU0MjJlYTljZDRmMjY5NjNhZWRiNjc1MjdjMThhIn0";
    var KEY_PART3 = ".Rp7f1ZdvXGOm2Z2wmPZed2Y4emaOW7m5jowiPSD4E9OZuC4NwT6VsoQKI5CO0La_8l-whMak3mOmmOZUMaKtLA";
    var MINDS_KEY = KEY_PART1 + KEY_PART2 + KEY_PART3;
var MIND_ID = "64db433e-f36b-1410-8466-00039ce7df11";
var USER_ALIAS = "game_creator_session_001";
var NOTIFY_EMAIL = "chunyin743@gmail.com"; // 改成你的信箱
// ============================

function generateDailyContent() {
  console.log("🚀 開始每日自動生成...");
  
  // 1. 從 Steam 抓熱門遊戲
  var gameData = fetchSteamTopGame();
  console.log("🎮 選中遊戲:", gameData.name);
  
  // 2. 生成爆款風格內容
  var highContent = callMinds(gameData.name, "高觀看率爆款");
  console.log("🔥 爆款內容生成完成");
  
  // 3. 生成冷門風格內容
  var lowContent = callMinds(gameData.name, "低觀看率冷門");
  console.log("🧊 冷門內容生成完成");
  
  // 4. 存到 Google Sheets
  saveToSheet(gameData, highContent, lowContent);
  
  // 5. 寄信通知
  sendEmail(gameData, highContent, lowContent);
  
  console.log("✅ 每日生成完成！");
}

function fetchSteamTopGame() {
  var url = "https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/";
  
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    var ranks = data.response && data.response.ranks ? data.response.ranks : [];
    
    if (ranks.length > 0) {
      // 從前10名隨機選一個
      var top10 = ranks.slice(0, 10);
      var picked = top10[Math.floor(Math.random() * top10.length)];
      return {
        name: picked.name,
        players: formatNum(picked.concurrent_in_game),
        peak: formatNum(picked.peak_in_game),
        source: "STEAM LIVE"
      };
    }
  } catch(e) {
    console.warn("Steam API 失敗，使用 fallback:", e);
  }
  
  // Fallback
  var fallbackGames = [
    { name: "黑神話：悟空", players: "340k", peak: "N/A", source: "FALLBACK" },
    { name: "艾爾登法環", players: "280k", peak: "N/A", source: "FALLBACK" },
    { name: "GTA 5", players: "150k", peak: "N/A", source: "FALLBACK" }
  ];
  return fallbackGames[Math.floor(Math.random() * fallbackGames.length)];
}

function callMinds(gameName, style) {
  var prompt = "Steam 今日熱門遊戲《" + gameName + "》，請生成" + style + "的遊戲影片企劃與布丁規範標題，包含講稿大綱和3個YouTube標題。";
  
  try {
    var response = UrlFetchApp.fetch("https://hellominds.ai", {
      method: "post",
      headers: {
        "X-Api-Key": MINDS_KEY,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({
        mindId: MIND_ID,
        alias: USER_ALIAS,
        message: prompt
      }),
      muteHttpExceptions: true
    });
    
    var data = JSON.parse(response.getContentText());
    return data.reply || data.text || data.message || "（生成失敗，請稍後重試）";
  } catch(e) {
    console.error("Minds API 調用失敗:", e);
    return "（API 調用失敗：" + e.message + "）";
  }
}

function saveToSheet(gameData, highContent, lowContent) {
  var sheetName = "ViralGameContent";
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  // 如果不存在就建立
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    // 表頭
    sheet.appendRow(["日期", "遊戲名稱", "在線人數", "峰值人數", "數據來源", "爆款內容", "冷門內容"]);
    // 設定格式
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#1e293b").setFontColor("white");
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 500);
    sheet.setColumnWidth(7, 500);
  }
  
  var today = new Date();
  var dateStr = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate();
  
  sheet.appendRow([
    dateStr,
    gameData.name,
    gameData.players,
    gameData.peak,
    gameData.source,
    highContent,
    lowContent
  ]);
}

function sendEmail(gameData, highContent, lowContent) {
  var subject = "🎮 今日 Viral Game Content 已生成 - " + gameData.name;
  
  var body = "<h2>🎮 今日推薦遊戲：" + gameData.name + "</h2>";
  body += "<p><strong>Steam 在線人數：</strong>" + gameData.players + " | <strong>峰值：</strong>" + gameData.peak + " | <strong>來源：</strong>" + gameData.source + "</p>";
  body += "<hr>";
  body += "<h3>🔥 爆款風格內容</h3>";
  body += "<pre style='background:#f1f5f9;padding:12px;border-radius:8px;white-space:pre-wrap;'>" + highContent + "</pre>";
  body += "<hr>";
  body += "<h3>🧊 冷門風格內容</h3>";
  body += "<pre style='background:#f1f5f9;padding:12px;border-radius:8px;white-space:pre-wrap;'>" + lowContent + "</pre>";
  body += "<hr>";
  body += "<p style='color:#64748b;font-size:12px;'>此郵件由 Viral Game Content Agent 自動生成</p>";
  
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    htmlBody: body
  });
}

function formatNum(n) {
  if (!n) return "N/A";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return Math.floor(n / 1000) + "k";
  return n.toString();
}

// 測試用：手動觸發一次
function testRun() {
  generateDailyContent();
  console.log("測試完成！檢查你的信箱和 Google Sheets");
}
