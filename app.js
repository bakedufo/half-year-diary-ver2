const express = require("express");
const Database = require("better-sqlite3");
const app = express();
const PORT = process.env.PORT || 3000;

// データベース接続（自動作成されます）
const db = new Database("diary.db");

// データベース初期化
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS diaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    is_marked INTEGER DEFAULT 0
  )
`
).run();

app.set("view engine", "ejs");
const path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// --- 自動削除ロジック ---
// 本番用: '-6 months' / テスト用: '-15 seconds'
const EXPIRATION = "-6 months";

setInterval(() => {
  const stmt = db.prepare(`
    DELETE FROM diaries 
    WHERE is_marked = 0 
    AND created_at <= datetime('now', 'localtime', ?)
  `);
  const result = stmt.run(EXPIRATION);
  if (result.changes > 0) console.log(`${result.changes}件を自動削除しました`);
}, 5000);

// --- 共通データ取得関数 ---
function getPageData(selectedMonth = null) {
  let query =
    "SELECT *, strftime('%Y-%m', created_at) as month_group FROM diaries";
  let params = [];
  if (selectedMonth) {
    query += " WHERE month_group = ?";
    params.push(selectedMonth);
  }
  query += " ORDER BY created_at DESC";

  const diaries = db.prepare(query).all(params);
  const months = db
    .prepare(
      "SELECT DISTINCT strftime('%Y-%m', created_at) as m FROM diaries ORDER BY m DESC"
    )
    .all();

  return { diaries, months, selectedMonth };
}

// --- ルート設定 ---

app.get("/", (req, res) => {
  res.render("index", getPageData(req.query.month || null));
});

app.post("/add", (req, res) => {
  db.prepare("INSERT INTO diaries (content) VALUES (?)").run(req.body.content);
  res.redirect("/");
});

app.post("/mark/:id", (req, res) => {
  db.prepare(
    `
    UPDATE diaries SET 
    is_marked = 1 - is_marked
    WHERE id = ?
  `
  ).run(req.params.id);
  res.redirect("/");
});

app.post("/edit/:id", (req, res) => {
  db.prepare("UPDATE diaries SET content = ? WHERE id = ?").run(
    req.body.content,
    req.params.id
  );
  res.redirect("/");
});

app.post("/delete/:id", (req, res) => {
  db.prepare("DELETE FROM diaries WHERE id = ?").run(req.params.id);
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`日記アプリ起動中: http://localhost:${PORT}`);
});
