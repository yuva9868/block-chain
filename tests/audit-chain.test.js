const { createHash } = require('crypto');
const assert = require('assert');
const { describe, it } = require('node:test');

function sha256String(data) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function append(entries, input) {
  const prevHash = entries.length ? entries[entries.length - 1].entryHash : '0'.repeat(64);
  const timestamp = entries.length + 1;
  const material = [
    prevHash,
    String(timestamp),
    input.action,
    input.actor,
    input.recordId || '',
    input.source,
    input.txHash || '',
    input.details,
  ].join('|');
  const entry = { ...input, timestamp, prevHash, entryHash: sha256String(material) };
  entries.push(entry);
  return entry;
}

function verify(entries) {
  let prev = '0'.repeat(64);
  for (const entry of entries) {
    if (entry.prevHash !== prev) return false;
    const material = [
      entry.prevHash,
      String(entry.timestamp),
      entry.action,
      entry.actor,
      entry.recordId || '',
      entry.source,
      entry.txHash || '',
      entry.details,
    ].join('|');
    if (sha256String(material) !== entry.entryHash) return false;
    prev = entry.entryHash;
  }
  return true;
}

describe('hash-chained audit log', () => {
  it('accepts a valid chain', () => {
    const entries = [];
    append(entries, { action: 'login', actor: '0xabc', source: 'off-chain', details: 'role=patient' });
    append(entries, { action: 'record_registered', actor: '0xabc', source: 'on-chain', details: 'ok', recordId: '0x1' });
    assert.equal(verify(entries), true);
  });

  it('detects tampering', () => {
    const entries = [];
    append(entries, { action: 'login', actor: '0xabc', source: 'off-chain', details: 'role=patient' });
    entries[0].details = 'tampered';
    assert.equal(verify(entries), false);
  });
});
