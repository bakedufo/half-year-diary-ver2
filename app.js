const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// publicフォルダ内の静的ファイル（script.jsなど）を配信
app.use(express.static(path.join(__dirname, "public")));

// ルート（TOPページ）に来た時に index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 万が一他のパス（/addなど）を叩かれても index.html を返す（エラー回避用の書き方）
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
