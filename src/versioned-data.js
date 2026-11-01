// V3 foundation: original keys are never rewritten during migration.
export const LEGACY_KEYS = Object.freeze([
  'daily-mind-summaries-v1', 'daily-mind-journal-v1',
  'her-space-periods-v1', 'daily-mind-small-things-v1'
]);
export const BACKUP_KEY = 'her-space-pre-v3-backup-v1';
export const MANIFEST_KEY = 'her-space-schema-v3';
const PHQ_KEY = 'her-space-phq9-v1';
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function parse(raw, description) {
  try { return JSON.parse(raw); } catch { throw new Error(`${description}损坏；原始记录不会覆盖，请先导出备份。`); }
}
export function validateBackup(value) {
  if (!object(value) || value.version !== 1 || !Number.isFinite(value.createdAt) || !object(value.raw) ||
    LEGACY_KEYS.some(key => !(key in value.raw) || value.raw[key] !== null && typeof value.raw[key] !== 'string') ||
    Object.keys(value.raw).some(key => !LEGACY_KEYS.includes(key))) throw new Error('迁移备份格式异常，不会覆盖。');
  return value;
}
export function initializeV3(storage, now = Date.now()) {
  // A backup holds the exact raw bytes, including malformed data. No lossy conversion.
  const existing = storage.getItem(BACKUP_KEY);
  if (existing !== null) validateBackup(parse(existing, '迁移备份'));
  else {
    const backup = { version: 1, createdAt: now, raw: Object.fromEntries(LEGACY_KEYS.map(k => [k, storage.getItem(k)])) };
    storage.setItem(BACKUP_KEY, JSON.stringify(backup)); // Quota errors propagate; don't mark ready.
  }
  const manifest = storage.getItem(MANIFEST_KEY);
  if (manifest !== null) {
    const value = parse(manifest, '数据版本');
    if (!object(value) || value.version !== 3 || value.backupKey !== BACKUP_KEY) throw new Error('数据版本异常，迁移已停止。');
  } else storage.setItem(MANIFEST_KEY, JSON.stringify({ version: 3, backupKey: BACKUP_KEY, createdAt: now }));
  return { version: 3, backupKey: BACKUP_KEY };
}
export function exportRawData(storage) {
  // Explicit user download only. Photos need an independent IndexedDB export in phase 3.
  const keys = [...LEGACY_KEYS, BACKUP_KEY, MANIFEST_KEY, PHQ_KEY];
  return JSON.stringify({ format: 'her-space-text-backup', version: 1, exportedAt: Date.now(), raw: Object.fromEntries(keys.map(k => [k, storage.getItem(k)])) }, null, 2);
}
export function readPHQ(storage) {
  const raw = storage.getItem(PHQ_KEY);
  if (raw === null) return [];
  const rows = parse(raw, 'PHQ-9记录');
  if (!Array.isArray(rows) || rows.some(r => !validPHQRecord(r)) || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('PHQ-9记录格式异常，不会覆盖。');
  return rows.slice().sort((a,b) => b.timestamp-a.timestamp);
}
function validPHQRecord(r) {
  return object(r) && r.schemaVersion === 1 && r.instrument === 'PHQ-9' && r.recallDays === 14 &&
    typeof r.id === 'string' && r.id.length > 0 && Number.isFinite(r.timestamp) &&
    typeof r.sourceVersion === 'string' && r.sourceVersion.length > 0 &&
    Array.isArray(r.answers) && r.answers.length === 9 && Array.from({length:9},(_,i)=>r.answers[i]).every(v => Number.isInteger(v) && v >= 0 && v <= 3) &&
    r.total === r.answers.reduce((a,b) => a+b,0);
}
export function savePHQ(storage, record) {
  if (!validPHQRecord(record)) throw new Error('PHQ-9记录必须有完整九题、正确总分及来源版本。');
  const rows = readPHQ(storage);
  // No implicit eviction, no modification of legacy records.
  storage.setItem(PHQ_KEY, JSON.stringify([structuredClone(record), ...rows.filter(r => r.id !== record.id)]));
}
export function deletePHQ(storage, id) {
  storage.setItem(PHQ_KEY, JSON.stringify(readPHQ(storage).filter(r => r.id !== id)));
}
export function clearPHQ(storage) { storage.removeItem(PHQ_KEY); }
export function clearAllVersionedData(storage) {
  // Explicit destructive action only, after UI confirmation. The backup is sensitive too.
  for (const key of [...LEGACY_KEYS, BACKUP_KEY, MANIFEST_KEY, PHQ_KEY]) storage.removeItem(key);
}
