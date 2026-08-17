# 後端定時任務（Google Apps Script）

## 功能
- 每天定時從 Steam 抓熱門遊戲
- 自動調用 Minds API 生成內容
- 結果存到 Google Sheets
- 自動寄信通知

## 部署步驟

1. 打開 [Google Apps Script](https://script.google.com/)
2. 新建專案
3. 把 `Code.gs` 的內容複製貼上
4. 修改配置：
   - `MINDS_KEY`：你的 Minds API Key
   - `NOTIFY_EMAIL`：接收通知的信箱
5. 執行 `testRun()` 測試（第一次需要授權）
6. 設定觸發條件：
   - 函數：`generateDailyContent`
   - 觸發來源：時間驅動
   - 類型：日計時器
   - 時間：自行選擇

## 文件說明
- `Code.gs`：主程式，包含所有邏輯
