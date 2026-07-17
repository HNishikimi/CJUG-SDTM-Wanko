const SPREADSHEET_ID = '1MBjup20pYDWKUK2g5RzV1yvGbQm-nV6zDEhZKOrb99c';

const SHEET_DEFS = {
  index: {
    name: 'index',
    headers: [
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
      'other_useful_text',
      'raw_json'
    ]
  },
  evaluation: {
    name: 'evaluation',
    headers: [
      'timestamp',
      'respondent_id',
      'artifact_title',
      'rating_jitan',
      'rating_consensus',
      'rating_quality',
      'rating_education',
      'rating_relief',
      'raw_json'
    ]
  },
  future: {
    name: 'future',
    headers: [
      'timestamp',
      'respondent_id',
      'future_interests',
      'wish_future',
      'good_points',
      'improvements',
      'spread_ideas',
      'raw_json'
    ]
  }
};

function formatBoolean(value) {
  return value ? 'TRUE' : 'FALSE';
}

function joinValues(value) {
  if (Array.isArray(value)) {
    return value.join(' | ');
  }
  return value || '';
}

function ensureSheetHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] || [];
  const existing = firstRow.filter(function (value) {
    return value !== '';
  });

  if (existing.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const missing = headers.filter(function (header) {
    return !firstRow.includes(header);
  });

  if (missing.length > 0) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

function appendRows(sheet, headers, rows) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  if (!rows || rows.length === 0) {
    return;
  }

  const values = rows.map(function (row) {
    const normalized = [];
    for (let i = 0; i < headers.length; i += 1) {
      normalized.push(row[i] !== undefined ? row[i] : '');
    }
    return normalized;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function buildIndexRow(data) {
  return [
    data.timestamp || new Date(),
    data.respondent_id || '',
    data.affiliation || '',
    data.experience || '',
    data.used || '',
    formatBoolean(data.useful_none),
    formatBoolean(data.useful_has_items),
    joinValues(data.useful),
    joinValues(data.not_used_reasons_selected || data.not_used_reasons_list),
    data.not_used_reasons_other_text || '',
    data.otherUseful || data.other_useful_text || '',
    JSON.stringify(data)
  ];
}

function buildEvaluationRows(data) {
  const ratings = Array.isArray(data.ratings) ? data.ratings : [];
  if (ratings.length === 0) {
    return [];
  }

  return ratings.map(function (item) {
    return [
      data.timestamp || new Date(),
      data.respondent_id || '',
      item.artifact || item.artifact_title || '',
      item.jitan !== undefined ? item.jitan : '',
      item.consensus !== undefined ? item.consensus : '',
      item.quality !== undefined ? item.quality : '',
      item.education !== undefined ? item.education : '',
      item.relief !== undefined ? item.relief : '',
      JSON.stringify({ ...data, evaluation_item: item })
    ];
  });
}

function parseFutureComments(comments) {
  if (!comments) {
    return { wish_future: '', good_points: '', improvements: '', spread_ideas: '' };
  }

  const match = function (pattern) {
    const result = comments.match(pattern);
    return result && result[1] ? result[1].trim() : '';
  };

  return {
    wish_future: match(/【今後取り上げてほしいテーマ】\s*([\s\S]*?)(?=\n【|$)/),
    good_points: match(/【役に立った点、良かった点】\s*([\s\S]*?)(?=\n【|$)/),
    improvements: match(/【改善を期待する点】\s*([\s\S]*?)(?=\n【|$)/),
    spread_ideas: match(/【成果物を広めるための良いアイデア】\s*([\s\S]*?)$/)
  };
}

function buildFutureRow(data) {
  const futureComments = parseFutureComments(data.comments || '');
  return [
    data.timestamp || new Date(),
    data.respondent_id || '',
    joinValues(data.future_interests),
    futureComments.wish_future,
    futureComments.good_points,
    futureComments.improvements,
    futureComments.spread_ideas,
    JSON.stringify(data)
  ];
}

function writePayloadToSheets(data, ss) {
  const normalized = typeof data === 'string' ? JSON.parse(data) : data;
  const timestamp = new Date();
  const payload = { ...normalized, timestamp: timestamp };

  const indexSheet = ss.getSheetByName(SHEET_DEFS.index.name) || ss.insertSheet(SHEET_DEFS.index.name);
  ensureSheetHeaders(indexSheet, SHEET_DEFS.index.headers);
  appendRows(indexSheet, SHEET_DEFS.index.headers, [buildIndexRow(payload)]);

  const evaluationSheet = ss.getSheetByName(SHEET_DEFS.evaluation.name) || ss.insertSheet(SHEET_DEFS.evaluation.name);
  ensureSheetHeaders(evaluationSheet, SHEET_DEFS.evaluation.headers);
  appendRows(evaluationSheet, SHEET_DEFS.evaluation.headers, buildEvaluationRows(payload));

  const futureSheet = ss.getSheetByName(SHEET_DEFS.future.name) || ss.insertSheet(SHEET_DEFS.future.name);
  ensureSheetHeaders(futureSheet, SHEET_DEFS.future.headers);
  appendRows(futureSheet, SHEET_DEFS.future.headers, [buildFutureRow(payload)]);
}

function doPost(e) {
  try {
    const contents = e && e.postData && e.postData.contents ? e.postData.contents : '';
    const data = typeof contents === 'string' ? JSON.parse(contents) : contents;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    writePayloadToSheets(data, ss);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<h3>アンケート受信用 Web App</h3>' +
    '<p>このエンドポイントは POST を受け付けます。フォームからの送信は fetch POST を使ってください。</p>' +
    '<p>テスト用 curl:</p>' +
    "<pre>curl -X POST -H \"Content-Type: application/json\" -d '{\"respondent_id\":\"test\"}' '" + ScriptApp.getService().getUrl() + "'</pre>"
  );
}