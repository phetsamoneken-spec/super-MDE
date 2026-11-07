import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = fs.readFileSync(path.join(root, 'data/outlet.xlsx'));
const workbook = XLSX.read(input, { type: 'buffer' });
const headers = ['MDE NAME', 'OUTLET CODE', 'OUTLET', 'MIAN CHANEL', 'CHENEL', 'SUB-CHANEL', 'VILLAG', 'DISTRICT', 'PROVINCE'];
if (workbook.SheetNames.length !== 1) throw new Error('Review new sheets before generating the outlet dataset.');
const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
if (JSON.stringify(sheet.shift()) !== JSON.stringify(headers)) throw new Error('Workbook headers do not match the nine reviewed columns.');
const rows = sheet.filter((row) => row.some((cell) => cell !== '')).map((row) => row.map(String));
if (rows.some((row) => row.length !== 9 || row.some((cell) => !cell.trim()))) throw new Error('Incomplete outlet record.');
if (new Set(rows.map((row) => row[1])).size !== rows.length) throw new Error('Duplicate outlet codes.');

function id(kind, value) {
  const bytes = createHash('sha1').update(`promotrack:outlet:${kind}:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const distinct = (values) => [...new Set(values)];
const mdes = distinct(rows.map((row) => row[0])).map((name) => ({ id: id('mde', name), name }));
const mainChannels = distinct(rows.map((row) => row[3])).map((name) => ({ id: id('main-channel', name), name }));
const channels = distinct(rows.map((row) => row[4])).map((name) => {
  const parents = distinct(rows.filter((row) => row[4] === name).map((row) => row[3]));
  if (parents.length !== 1) throw new Error(`Ambiguous channel hierarchy: ${name}`);
  return { id: id('channel', name), name, mainChannelId: mainChannels.find((item) => item.name === parents[0]).id };
});
const subChannels = distinct(rows.map((row) => `${row[4]}\u0000${row[5]}`)).map((key) => {
  const [parent, name] = key.split('\u0000');
  return { id: id('sub-channel', key), name, channelId: channels.find((item) => item.name === parent).id };
});
const outlets = rows.map(([mdeName, storeCode, storeName, mainChannel, channel, subChannel, village, district, province], index) => ({
  id: id('store', storeCode), sourceRow: index + 2, mdeName, storeCode, storeName, mainChannel, channel, subChannel, village, district, province,
  mdeId: mdes.find((item) => item.name === mdeName).id,
  mainChannelId: mainChannels.find((item) => item.name === mainChannel).id,
  channelId: channels.find((item) => item.name === channel).id,
  subChannelId: subChannels.find((item) => item.name === subChannel && channels.find((parent) => parent.id === item.channelId).name === channel).id
}));
const dataset = { source: { file: 'outlet.xlsx', sheet: workbook.SheetNames[0], sha256: createHash('sha256').update(input).digest('hex'), headers, count: rows.length }, localAdminId: id('local-admin', 'admin'), mdes, mainChannels, channels, subChannels, outlets };
const write = (relative, contents) => fs.writeFileSync(path.join(root, relative), contents);
write('src/data/outletDataset.json', JSON.stringify(dataset, null, 2) + '\n');

const quote = (value) => value && typeof value === 'object' && 'sql' in value ? value.sql : `'${String(value).replaceAll("'", "''")}'`;
const ref = (table, name) => ({ sql: `(SELECT id FROM public.${table} WHERE name = ${quote(name)})` });
function insert(table, columns, records, conflict) {
  const keys = conflict.split(',').map((column) => column.trim());
  const updates = columns.filter((column) => column !== 'id' && !keys.includes(column));
  const action = updates.length ? `DO UPDATE SET ${updates.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}` : 'DO NOTHING';
  return `INSERT INTO public.${table} (${columns.join(', ')}) VALUES\n${records.map((record) => `  (${record.map(quote).join(', ')})`).join(',\n')}\nON CONFLICT (${conflict}) ${action};\n`;
}
let sql = `-- Generated only from data/outlet.xlsx. SHA-256: ${dataset.source.sha256}\n-- Apply schema migrations first. No auth accounts, products, orders, tasks, or promotions are fabricated.\n-- Intended for the project selected by its owner; does not delete unrelated existing records.\nBEGIN;\n`;
sql += insert('main_channels', ['id', 'name'], mainChannels.map((item) => [item.id, item.name]), 'name');
sql += insert('mdes', ['id', 'name'], mdes.map((item) => [item.id, item.name]), 'name');
sql += insert('channels', ['id', 'name', 'main_channel_id'], channels.map((item) => [item.id, item.name, ref('main_channels', mainChannels.find((main) => main.id === item.mainChannelId).name)]), 'name');
sql += insert('sub_channels', ['id', 'channel_id', 'name'], subChannels.map((item) => [item.id, ref('channels', channels.find((channel) => channel.id === item.channelId).name), item.name]), 'channel_id, name');
const columns = ['id', 'store_code', 'store_name', 'mde_name', 'main_channel', 'channel', 'sub_channel', 'village', 'district', 'province', 'mde_id', 'main_channel_id', 'channel_id', 'sub_channel_id'];
sql += insert('stores', columns, outlets.map((item) => [item.id, item.storeCode, item.storeName, item.mdeName, item.mainChannel, item.channel, item.subChannel, item.village, item.district, item.province, ref('mdes', item.mdeName), ref('main_channels', item.mainChannel), ref('channels', item.channel), { sql: `(SELECT id FROM public.sub_channels WHERE name = ${quote(item.subChannel)} AND channel_id = ${ref('channels', item.channel).sql})` }]), 'store_code');
sql += 'COMMIT;\n';
write('supabase/seed.sql', sql);
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
const withoutTransaction = (value) => value.replace(/^BEGIN;\s*$/gm, '').replace(/^COMMIT;\s*$/gm, '');
const freshSetup = '-- FRESH PROJECT ONLY: creates the PromoTrack schema and imports outlet.xlsx.\n-- For an existing project, inspect migration history and existing data first.\nBEGIN;\n' + migrationFiles.map((name) => `\n-- ${name}\n${withoutTransaction(fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8'))}`).join('\n') + '\n' + withoutTransaction(sql) + '\nCOMMIT;\n';
write('supabase/outlet-fresh-setup.sql', freshSetup);
const template = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(template, XLSX.utils.aoa_to_sheet([headers]), 'Outlets');
XLSX.writeFile(template, path.join(root, 'public/templates/store_import_template.xlsx'));
console.log(`Generated ${outlets.length} outlets, ${mdes.length} MDEs, ${channels.length} channels and ${subChannels.length} Sub-channels from outlet.xlsx.`);
