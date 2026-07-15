// Google Apps Script: doPost handler
// 使い方: スプレッドシートIDを SPREADSHEET_ID に入れ、デプロイして公開してください（Anyone, even anonymous）

const SPREADSHEET_ID = '1MBjup20pYDWKUK2g5RzV1yvGbQm-nV6zDEhZKOrb99c';
const SHEET_NAME = 'index';

// ブラウザで /exec を開いたときの簡易説明ページ（テスト用）
function doGet(e) {
  const html = HtmlService.createHtmlOutput(
    '<h3>アンケート受信用 Web App</h3>' +
    '<p>このエンドポイントは POST を受け付けます。フォームからの送信は fetch POST を使ってください。</p>' +
    '<p>テスト用 curl:</p>' +
    `<pre>curl -X POST -H "Content-Type: text/plain" -d '{"respondent_id":"test","affiliation":"製薬企業"}' '${ScriptApp.getService().getUrl()}'</pre>`
  );
  return html;
}

function doPost(e) {
  try {
    const content = e.postData && e.postData.contents ? e.postData.contents : '';
    const contentType = e.postData && e.postData.type ? e.postData.type : '';

    let data = {};
    if (content) {
      const raw = content.toString();
      try {
        data = JSON.parse(raw);
      } catch (err) {
        try {
          data = JSON.parse(raw.replace(/^\s+|\s+$/g, ''));
        } catch (err2) {
          data = { raw_text: raw };
        }
      }
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    const headers = [
      'timestamp',
      'respondent_id',
      'affiliation',
      'experience',
      'used',
      'useful_none',
      'useful_has_items',
      'useful_list',
      'not_used_reasons_list',
      'not_used_reasons_other_text',
      'raw_json'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const row = [];
    row.push(new Date());
    row.push(data.respondent_id || '');
    row.push(data.affiliation || '');
    row.push(data.experience || '');
    row.push(data.used || '');
    row.push(data.useful_none ? 'TRUE' : 'FALSE');
    row.push(data.useful_has_items ? 'TRUE' : 'FALSE');
    row.push((data.useful || []).join(' | '));
    row.push((data.not_used_reasons_selected || []).join(' | '));
    row.push(data.not_used_reasons_other_text || '');
    row.push(JSON.stringify(data));

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', contentType: contentType || 'unknown' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
