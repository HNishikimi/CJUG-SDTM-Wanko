# CJUG SDTM アンケート (ローカル配布用)

簡易なローカル配信 HTML と Google Apps Script を使って、アンケート回答を Google スプレッドシートに送信するサンプルです。

## 構成
- `index.html` — アンケート画面 (送信ロジック含む)
- `evaluation.html`, `future.html` — 遷移先の簡易ページ
- `apps_script.gs` — Google Apps Script（Web App / doPost 実装）

## 使い方（ローカルで動かす）
1. `files` フォルダに移動してローカルサーバを起動します。

```bash
cd /path/to/files
python -m http.server 8000 --bind 127.0.0.1
```

2. ブラウザで `http://localhost:8000/index.html` を開き、アンケートに回答して送信します。

3. 正常に送信されると、Apps Script の `doPost` が呼ばれ、指定の Google スプレッドシートの `index` シートに行が追加されます。

## Apps Script 側のデプロイ
1. `apps_script.gs` を Google Apps Script プロジェクトに追加。
2. Web アプリとしてデプロイ：`Deploy` → `New deployment` → `Web app`。
   - `Execute as`: Me
   - `Who has access`: Anyone
3. 公開された `/exec` の URL を `index.html` の `SHEETS_ENDPOINT_URL` に設定してください。

## テスト手順（トラブルシュート）
- DevTools を開き、Console と Network を見ながら送信操作を行うと原因特定が早いです。
- ブラウザで CORS エラーが出る場合、`index.html` はプリフライトを回避するため `Content-Type: text/plain` を使用します。
- 直接テストする場合（Console）:

```javascript
const payload = JSON.parse(localStorage.getItem('cjug_sdtm_survey_page1'));
fetch(window.SHEETS_ENDPOINT_URL, { method:'POST', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(payload) })
  .then(r => console.log('status', r.status))
  .catch(console.error);
```

## 注意点
- `SPREADSHEET_ID` は公開/共有範囲に注意してください（ID 自体は機密度低めですが、未承認の編集権限設定は避けてください）。
- 量産的に公開する場合は認証トークンや検証ロジックの追加を検討してください。

## GitHub に上げるときの推奨操作
```bash
git init
git add .
git commit -m "Add survey files and Apps Script integration"
# GitHub で新規リポジトリ作成後、remote を追加して push
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
git branch -M main
git push -u origin main
```

必要なら私が `README.md` / `.gitignore` を作成します（既に作成済み）。
