import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────
// SHARED: convert @param → ? positional
// ──────────────────────────────────────
function toPositional(query, params = {}) {
  const values = [];
  const sql = query.replace(/@(\w+)/g, (_, name) => {
    values.push(params[name] ?? null);
    return '?';
  });
  return { sql, values };
}

function stripOutput(query) {
  return query.replace(/\s*OUTPUT\s+INSERTED\.id\s*/i, ' ');
}

// ──────────────────────────────────────
// ADAPTERS
// ──────────────────────────────────────
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  return row;
}

// SQL Server via msnodesqlv8
function createSqlServerAdapter(conn) {
  function query(sql, params = {}) {
    const { sql: q, values } = toPositional(sql, params);
    return new Promise((resolve, reject) => {
      conn.query(q, values, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(normalizeRow));
      });
    });
  }
  return {
    type: 'sqlserver',
    all: async (sql, params) => await query(sql, params),
    get: async (sql, params) => (await query(sql, params))[0] || null,
    insert: async (sql, params) => {
      const rows = await query(sql, params);
      const row = rows[0];
      if (!row) return undefined;
      return row.id ?? Object.values(row)[0];
    },
    run: async (sql, params) => { await query(sql, params); },
  };
}

// SQLite via better-sqlite3
function createSqliteAdapter(sqliteDb) {
  function toSqliteVals(values) {
    return values.map((v) => (v instanceof Date ? v.toISOString() : v));
  }
  return {
    type: 'sqlite',
    all: async (sql, params = {}) => {
      const { sql: q, values } = toPositional(sql, params);
      return sqliteDb.prepare(q).all(...toSqliteVals(values));
    },
    get: async (sql, params = {}) => {
      const { sql: q, values } = toPositional(sql, params);
      return sqliteDb.prepare(q).get(...toSqliteVals(values)) || null;
    },
    insert: async (sql, params = {}) => {
      const { sql: q, values } = toPositional(stripOutput(sql), params);
      const result = sqliteDb.prepare(q).run(...toSqliteVals(values));
      return Number(result.lastInsertRowid);
    },
    run: async (sql, params = {}) => {
      const { sql: q, values } = toPositional(sql, params);
      sqliteDb.prepare(q).run(...toSqliteVals(values));
    },
  };
}

// ──────────────────────────────────────
// CONNECT: msnodesqlv8 → SQLite fallback
// ──────────────────────────────────────
let db;

async function tryOpenSqlServer() {
  const msnodesqlv8 = (await import('msnodesqlv8')).default;

  const drivers = [
    'ODBC Driver 17 for SQL Server',
    'ODBC Driver 18 for SQL Server',
    'SQL Server Native Client 11.0',
  ];

  for (const driver of drivers) {
    const connStr = `Driver={${driver}};Server=(localdb)\\MSSQLLocalDB;Database=protekh_db;Trusted_Connection=Yes;`;
    try {
      const conn = await new Promise((resolve, reject) => {
        msnodesqlv8.open(connStr, (err, c) => (err ? reject(err) : resolve(c)));
      });
      await new Promise((resolve, reject) => {
        conn.query('SELECT 1 AS test', (err, rows) => (err ? reject(err) : resolve(rows)));
      });
      console.log(`[DB] Driver: ${driver}`);
      return conn;
    } catch {
      // Try next driver
    }
  }
  throw new Error('Hiçbir ODBC driver ile bağlanılamadı');
}

try {
  const conn = await tryOpenSqlServer();
  db = createSqlServerAdapter(conn);
  // Ensure product_id column exists on ticket table
  try { await db.run("IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ticket') AND name = 'product_id') ALTER TABLE ticket ADD product_id INT NULL"); } catch { /* ignore */ }
  // Ensure order_no columns exist on firm, user, product tables
  try { await db.run("IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('firm') AND name = 'order_no') ALTER TABLE firm ADD order_no INT NOT NULL DEFAULT 0"); } catch { /* ignore */ }
  try { await db.run("IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('[user]') AND name = 'order_no') ALTER TABLE [user] ADD order_no INT NOT NULL DEFAULT 0"); } catch { /* ignore */ }
  try { await db.run("IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('product') AND name = 'order_no') ALTER TABLE product ADD order_no INT NOT NULL DEFAULT 0"); } catch { /* ignore */ }

  const firms = await db.all('SELECT COUNT(*) AS c FROM firm');
  console.log('════════════════════════════════════════════════════');
  console.log(`[DB] SQL Server (localdb)\\MSSQLLocalDB → protekh_db`);
  console.log(`[DB] Firma sayısı: ${firms[0]?.c ?? 0}`);
  console.log('════════════════════════════════════════════════════');
} catch (err) {
  console.warn(`[DB] SQL Server kullanılamıyor: ${err.message}`);
  console.log('[DB] SQLite fallback\'a geçiliyor...');

  const Database = (await import('better-sqlite3')).default;
  const dbPath = join(__dirname, 'protekh.db');
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS entity_type (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_type (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ticket_status (id INTEGER PRIMARY KEY, name TEXT NOT NULL, is_closed INTEGER NOT NULL DEFAULT 0, order_no INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS ticket_priority (id INTEGER PRIMARY KEY, name TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS yetki (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS [user] (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', mail TEXT NOT NULL DEFAULT '', password TEXT NOT NULL DEFAULT '', tel TEXT NOT NULL DEFAULT '', firm_id INTEGER REFERENCES firm(id), yetki_id INTEGER NOT NULL DEFAULT 2);
    CREATE TABLE IF NOT EXISTS firm (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, inactive INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, color_hex TEXT);
    CREATE TABLE IF NOT EXISTS ticket (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, firm_id INTEGER REFERENCES firm(id) ON DELETE SET NULL, created_by INTEGER REFERENCES [user](id), assigned_user_id INTEGER REFERENCES [user](id) ON DELETE SET NULL, status_id INTEGER NOT NULL REFERENCES ticket_status(id), priority_id INTEGER NOT NULL REFERENCES ticket_priority(id), due_date TEXT);
    CREATE TABLE IF NOT EXISTS ticket_tag (ticket_id INTEGER NOT NULL REFERENCES ticket(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE, created_by INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, removed_at TEXT, removed_by INTEGER, PRIMARY KEY(ticket_id, tag_id));
    CREATE TABLE IF NOT EXISTS ticket_comment (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES ticket(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES [user](id), content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, entity_type_id INTEGER NOT NULL REFERENCES entity_type(id), entity_id INTEGER NOT NULL, event_type_id INTEGER NOT NULL REFERENCES event_type(id), description TEXT, created_by INTEGER, old_value TEXT, new_value TEXT);
    CREATE TABLE IF NOT EXISTS product (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', manager_id INTEGER NOT NULL REFERENCES [user](id));
    CREATE TABLE IF NOT EXISTS firm_product (firm_id INTEGER NOT NULL REFERENCES firm(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE, PRIMARY KEY(firm_id, product_id));
  `);

  function seedIfEmpty(table, rows) {
    const count = sqliteDb.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
    if (count === 0) {
      const cols = Object.keys(rows[0]);
      const ph = cols.map(() => '?').join(', ');
      const stmt = sqliteDb.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph})`);
      for (const row of rows) stmt.run(...cols.map((c) => row[c]));
    }
  }
  seedIfEmpty('ticket_status', [
    { id: 1, name: 'Açık', is_closed: 0, order_no: 1 },
    { id: 2, name: 'Devam Ediyor', is_closed: 0, order_no: 2 },
    { id: 3, name: 'Çözümlendi', is_closed: 1, order_no: 3 },
    { id: 4, name: 'Kapalı', is_closed: 1, order_no: 4 },
  ]);
  seedIfEmpty('ticket_priority', [
    { id: 1, name: 'Kritik', level: 1 },
    { id: 2, name: 'Yüksek', level: 2 },
    { id: 3, name: 'Normal', level: 3 },
    { id: 4, name: 'Düşük', level: 4 },
  ]);
  seedIfEmpty('entity_type', [
    { id: 1, name: 'User' }, { id: 2, name: 'Ticket' }, { id: 3, name: 'Firm' }, { id: 4, name: 'Tag' },
  ]);
  seedIfEmpty('event_type', [
    { id: 1, name: 'Created' }, { id: 2, name: 'Updated' }, { id: 3, name: 'Assigned' }, { id: 4, name: 'Deleted' },
  ]);
  seedIfEmpty('yetki', [
    { id: 1, name: 'Admin' }, { id: 2, name: 'Agent' }, { id: 3, name: 'Müşteri' },
  ]);

  // Add product_id column to ticket if not exists
  try { sqliteDb.exec('ALTER TABLE ticket ADD COLUMN product_id INTEGER REFERENCES product(id)'); } catch { /* already exists */ }
  // Add order_no columns
  try { sqliteDb.exec('ALTER TABLE firm ADD COLUMN order_no INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { sqliteDb.exec('ALTER TABLE [user] ADD COLUMN order_no INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { sqliteDb.exec('ALTER TABLE product ADD COLUMN order_no INTEGER NOT NULL DEFAULT 0'); } catch {}

  db = createSqliteAdapter(sqliteDb);
  console.log('════════════════════════════════════════════════════');
  console.log(`[DB] SQLite → ${dbPath}`);
  console.log('════════════════════════════════════════════════════');
}

// ──────────────────────────────────────
// ERROR WRAPPER
// ──────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────
function now() { return new Date(); }

async function logEvent(entityTypeId, eventTypeId, entityId, description, userId) {
  await db.run(
    `INSERT INTO event_log (entity_type_id, event_type_id, entity_id, description, created_by, created_at)
     VALUES (@entityTypeId, @eventTypeId, @entityId, @description, @userId, @createdAt)`,
    { entityTypeId, eventTypeId, entityId, description, userId: userId ?? null, createdAt: now() }
  );
}

async function toTicketJson(row) {
  if (!row) return null;
  const firm = row.firm_id ? await db.get('SELECT * FROM firm WHERE id = @id', { id: row.firm_id }) : null;
  const user = row.assigned_user_id ? await db.get('SELECT * FROM [user] WHERE id = @id', { id: row.assigned_user_id }) : null;
  const status = await db.get('SELECT * FROM ticket_status WHERE id = @id', { id: row.status_id });
  const priority = await db.get('SELECT * FROM ticket_priority WHERE id = @id', { id: row.priority_id });
  const product = row.product_id ? await db.get('SELECT * FROM product WHERE id = @id', { id: row.product_id }) : null;
  const createdByUser = row.created_by ? await db.get('SELECT * FROM [user] WHERE id = @id', { id: row.created_by }) : null;
  const tags = await db.all(
    `SELECT tt.*, t.name, t.description AS tag_description, t.color_hex
     FROM ticket_tag tt JOIN tag t ON tt.tag_id = t.id WHERE tt.ticket_id = @ticketId AND tt.removed_at IS NULL`,
    { ticketId: row.id }
  );

  const createEvent = await db.get('SELECT created_at FROM event_log WHERE entity_type_id = 2 AND entity_id = @id AND event_type_id = 1', { id: row.id });

  return {
    id: row.id, title: row.title, description: row.description,
    firmId: row.firm_id, assignedUserId: row.assigned_user_id,
    ticketStatusId: row.status_id, ticketPriorityId: row.priority_id,
    productId: row.product_id ?? null,
    createdAt: createEvent ? createEvent.created_at : null,
    createdBy: row.created_by,
    firm: firm ? { id: firm.id, name: firm.name } : null,
    assignedUser: user ? { id: user.id, name: user.name, mail: user.mail, tel: user.tel, roleId: user.yetki_id } : null,
    status: status ? { id: status.id, name: status.name, isClosed: !!status.is_closed, orderNo: status.order_no } : null,
    priority: priority ? { id: priority.id, name: priority.name, level: priority.level } : null,
    product: product ? { id: product.id, name: (product.name || '').trim() } : null,
    createdByUser: createdByUser ? { id: createdByUser.id, name: createdByUser.name } : null,
    ticketTags: tags.map((tt) => ({
      ticketId: tt.ticket_id, tagId: tt.tag_id, createdBy: tt.created_by, createdAt: tt.created_at,
      tag: { id: tt.tag_id, name: tt.name, description: tt.tag_description, colorHex: tt.color_hex },
    })),
  };
}

// ══════════════════════════════════════
// DIAGNOSTIC
// ══════════════════════════════════════
app.get('/api/debug', asyncHandler(async (_req, res) => {
  const firms = await db.all('SELECT * FROM firm');
  res.json({
    engine: db.type,
    firmCount: firms.length,
    firms,
  });
}));

// ══════════════════════════════════════
// FIRMS
// ══════════════════════════════════════
app.get('/api/firms', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM firm ORDER BY order_no ASC, id ASC');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, orderNo: r.order_no ?? 0 })));
}));

app.get('/api/firms/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM firm WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.id, name: row.name });
}));

app.post('/api/firms', asyncHandler(async (req, res) => {
  const { name } = req.body;
  const newId = await db.insert('INSERT INTO firm (name) OUTPUT INSERTED.id VALUES (@name)', { name });
  res.json({ id: newId, name });
}));

app.put('/api/firms/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM firm WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE firm SET name = @name WHERE id = @id', { name: req.body.name, id: Number(req.params.id) });
  res.json({ id: Number(req.params.id), name: req.body.name });
}));

app.delete('/api/firms/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM firm WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM firm WHERE id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ── Firm → Products (for matrix-based filtering) ──
app.get('/api/firms/:firmId/products', asyncHandler(async (req, res) => {
  const firmId = Number(req.params.firmId);
  const rows = await db.all(
    `SELECT p.* FROM product p JOIN firm_product fp ON p.id = fp.product_id WHERE fp.firm_id = @firmId ORDER BY p.order_no ASC, p.id ASC`,
    { firmId }
  );
  res.json(rows.map((r) => ({ id: r.id, name: (r.name || '').trim() })));
}));

// ══════════════════════════════════════
// TAGS
// ══════════════════════════════════════
app.get('/api/tags', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM tag');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, description: r.description, colorHex: r.color_hex })));
}));

app.get('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.id, name: row.name, description: row.description, colorHex: row.color_hex });
}));

app.post('/api/tags', asyncHandler(async (req, res) => {
  const { name, description, colorHex } = req.body;
  const newId = await db.insert(
    'INSERT INTO tag (name, description, color_hex) OUTPUT INSERTED.id VALUES (@name, @description, @colorHex)',
    { name, description: description ?? null, colorHex: colorHex ?? null }
  );
  res.json({ id: newId, name, description: description ?? null, colorHex: colorHex ?? null });
}));

app.put('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE tag SET name = @name, description = @description, color_hex = @colorHex WHERE id = @id',
    { name: req.body.name, description: req.body.description ?? null, colorHex: req.body.colorHex ?? null, id: Number(req.params.id) }
  );
  res.json({ id: Number(req.params.id), name: req.body.name, description: req.body.description ?? null, colorHex: req.body.colorHex ?? null });
}));

app.delete('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM tag WHERE id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════
app.get('/api/users', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM [user] ORDER BY order_no ASC, id ASC');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, mail: r.mail, tel: r.tel, roleId: r.yetki_id, password: r.password, orderNo: r.order_no ?? 0 })));
}));

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.id, name: row.name, mail: row.mail, tel: row.tel, roleId: row.yetki_id });
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const { name, mail, password, tel, roleId } = req.body;
  const newId = await db.insert(
    'INSERT INTO [user] (name, mail, password, tel, yetki_id) OUTPUT INSERTED.id VALUES (@name, @mail, @password, @tel, @roleId)',
    { name: name ?? '', mail: mail ?? '', password: password ?? '', tel: tel ?? '', roleId: roleId ?? 2 }
  );
  res.json({ id: newId, name, mail, tel, roleId: roleId ?? 2 });
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE [user] SET name = @name, mail = @mail, tel = @tel, yetki_id = @roleId WHERE id = @id',
    { name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.yetki_id, id: Number(req.params.id) }
  );
  res.json({ id: Number(req.params.id), name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.yetki_id });
}));

app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM [user] WHERE id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ══════════════════════════════════════
// TICKETS
// ══════════════════════════════════════
app.get('/api/tickets', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticket ORDER BY id DESC');
  const tickets = await Promise.all(rows.map(toTicketJson));
  res.json(tickets);
}));

app.get('/api/tickets/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(await toTicketJson(row));
}));

app.post('/api/tickets', asyncHandler(async (req, res) => {
  const { title, description, firmId, assignedUserId, ticketStatusId, ticketPriorityId, createdBy, productId } = req.body;
  const newId = await db.insert(
    `INSERT INTO ticket (title, description, firm_id, assigned_user_id, status_id, priority_id, created_by, product_id)
     OUTPUT INSERTED.id
     VALUES (@title, @description, @firmId, @assignedUserId, @ticketStatusId, @ticketPriorityId, @createdBy, @productId)`,
    {
      title, description: description ?? null,
      firmId: firmId ?? null, assignedUserId: assignedUserId ?? null,
      ticketStatusId: ticketStatusId ?? 1, ticketPriorityId: ticketPriorityId ?? 3,
      createdBy: createdBy ?? null, productId: productId ?? null,
    }
  );
  await logEvent(2, 1, newId, `Ticket created: ${title}`, createdBy);
  const created = await db.get('SELECT * FROM ticket WHERE id = @id', { id: newId });
  res.json(await toTicketJson(created));
}));

app.put('/api/tickets/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { title, description, ticketPriorityId, ticketStatusId, firmId, assignedUserId, updatedBy, productId } = req.body;

  // Detect specific field changes for activity log
  const changes = [];
  if (row.status_id !== ticketStatusId) {
    const oldS = await db.get('SELECT name FROM ticket_status WHERE id = @id', { id: row.status_id });
    const newS = await db.get('SELECT name FROM ticket_status WHERE id = @id', { id: ticketStatusId });
    changes.push({ field: 'status', oldVal: oldS?.name || null, newVal: newS?.name || null });
  }
  if (row.priority_id !== ticketPriorityId) {
    const oldP = await db.get('SELECT name FROM ticket_priority WHERE id = @id', { id: row.priority_id });
    const newP = await db.get('SELECT name FROM ticket_priority WHERE id = @id', { id: ticketPriorityId });
    changes.push({ field: 'priority', oldVal: oldP?.name || null, newVal: newP?.name || null });
  }
  if ((row.assigned_user_id || null) !== (assignedUserId || null)) {
    const oldU = row.assigned_user_id ? await db.get('SELECT name FROM [user] WHERE id = @id', { id: row.assigned_user_id }) : null;
    const newU = assignedUserId ? await db.get('SELECT name FROM [user] WHERE id = @id', { id: assignedUserId }) : null;
    changes.push({ field: 'assignedUser', oldVal: oldU?.name || null, newVal: newU?.name || null });
  }
  if ((row.firm_id || null) !== (firmId || null)) {
    const oldF = row.firm_id ? await db.get('SELECT name FROM firm WHERE id = @id', { id: row.firm_id }) : null;
    const newF = firmId ? await db.get('SELECT name FROM firm WHERE id = @id', { id: firmId }) : null;
    changes.push({ field: 'firm', oldVal: oldF?.name || null, newVal: newF?.name || null });
  }
  if ((row.product_id || null) !== (productId || null)) {
    const oldPr = row.product_id ? await db.get('SELECT name FROM product WHERE id = @id', { id: row.product_id }) : null;
    const newPr = productId ? await db.get('SELECT name FROM product WHERE id = @id', { id: productId }) : null;
    changes.push({ field: 'product', oldVal: (oldPr?.name || '').trim() || null, newVal: (newPr?.name || '').trim() || null });
  }

  await db.run(
    `UPDATE ticket SET title=@title, description=@description, priority_id=@ticketPriorityId,
     status_id=@ticketStatusId, firm_id=@firmId, assigned_user_id=@assignedUserId, product_id=@productId WHERE id=@id`,
    {
      title, description: description ?? null,
      ticketPriorityId, ticketStatusId,
      firmId: firmId ?? null, assignedUserId: assignedUserId ?? null,
      productId: productId ?? null,
      id: Number(req.params.id),
    }
  );

  // Log each field change individually
  for (const ch of changes) {
    await db.run(
      `INSERT INTO event_log (entity_type_id, event_type_id, entity_id, description, created_by, created_at, old_value, new_value)
       VALUES (@entityTypeId, @eventTypeId, @entityId, @description, @userId, @createdAt, @oldValue, @newValue)`,
      { entityTypeId: 2, eventTypeId: 2, entityId: row.id, description: `Field:${ch.field}`, userId: updatedBy ?? null, createdAt: now(), oldValue: ch.oldVal, newValue: ch.newVal }
    );
  }
  if (changes.length === 0) {
    await logEvent(2, 2, row.id, `Ticket updated: ${title}`, updatedBy);
  }

  const updated = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

app.delete('/api/tickets/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  await logEvent(2, 4, row.id, 'Ticket deleted', null);
  res.json({ success: true });
}));

// ── Ticket Comments ──
app.get('/api/tickets/:id/comments', asyncHandler(async (req, res) => {
  const rows = await db.all(
    `SELECT c.*, u.name AS user_name, u.mail AS user_mail, u.tel AS user_tel, u.yetki_id AS user_yetki_id
     FROM ticket_comment c LEFT JOIN [user] u ON c.user_id = u.id
     WHERE c.ticket_id = @ticketId ORDER BY c.created_at DESC`,
    { ticketId: Number(req.params.id) }
  );
  res.json(rows.map((r) => ({
    id: r.id, ticketId: r.ticket_id, userId: r.user_id, content: r.content, createdAt: r.created_at,
    user: r.user_name ? { id: r.user_id, name: r.user_name, mail: r.user_mail, tel: r.user_tel, roleId: r.user_yetki_id } : null,
  })));
}));

app.post('/api/tickets/:id/comments', asyncHandler(async (req, res) => {
  const { content, userId } = req.body;
  const createdAt = now();
  const newId = await db.insert(
    'INSERT INTO ticket_comment (ticket_id, user_id, content, created_at) OUTPUT INSERTED.id VALUES (@ticketId, @userId, @content, @createdAt)',
    { ticketId: Number(req.params.id), userId, content, createdAt }
  );
  await logEvent(2, 2, Number(req.params.id), 'Comment added', userId);
  const user = await db.get('SELECT * FROM [user] WHERE id = @id', { id: userId });
  res.json({
    id: newId, ticketId: Number(req.params.id), userId, content, createdAt,
    user: user ? { id: user.id, name: user.name, mail: user.mail, tel: user.tel, roleId: user.yetki_id } : null,
  });
}));

// ── Assign ──
app.post('/api/tickets/:id/assign/:userId', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE ticket SET assigned_user_id = @userId WHERE id = @id', { userId: Number(req.params.userId), id: Number(req.params.id) });
  await logEvent(2, 3, row.id, `Assigned to user ${req.params.userId}`, Number(req.params.userId));
  const updated = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

// ── Status Change ──
app.post('/api/tickets/:id/status/:statusId', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE ticket SET status_id = @statusId WHERE id = @id', { statusId: Number(req.params.statusId), id: Number(req.params.id) });
  await logEvent(2, 2, row.id, `Status changed to ${req.params.statusId}`, row.assigned_user_id);
  const updated = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

// ── Tags on Ticket ──
app.post('/api/tickets/:id/tag/:tagId', asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId ?? 0);
  const ticketId = Number(req.params.id);
  const tagId = Number(req.params.tagId);

  const active = await db.get(
    'SELECT 1 AS x FROM ticket_tag WHERE ticket_id = @ticketId AND tag_id = @tagId AND removed_at IS NULL',
    { ticketId, tagId }
  );
  if (active) return res.status(400).json({ error: 'Tag already exists' });

  // Check if soft-deleted row exists (re-add scenario)
  const softDeleted = await db.get(
    'SELECT 1 AS x FROM ticket_tag WHERE ticket_id = @ticketId AND tag_id = @tagId AND removed_at IS NOT NULL',
    { ticketId, tagId }
  );

  if (softDeleted) {
    await db.run(
      'UPDATE ticket_tag SET removed_at = NULL, removed_by = NULL, created_by = @createdBy, created_at = @createdAt WHERE ticket_id = @ticketId AND tag_id = @tagId',
      { ticketId, tagId, createdBy: userId, createdAt: now() }
    );
  } else {
    await db.run(
      'INSERT INTO ticket_tag (ticket_id, tag_id, created_by, created_at) VALUES (@ticketId, @tagId, @createdBy, @createdAt)',
      { ticketId, tagId, createdBy: userId, createdAt: now() }
    );
  }

  await logEvent(2, 2, ticketId, `Tag ${tagId} added`, userId);
  res.json({ success: true });
}));

app.delete('/api/tickets/:id/tag/:tagId', asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId ?? 0);
  const tag = await db.get(
    'SELECT * FROM ticket_tag WHERE ticket_id = @ticketId AND tag_id = @tagId AND removed_at IS NULL',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId) }
  );
  if (!tag) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE ticket_tag SET removed_at = @removedAt, removed_by = @removedBy WHERE ticket_id = @ticketId AND tag_id = @tagId',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId), removedAt: now(), removedBy: userId }
  );
  await logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} removed`, userId);
  res.json({ success: true });
}));

// ══════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════
async function toProductJson(row) {
  if (!row) return null;
  const manager = row.manager_id ? await db.get('SELECT * FROM [user] WHERE id = @id', { id: row.manager_id }) : null;
  const fps = await db.all(
    'SELECT fp.*, f.name AS firm_name FROM firm_product fp JOIN firm f ON fp.firm_id = f.id WHERE fp.product_id = @productId',
    { productId: row.id }
  );
  return {
    id: row.id,
    name: (row.name || '').trim(),
    managerId: row.manager_id,
    manager: manager ? { id: manager.id, name: manager.name, mail: manager.mail, tel: manager.tel, roleId: manager.yetki_id } : null,
    firmProducts: fps.map((fp) => ({
      firmId: fp.firm_id,
      productId: fp.product_id,
      firm: { id: fp.firm_id, name: fp.firm_name },
    })),
  };
}

app.get('/api/products', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM product ORDER BY order_no ASC, id ASC');
  const products = await Promise.all(rows.map(toProductJson));
  res.json(products);
}));

app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM product WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(await toProductJson(row));
}));

app.post('/api/products', asyncHandler(async (req, res) => {
  const { name, managerId } = req.body;
  let newId;
  if (db.type === 'sqlserver') {
    // product.id is NOT IDENTITY in SQL Server – calculate next id manually
    const maxRow = await db.get('SELECT ISNULL(MAX(id), 0) AS maxId FROM product');
    newId = (maxRow?.maxId ?? 0) + 1;
    await db.run(
      'INSERT INTO product (id, name, manager_id) VALUES (@id, @name, @managerId)',
      { id: newId, name: name ?? '', managerId }
    );
  } else {
    newId = await db.insert(
      'INSERT INTO product (name, manager_id) VALUES (@name, @managerId)',
      { name: name ?? '', managerId }
    );
  }
  const created = await db.get('SELECT * FROM product WHERE id = @id', { id: newId });
  res.json(await toProductJson(created));
}));

app.put('/api/products/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM product WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE product SET name = @name, manager_id = @managerId WHERE id = @id',
    { name: req.body.name, managerId: req.body.managerId, id: Number(req.params.id) }
  );
  const updated = await db.get('SELECT * FROM product WHERE id = @id', { id: Number(req.params.id) });
  res.json(await toProductJson(updated));
}));

app.delete('/api/products/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM product WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM product WHERE id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ── Product-Firm many-to-many ──
app.post('/api/products/:id/firms/:firmId', asyncHandler(async (req, res) => {
  const exists = await db.get(
    'SELECT 1 AS x FROM firm_product WHERE product_id = @productId AND firm_id = @firmId',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  if (exists) return res.status(400).json({ error: 'Bu firma zaten bu ürüne eklenmiş.' });
  await db.run(
    'INSERT INTO firm_product (product_id, firm_id) VALUES (@productId, @firmId)',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  res.json({ success: true });
}));

app.delete('/api/products/:id/firms/:firmId', asyncHandler(async (req, res) => {
  const fp = await db.get(
    'SELECT 1 AS x FROM firm_product WHERE product_id = @productId AND firm_id = @firmId',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  if (!fp) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'DELETE FROM firm_product WHERE product_id = @productId AND firm_id = @firmId',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  res.json({ success: true });
}));

// ── Lookup endpoints ──
app.get('/api/ticket-statuses', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticket_status ORDER BY order_no');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, isClosed: !!r.is_closed, orderNo: r.order_no })));
}));

app.get('/api/ticket-priorities', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticket_priority ORDER BY level');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, level: r.level })));
}));

// ══════════════════════════════════════
// ROLES (yetki)
// ══════════════════════════════════════
app.get('/api/roles', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM yetki ORDER BY id');
  res.json(rows.map((r) => ({ id: r.id, name: r.name })));
}));

// ══════════════════════════════════════
// TICKET ACTIVITY (comments + tag events merged)
// ══════════════════════════════════════
app.get('/api/tickets/:id/activity', asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.id);

  const comments = await db.all(
    `SELECT c.*, u.name AS user_name FROM ticket_comment c
     LEFT JOIN [user] u ON c.user_id = u.id
     WHERE c.ticket_id = @ticketId`,
    { ticketId }
  );

  const tagEvents = await db.all(
    `SELECT el.*, u.name AS user_name FROM event_log el
     LEFT JOIN [user] u ON el.created_by = u.id
     WHERE el.entity_type_id = 2 AND el.entity_id = @ticketId
       AND (el.description LIKE 'Tag % added' OR el.description LIKE 'Tag % removed')`,
    { ticketId }
  );

  const fieldEvents = await db.all(
    `SELECT el.*, u.name AS user_name FROM event_log el
     LEFT JOIN [user] u ON el.created_by = u.id
     WHERE el.entity_type_id = 2 AND el.entity_id = @ticketId
       AND el.description LIKE 'Field:%'`,
    { ticketId }
  );

  const activity = [];

  for (const c of comments) {
    activity.push({
      type: 'comment',
      id: `comment-${c.id}`,
      content: c.content,
      userId: c.user_id,
      userName: c.user_name,
      createdAt: c.created_at,
    });
  }

  for (const ev of tagEvents) {
    const match = ev.description.match(/^Tag (\d+) (added|removed)$/);
    if (!match) continue;
    const tagId = Number(match[1]);
    const action = match[2];
    const tag = await db.get('SELECT * FROM tag WHERE id = @id', { id: tagId });
    activity.push({
      type: action === 'added' ? 'tag_added' : 'tag_removed',
      id: `tag-${ev.id}`,
      tagId,
      tagName: tag?.name || `Tag #${tagId}`,
      colorHex: tag?.color_hex,
      userId: ev.created_by,
      userName: ev.user_name,
      createdAt: ev.created_at,
    });
  }

  for (const ev of fieldEvents) {
    const field = ev.description.replace('Field:', '');
    activity.push({
      type: 'field_changed',
      id: `field-${ev.id}`,
      field,
      oldValue: ev.old_value,
      newValue: ev.new_value,
      userId: ev.created_by,
      userName: ev.user_name,
      createdAt: ev.created_at,
    });
  }

  activity.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json(activity);
}));

// ──────────────────────────────────────
// START
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API server running → http://localhost:${PORT}`);
});