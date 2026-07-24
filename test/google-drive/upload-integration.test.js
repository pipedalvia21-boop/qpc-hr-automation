const assert = require('node:assert');
const test = require('node:test');
const fsp = require('node:fs/promises');
const fssync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {uploadFile, getShareLink, resolveDriveFolderPath, resolveDriveFileByPath} = require('../services/google-drive-service');

// Helper: a fake Drive client that records calls and serves canned responses.
function createFakeDrive({folderById = {}, fileById = {}} = {}) {
  const calls = [];
  return {
    calls,
    files: {
      list: async (req) => {
        calls.push({method: 'files.list', req});
        return {data: {files: []}};
      },
      create: async (req) => {
        calls.push({method: 'files.create', req});
        return {data: {id: `new-${calls.length}`, name: req.requestBody.name}};
      },
      get: async (req) => {
        calls.push({method: 'files.get', req});
        return {data: {id: req.fileId, name: 'resume.pdf', webViewLink: `https://drive.google.com/file/d/${req.fileId}/view`}};
      },
    },
    permissions: {
      list: async (req) => {
        calls.push({method: 'permissions.list', req});
        return {data: {permissions: []}};
      },
      create: async (req) => {
        calls.push({method: 'permissions.create', req});
        return {data: {id: 'perm-1'}};
      },
    },
  };
}

// KR 5.3 / 5.4 — Drive upload + shareable link (mocked)
test('uploadFile + getShareLink returns a webViewLink', async () => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'drive-test-'));
  const resumePath = path.join(tmp, 'resume.pdf');
  fssync.writeFileSync(resumePath, 'pdf-bytes');

  const fakeDrive = createFakeDrive();
  const uploaded = await uploadFile(resumePath, 'Interns/2025', {fileName: 'Lovelace_Ada_SWE_2025-01-01.pdf', mimeType: 'application/pdf'}, fakeDrive);
  const link = await getShareLink('Interns/2025/Lovelace_Ada_SWE_2025-01-01.pdf', fakeDrive);

  assert.ok(uploaded.id);
  assert.ok(link.startsWith('https://drive.google.com/'));
  assert.ok(fakeDrive.calls.some((c) => c.method === 'permissions.create'));

  await fsp.rm(tmp, {recursive: true, force: true});
});
