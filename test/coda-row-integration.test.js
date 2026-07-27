const assert = require('node:assert');
const test = require('node:test');

const {addRowToTable, updateRowInTableByLookup} = require('../services/coda-service');

function buildFakeFetch(rows) {
  return async (url, options = {}) => {
    const u = String(url);
    if (options.method === 'POST' && u.endsWith('/rows')) {
      return {ok: true, status: 200, json: async () => ({requestId: 'r1', addedRowIds: ['row-new']}), text: async () => ''};
    }
    if (options.method === 'GET' && u.includes('/rows?')) {
      return {ok: true, status: 200, json: async () => ({items: rows}), text: async () => ''};
    }
    if (options.method === 'PUT' && /\/rows\/[^?]+$/.test(u)) {
      return {ok: true, status: 200, json: async () => ({requestId: 'r2', id: u.split('/').pop()}), text: async () => ''};
    }
    return {ok: false, status: 404, text: async () => ''};
  };
}

// KR 6.4 — Row creation
test('addRowToTable creates a new row when none exists', async () => {
  const fakeFetch = buildFakeFetch([]);
  const result = await addRowToTable('doc-1', 'tbl-1', {
    Name: 'Ada Lovelace', Email: 'ada@example.com', Position: 'SWE Intern', 'Resume Link': 'https://drive/...',
  }, {apiToken: 't', fetchImpl: fakeFetch});
  assert.strictEqual(result.addedRowIds[0], 'row-new');
});

// KR 6.5 — Update path
test('updateRowInTableByLookup is used when a row already exists', async () => {
  const fakeFetch = buildFakeFetch([{id: 'row-existing', values: {Email: 'ada@example.com'}}]);
  const result = await updateRowInTableByLookup('doc-1', 'tbl-1', 'Email', 'ada@example.com', {
    'Resume Link': 'https://drive/new',
  }, {apiToken: 't', fetchImpl: fakeFetch, useColumnNames: true});
  assert.strictEqual(result.id, 'row-existing');
});
