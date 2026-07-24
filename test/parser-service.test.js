const assert = require('node:assert');
const test = require('node:test');

const {
  parseSubject,
  parseSubjectOrThrow,
  pickResumeAttachment,
  buildNormalizedOutput,
  parseEmail,
  ParserError,
  SUPPORTED_ATTACHMENT_MIME_TYPES,
} = require('../services/parser-service');

// KR 2.1 — Subject line parser
test('parseSubject extracts first/last/position from a valid subject', () => {
  const result = parseSubject('Ada Lovelace - [Software Engineer] Intern');
  assert.deepStrictEqual(result, {
    firstName: 'Ada',
    lastName: 'Lovelace',
    position: 'Software Engineer Intern',
  });
});

test('parseSubject handles hyphenated and apostrophe names', () => {
  const result = parseSubject("Mary-Anne O'Connor - [Data Analyst] Intern");
  assert.strictEqual(result.firstName, 'Mary-Anne');
  assert.strictEqual(result.lastName, "O'Connor");
  assert.strictEqual(result.position, 'Data Analyst Intern');
});

// KR 2.2 — Malformed subject handling
test('parseSubjectOrThrow flags missing position with a structured reason', () => {
  assert.throws(
    () => parseSubjectOrThrow('Ada Lovelace - Intern'),
    (err) => err instanceof ParserError && err.reason === 'missing_position',
  );
});

test('parseSubjectOrThrow flags missing Intern keyword', () => {
  assert.throws(
    () => parseSubjectOrThrow('Ada Lovelace - [Software Engineer]'),
    (err) => err instanceof ParserError && err.reason === 'missing_intern_keyword',
  );
});

// KR 2.3 — Attachment validation
test('pickResumeAttachment returns the only PDF', () => {
  const pdf = {filename: 'resume.pdf', mimeType: 'application/pdf', content: Buffer.from('pdf-bytes')};
  const result = pickResumeAttachment([pdf]);
  assert.strictEqual(result, pdf);
});

test('pickResumeAttachment throws no_attachment when empty', () => {
  assert.throws(
    () => pickResumeAttachment([]),
    (err) => err instanceof ParserError && err.reason === 'no_attachment',
  );
});

test('pickResumeAttachment throws unsupported_type for unknown mime', () => {
  const jpg = {filename: 'photo.jpg', mimeType: 'image/jpeg', content: Buffer.from('jpg')};
  assert.throws(
    () => pickResumeAttachment([jpg]),
    (err) => err instanceof ParserError && err.reason === 'unsupported_type',
  );
});

// KR 2.4 — Normalized output builder
test('buildNormalizedOutput produces the documented envelope', () => {
  const raw = {sender: 'ada@example.com', bodyText: 'Hi!', bodyHtml: '<p>Hi!</p>'};
  const parsed = {firstName: 'Ada', lastName: 'Lovelace', position: 'Software Engineer Intern'};
  const attachment = {filename: 'resume.pdf', mimeType: 'application/pdf', content: Buffer.from('pdf')};

  const out = buildNormalizedOutput(raw, parsed, attachment);

  assert.strictEqual(out.senderEmail, 'ada@example.com');
  assert.strictEqual(out.firstName, 'Ada');
  assert.strictEqual(out.lastName, 'Lovelace');
  assert.strictEqual(out.position, 'Software Engineer Intern');
  assert.strictEqual(typeof out.attachment.contentBase64, 'string');
  assert.strictEqual(out.attachment.filename, 'resume.pdf');
});

// KR 2.5 — parseEmail end-to-end
test('parseEmail rejects a malformed subject without throwing a generic Error', async () => {
  await assert.rejects(
    () => parseEmail({sender: 'ada@example.com', subject: 'no brackets here', attachments: []}),
    (err) => err instanceof ParserError,
  );
});

// Reference: keep SUPPORTED_ATTACHMENT_MIME_TYPES small + explicit
test('SUPPORTED_ATTACHMENT_MIME_TYPES includes PDF and DOCX only', () => {
  assert.ok(SUPPORTED_ATTACHMENT_MIME_TYPES.has('application/pdf'));
  assert.ok(SUPPORTED_ATTACHMENT_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  assert.strictEqual(SUPPORTED_ATTACHMENT_MIME_TYPES.size, 2);
});
