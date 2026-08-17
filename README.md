# 🎮 Viral Game Content Agent

AI 驅動的遊戲爆款影片內容生成器，幫助遊戲 YouTuber 快速增長觀眾。

## ✨ 功能

### 前端網頁
- 🎯 輸入遊戲名，生成爆款/冷門兩種風格講稿+標題
- 🤖 Auto 模式：從 Steam 熱門榜自動推薦遊戲
- 📊 遊戲類型權重系統，根據影片表現自動調整
- 💾 localStorage 持久化存儲

### 後端定時任務
- ⏰ 每天定時自動生成內容
- 📧 自動寄信通知
- 📝 結果存到 Google Sheets

## 🚀 快速開始

### 前端
直接用瀏覽器打開 `index.html` 即可。

### 後端
請參考 [backend/README.md](backend/README.md) 的部署步驟。

## 🛠️ 技術棧

- 前端：HTML + CSS + 原生 JavaScript
- 後端：Google Apps Script
- API：Minds API、Steam Charts API
- 存儲：localStorage、Google Sheets

## 📁 專案結構

