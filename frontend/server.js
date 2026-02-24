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
    'ODBC Driver 18 for SQL Server',
    'ODBC Driver 17 for SQL Server',
    'SQL Server Native Client 11.0',
    'SQL Server',
  ];

  const servers = [
    '(localdb)\\MSSQLLocalDB',
    'localhost',
    '.\\SQLEXPRESS',
    'localhost\\SQLEXPRESS',
    '.',
  ];

  // Allow override via environment variable
  if (process.env.DB_CONN) {
    try {
      const conn = await new Promise((resolve, reject) => {
        msnodesqlv8.open(process.env.DB_CONN, (err, c) => (err ? reject(err) : resolve(c)));
      });
      await new Promise((resolve, reject) => {
        conn.query('SELECT 1 AS test', (err, rows) => (err ? reject(err) : resolve(rows)));
      });
      console.log(`[DB] Custom connection: DB_CONN`);
      return conn;
    } catch (e) {
      console.warn(`[DB] DB_CONN failed: ${e.message}`);
    }
  }

  for (const driver of drivers) {
    for (const server of servers) {
      // Driver 18 requires TrustServerCertificate=Yes by default
      const extra = driver.includes('18') ? 'TrustServerCertificate=Yes;' : '';
      const connStr = `Driver={${driver}};Server=${server};Database=Protekh;Trusted_Connection=Yes;${extra}`;
      try {
        const conn = await new Promise((resolve, reject) => {
          msnodesqlv8.open(connStr, (err, c) => (err ? reject(err) : resolve(c)));
        });
        await new Promise((resolve, reject) => {
          conn.query('SELECT 1 AS test', (err, rows) => (err ? reject(err) : resolve(rows)));
        });
        console.log(`[DB] Driver: ${driver}, Server: ${server}`);
        return conn;
      } catch {
        // Try next combination
      }
    }
  }
  throw new Error('Hiçbir ODBC driver/server ile bağlanılamadı');
}

try {
  const conn = await tryOpenSqlServer();
  db = createSqlServerAdapter(conn);
  // Ensure productId column exists on ticket table
  try { await db.run("IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ticket') AND name = 'productId') ALTER TABLE ticket ADD productId INT NULL"); } catch { /* ignore */ }

  const firms = await db.all('SELECT COUNT(*) AS c FROM firm');
  const products = await db.all('SELECT COUNT(*) AS c FROM product');
  const fpCount = await db.all('SELECT COUNT(*) AS c FROM firmProduct');
  console.log('════════════════════════════════════════════════════');
  console.log(`[DB] SQL Server → Protekh`);
  console.log(`[DB] Firma: ${firms[0]?.c ?? 0}, Ürün: ${products[0]?.c ?? 0}, Firma-Ürün: ${fpCount[0]?.c ?? 0}`);
  console.log('════════════════════════════════════════════════════');
} catch (err) {
  console.warn('╔════════════════════════════════════════════════════╗');
  console.warn('║  ⚠ SQL Server bağlantısı başarısız!               ║');
  console.warn(`║  Hata: ${err.message.substring(0, 44).padEnd(44)} ║`);
  console.warn('║  SQLite fallback kullanılıyor (boş veri!)         ║');
  console.warn('╚════════════════════════════════════════════════════╝');

  const Database = (await import('better-sqlite3')).default;
  const dbPath = join(__dirname, 'protekh.db');
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS entityType (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS eventType (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ticketStatus (id INTEGER PRIMARY KEY, name TEXT NOT NULL, isClosed INTEGER NOT NULL DEFAULT 0, orderNo INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS ticketPriority (id INTEGER PRIMARY KEY, name TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS yetki (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS [user] (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', mail TEXT NOT NULL DEFAULT '', password TEXT NOT NULL DEFAULT '', tel TEXT NOT NULL DEFAULT '', firmId INTEGER REFERENCES firm(id), yetkiId INTEGER NOT NULL DEFAULT 2);
    CREATE TABLE IF NOT EXISTS firm (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, inactive INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, colorHex TEXT);
    CREATE TABLE IF NOT EXISTS ticket (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, firmId INTEGER REFERENCES firm(id) ON DELETE SET NULL, createdBy INTEGER REFERENCES [user](id), assignedUserId INTEGER REFERENCES [user](id) ON DELETE SET NULL, statusId INTEGER NOT NULL REFERENCES ticketStatus(id), priorityId INTEGER NOT NULL REFERENCES ticketPriority(id), dueDate TEXT);
    CREATE TABLE IF NOT EXISTS ticketTag (ticketId INTEGER NOT NULL REFERENCES ticket(id) ON DELETE CASCADE, tagId INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE, createdBy INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, removedAt TEXT, removedBy INTEGER, PRIMARY KEY(ticketId, tagId));
    CREATE TABLE IF NOT EXISTS ticketComment (id INTEGER PRIMARY KEY AUTOINCREMENT, ticketId INTEGER NOT NULL REFERENCES ticket(id) ON DELETE CASCADE, userId INTEGER NOT NULL REFERENCES [user](id), content TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS eventLog (id INTEGER PRIMARY KEY AUTOINCREMENT, createdAt TEXT NOT NULL, entityTypeId INTEGER NOT NULL REFERENCES entityType(id), entityId INTEGER NOT NULL, eventTypeId INTEGER NOT NULL REFERENCES eventType(id), description TEXT, createdBy INTEGER, oldValue TEXT, newValue TEXT);
    CREATE TABLE IF NOT EXISTS product (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', managerId INTEGER NOT NULL REFERENCES [user](id));
    CREATE TABLE IF NOT EXISTS firmProduct (firmId INTEGER NOT NULL REFERENCES firm(id) ON DELETE CASCADE, productId INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE, PRIMARY KEY(firmId, productId));
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
  seedIfEmpty('ticketStatus', [
    { id: 1, name: 'new', is_closed: 0, order_no: 1 },
    { id: 2, name: 'in_progress', is_closed: 0, order_no: 2 },
    { id: 3, name: 'waiting', is_closed: 0, order_no: 3 },
    { id: 4, name: 'pending_close', is_closed: 0, order_no: 4 },
    { id: 5, name: 'closed', is_closed: 1, order_no: 5 },
  ]);
  seedIfEmpty('ticketPriority', [
    { id: 1, name: 'Kritik', level: 1 },
    { id: 2, name: 'Yüksek', level: 2 },
    { id: 3, name: 'Normal', level: 3 },
    { id: 4, name: 'Düşük', level: 4 },
  ]);
  seedIfEmpty('entityType', [
    { id: 1, name: 'User' }, { id: 2, name: 'Ticket' }, { id: 3, name: 'Firm' }, { id: 4, name: 'Tag' },
  ]);
  seedIfEmpty('eventType', [
    { id: 1, name: 'Created' }, { id: 2, name: 'Updated' }, { id: 3, name: 'Assigned' }, { id: 4, name: 'Deleted' },
  ]);
  seedIfEmpty('yetki', [
    { id: 1, name: 'Admin' }, { id: 2, name: 'Agent' }, { id: 3, name: 'Müşteri' },
  ]);

  // Add productId column to ticket if not exists
  try { sqliteDb.exec('ALTER TABLE ticket ADD COLUMN productId INTEGER REFERENCES product(id)'); } catch { /* already exists */ }

  // ── Sync data from .NET SQLite DB (Protekh) ──
  const { existsSync } = await import('fs');
  const netDbPath = join(__dirname, '..', 'Protekh');
  if (existsSync(netDbPath)) {
    try {
      sqliteDb.exec(`ATTACH DATABASE '${netDbPath.replace(/'/g, "''")}' AS netdb`);
      console.log('[DB] .NET SQLite bulundu, senkronize ediliyor...');

      const trySql = (label, ...sqls) => {
        for (const sql of sqls) {
          try { sqliteDb.exec(sql); return; } catch { /* try next */ }
        }
        console.warn(`  [SKIP] ${label}`);
      };

      // Lookup tables (PascalCase → snake_case mapping)
      trySql('entityType',
        'DELETE FROM entityType; INSERT INTO entityType (id, name) SELECT Id, Name FROM netdb.entityType');
      trySql('eventType',
        'DELETE FROM eventType; INSERT INTO eventType (id, name) SELECT Id, Name FROM netdb.eventType');
      trySql('yetki',
        'DELETE FROM yetki; INSERT INTO yetki (id, name) SELECT Id, Name FROM netdb.yetki');
      trySql('ticketStatus',
        'DELETE FROM ticketStatus; INSERT INTO ticketStatus (id, name, isClosed, orderNo) SELECT Id, Name, IsClosed, OrderNo FROM netdb.ticketStatus',
        'DELETE FROM ticketStatus; INSERT INTO ticketStatus (id, name, isClosed, orderNo) SELECT Id, Name, isClosed, orderNo FROM netdb.ticketStatus');
      trySql('ticketPriority',
        'DELETE FROM ticketPriority; INSERT INTO ticketPriority (id, name, level) SELECT Id, Name, Level FROM netdb.ticketPriority');

      // Main tables (with orderNo)
      trySql('firm',
        'DELETE FROM firm; INSERT INTO firm (id, name, orderNo) SELECT Id, Name, COALESCE(orderNo, 0) FROM netdb.firm',
        'DELETE FROM firm; INSERT INTO firm (id, name) SELECT Id, Name FROM netdb.firm');
      trySql('product',
        'DELETE FROM product; INSERT INTO product (id, name, managerId, orderNo) SELECT Id, Name, managerId, COALESCE(orderNo, 0) FROM netdb.product',
        'DELETE FROM product; INSERT INTO product (id, name, managerId) SELECT Id, Name, managerId FROM netdb.product');
      trySql('[user]',
        'DELETE FROM [user]; INSERT INTO [user] (id, name, mail, password, tel, yetkiId, orderNo) SELECT Id, Name, Mail, Password, Tel, RoleId, COALESCE(orderNo, 0) FROM netdb.[user]',
        'DELETE FROM [user]; INSERT INTO [user] (id, name, mail, password, tel, yetkiId) SELECT Id, Name, Mail, Password, Tel, RoleId FROM netdb.[user]');
      trySql('tag',
        'DELETE FROM tag; INSERT INTO tag (id, name, description, colorHex) SELECT Id, Name, Description, ColorHex FROM netdb.tag');
      trySql('firmProduct',
        'DELETE FROM firmProduct; INSERT INTO firmProduct (firmId, productId) SELECT firmId, productId FROM netdb.firmProduct');

      sqliteDb.exec('DETACH DATABASE netdb');
      console.log('[DB] .NET SQLite senkronizasyonu tamamlandi');
    } catch (e) {
      console.warn('[DB] .NET sync hatasi:', e.message);
      try { sqliteDb.exec('DETACH DATABASE netdb'); } catch {1}
    }
  }

  db = createSqliteAdapter(sqliteDb);
  console.log('════════════════════════════════════════════════════');
  console.log(`[DB] SQLite → ${dbPath}`);
  if (existsSync(netDbPath)) console.log(`[DB] .NET DB → ${netDbPath} (synced)`);
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
    `INSERT INTO eventLog (entityTypeId, eventTypeId, entityId, description, createdBy, createdAt)
     VALUES (@entityTypeId, @eventTypeId, @entityId, @description, @userId, @createdAt)`,
    { entityTypeId, eventTypeId, entityId, description, userId: userId ?? null, createdAt: now() }
  );
}

async function toTicketJson(row) {
  if (!row) return null;
  const firm = row.firmId ? await db.get('SELECT * FROM firm WHERE id = @id', { id: row.firmId }) : null;
  const user = row.assignedUserId ? await db.get('SELECT * FROM [user] WHERE id = @id', { id: row.assignedUserId }) : null;
  const status = await db.get('SELECT * FROM ticketStatus WHERE id = @id', { id: row.statusId });
  const priority = await db.get('SELECT * FROM ticketPriority WHERE id = @id', { id: row.priorityId });
  const product = row.productId ? await db.get('SELECT * FROM product WHERE id = @id', { id: row.productId }) : null;
  const createdByUser = row.createdBy ? await db.get('SELECT * FROM [user] WHERE id = @id', { id: row.createdBy }) : null;
  const tags = await db.all(
    `SELECT tt.*, t.name, t.description AS tagDescription, t.colorHex
     FROM ticketTag tt JOIN tag t ON tt.tagId = t.id WHERE tt.ticketId = @ticketId AND tt.removedAt IS NULL`,
    { ticketId: row.id }
  );

  const createEvent = await db.get('SELECT createdAt FROM eventLog WHERE entityTypeId = 2 AND entityId = @id AND eventTypeId = 1', { id: row.id });

  return {
    id: row.id, title: row.title, description: row.description,
    firmId: row.firmId, assignedUserId: row.assignedUserId,
    ticketStatusId: row.statusId, ticketPriorityId: row.priorityId,
    productId: row.productId ?? null,
    createdAt: createEvent ? createEvent.createdAt : null,
    createdBy: row.createdBy,
    firm: firm ? { id: firm.id, name: firm.name } : null,
    assignedUser: user ? { id: user.id, name: user.name, mail: user.mail, tel: user.tel, roleId: user.yetkiId } : null,
    status: status ? { id: status.id, name: status.name, isClosed: !!status.isClosed, orderNo: status.orderNo } : null,
    priority: priority ? { id: priority.id, name: priority.name, level: priority.level } : null,
    product: product ? { id: product.id, name: (product.name || '').trim() } : null,
    createdByUser: createdByUser ? { id: createdByUser.id, name: createdByUser.name } : null,
    ticketTags: tags.map((tt) => ({
      ticketId: tt.ticketId, tagId: tt.tagId, createdBy: tt.createdBy, createdAt: tt.createdAt,
      tag: { id: tt.tagId, name: tt.name, description: tt.tagDescription, colorHex: tt.colorHex },
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
  let rows;
  try { rows = await db.all('SELECT * FROM firm ORDER BY orderNo ASC, id ASC'); }
  catch { rows = await db.all('SELECT * FROM firm ORDER BY id ASC'); }
  res.json(rows.map((r) => ({ id: r.id, name: r.name, orderNo: r.orderNo ?? 0 })));
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
  console.log(`[DEBUG] GET /api/firms/${firmId}/products → db.type=${db.type}`);
  let rows;
  try {
    rows = await db.all(
      `SELECT p.* FROM product p JOIN firmProduct fp ON p.id = fp.productId WHERE fp.firmId = @firmId ORDER BY p.orderNo ASC, p.id ASC`,
      { firmId }
    );
  } catch (e) {
    console.warn(`[DEBUG] firm-products orderNo query failed: ${e.message}`);
    rows = await db.all(
      `SELECT p.* FROM product p JOIN firmProduct fp ON p.id = fp.productId WHERE fp.firmId = @firmId ORDER BY p.id ASC`,
      { firmId }
    );
  }
  console.log(`[DEBUG] firm-products result: ${rows.length} rows`);
  res.json(rows.map((r) => ({ id: r.id, name: (r.name || '').trim() })));
}));

// ══════════════════════════════════════
// TAGS
// ══════════════════════════════════════
app.get('/api/tags', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM tag');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, description: r.description, colorHex: r.colorHex })));
}));

app.get('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.id, name: row.name, description: row.description, colorHex: row.colorHex });
}));

app.post('/api/tags', asyncHandler(async (req, res) => {
  const { name, description, colorHex } = req.body;
  const newId = await db.insert(
    'INSERT INTO tag (name, description, colorHex) OUTPUT INSERTED.id VALUES (@name, @description, @colorHex)',
    { name, description: description ?? null, colorHex: colorHex ?? null }
  );
  res.json({ id: newId, name, description: description ?? null, colorHex: colorHex ?? null });
}));

app.put('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE tag SET name = @name, description = @description, colorHex = @colorHex WHERE id = @id',
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
  let rows;
  try { rows = await db.all('SELECT * FROM [user] ORDER BY orderNo ASC, id ASC'); }
  catch { rows = await db.all('SELECT * FROM [user] ORDER BY id ASC'); }
  res.json(rows.map((r) => ({ id: r.id, name: r.name, mail: r.mail, tel: r.tel, roleId: r.yetkiId, password: r.password, orderNo: r.orderNo ?? 0 })));
}));

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.id, name: row.name, mail: row.mail, tel: row.tel, roleId: row.yetkiId });
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const { name, mail, password, tel, roleId } = req.body;
  const newId = await db.insert(
    'INSERT INTO [user] (name, mail, password, tel, yetkiId) OUTPUT INSERTED.id VALUES (@name, @mail, @password, @tel, @roleId)',
    { name: name ?? '', mail: mail ?? '', password: password ?? '', tel: tel ?? '', roleId: roleId ?? 2 }
  );
  res.json({ id: newId, name, mail, tel, roleId: roleId ?? 2 });
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE [user] SET name = @name, mail = @mail, tel = @tel, yetkiId = @roleId WHERE id = @id',
    { name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.yetkiId, id: Number(req.params.id) }
  );
  res.json({ id: Number(req.params.id), name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.yetkiId });
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
    `INSERT INTO ticket (title, description, firmId, assignedUserId, statusId, priorityId, createdBy, productId)
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
  if (row.statusId !== ticketStatusId) {
    const oldS = await db.get('SELECT name FROM ticketStatus WHERE id = @id', { id: row.statusId });
    const newS = await db.get('SELECT name FROM ticketStatus WHERE id = @id', { id: ticketStatusId });
    changes.push({ field: 'status', oldVal: oldS?.name || null, newVal: newS?.name || null });
  }
  if (row.priorityId !== ticketPriorityId) {
    const oldP = await db.get('SELECT name FROM ticketPriority WHERE id = @id', { id: row.priorityId });
    const newP = await db.get('SELECT name FROM ticketPriority WHERE id = @id', { id: ticketPriorityId });
    changes.push({ field: 'priority', oldVal: oldP?.name || null, newVal: newP?.name || null });
  }
  if ((row.assignedUserId || null) !== (assignedUserId || null)) {
    const oldU = row.assignedUserId ? await db.get('SELECT name FROM [user] WHERE id = @id', { id: row.assignedUserId }) : null;
    const newU = assignedUserId ? await db.get('SELECT name FROM [user] WHERE id = @id', { id: assignedUserId }) : null;
    changes.push({ field: 'assignedUser', oldVal: oldU?.name || null, newVal: newU?.name || null });
  }
  if ((row.firmId || null) !== (firmId || null)) {
    const oldF = row.firmId ? await db.get('SELECT name FROM firm WHERE id = @id', { id: row.firmId }) : null;
    const newF = firmId ? await db.get('SELECT name FROM firm WHERE id = @id', { id: firmId }) : null;
    changes.push({ field: 'firm', oldVal: oldF?.name || null, newVal: newF?.name || null });
  }
  if ((row.productId || null) !== (productId || null)) {
    const oldPr = row.productId ? await db.get('SELECT name FROM product WHERE id = @id', { id: row.productId }) : null;
    const newPr = productId ? await db.get('SELECT name FROM product WHERE id = @id', { id: productId }) : null;
    changes.push({ field: 'product', oldVal: (oldPr?.name || '').trim() || null, newVal: (newPr?.name || '').trim() || null });
  }

  await db.run(
    `UPDATE ticket SET title=@title, description=@description, priorityId=@ticketPriorityId,
     statusId=@ticketStatusId, firmId=@firmId, assignedUserId=@assignedUserId, productId=@productId WHERE id=@id`,
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
      `INSERT INTO eventLog (entityTypeId, eventTypeId, entityId, description, createdBy, createdAt, oldValue, newValue)
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
    `SELECT c.*, u.name AS userName, u.mail AS userMail, u.tel AS userTel, u.yetkiId AS userYetkiId
     FROM ticketComment c LEFT JOIN [user] u ON c.userId = u.id
     WHERE c.ticketId = @ticketId ORDER BY c.createdAt DESC`,
    { ticketId: Number(req.params.id) }
  );
  res.json(rows.map((r) => ({
    id: r.id, ticketId: r.ticketId, userId: r.userId, content: r.content, createdAt: r.createdAt,
    user: r.userName ? { id: r.userId, name: r.userName, mail: r.userMail, tel: r.userTel, roleId: r.userYetkiId } : null,
  })));
}));

app.post('/api/tickets/:id/comments', asyncHandler(async (req, res) => {
  const { content, userId } = req.body;
  const createdAt = now();
  const newId = await db.insert(
    'INSERT INTO ticketComment (ticketId, userId, content, createdAt) OUTPUT INSERTED.id VALUES (@ticketId, @userId, @content, @createdAt)',
    { ticketId: Number(req.params.id), userId, content, createdAt }
  );
  await logEvent(2, 2, Number(req.params.id), 'Comment added', userId);
  const user = await db.get('SELECT * FROM [user] WHERE id = @id', { id: userId });
  res.json({
    id: newId, ticketId: Number(req.params.id), userId, content, createdAt,
    user: user ? { id: user.id, name: user.name, mail: user.mail, tel: user.tel, roleId: user.yetkiId } : null,
  });
}));

// ── Assign ──
app.post('/api/tickets/:id/assign/:userId', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE ticket SET assignedUserId = @userId WHERE id = @id', { userId: Number(req.params.userId), id: Number(req.params.id) });
  await logEvent(2, 3, row.id, `Assigned to user ${req.params.userId}`, Number(req.params.userId));
  const updated = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

// ── Status Change ──
app.post('/api/tickets/:id/status/:statusId', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE ticket SET statusId = @statusId WHERE id = @id', { statusId: Number(req.params.statusId), id: Number(req.params.id) });
  await logEvent(2, 2, row.id, `Status changed to ${req.params.statusId}`, row.assignedUserId);
  const updated = await db.get('SELECT * FROM ticket WHERE id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

// ── Tags on Ticket ──
app.post('/api/tickets/:id/tag/:tagId', asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId ?? 0);
  const ticketId = Number(req.params.id);
  const tagId = Number(req.params.tagId);

  const active = await db.get(
    'SELECT 1 AS x FROM ticketTag WHERE ticketId = @ticketId AND tagId = @tagId AND removedAt IS NULL',
    { ticketId, tagId }
  );
  if (active) return res.status(400).json({ error: 'Tag already exists' });

  // Check if soft-deleted row exists (re-add scenario)
  const softDeleted = await db.get(
    'SELECT 1 AS x FROM ticketTag WHERE ticketId = @ticketId AND tagId = @tagId AND removedAt IS NOT NULL',
    { ticketId, tagId }
  );

  if (softDeleted) {
    await db.run(
      'UPDATE ticketTag SET removedAt = NULL, removedBy = NULL, createdBy = @createdBy, createdAt = @createdAt WHERE ticketId = @ticketId AND tagId = @tagId',
      { ticketId, tagId, createdBy: userId, createdAt: now() }
    );
  } else {
    await db.run(
      'INSERT INTO ticketTag (ticketId, tagId, createdBy, createdAt) VALUES (@ticketId, @tagId, @createdBy, @createdAt)',
      { ticketId, tagId, createdBy: userId, createdAt: now() }
    );
  }

  await logEvent(2, 2, ticketId, `Tag ${tagId} added`, userId);
  res.json({ success: true });
}));

app.delete('/api/tickets/:id/tag/:tagId', asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId ?? 0);
  const tag = await db.get(
    'SELECT * FROM ticketTag WHERE ticketId = @ticketId AND tagId = @tagId AND removedAt IS NULL',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId) }
  );
  if (!tag) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE ticketTag SET removedAt = @removedAt, removedBy = @removedBy WHERE ticketId = @ticketId AND tagId = @tagId',
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
  const manager = row.managerId ? await db.get('SELECT * FROM [user] WHERE id = @id', { id: row.managerId }) : null;
  const fps = await db.all(
    'SELECT fp.*, f.name AS firmName FROM firmProduct fp JOIN firm f ON fp.firmId = f.id WHERE fp.productId = @productId',
    { productId: row.id }
  );
  return {
    id: row.id,
    name: (row.name || '').trim(),
    managerId: row.managerId,
    manager: manager ? { id: manager.id, name: manager.name, mail: manager.mail, tel: manager.tel, roleId: manager.yetkiId } : null,
    firmProducts: fps.map((fp) => ({
      firmId: fp.firmId,
      productId: fp.productId,
      firm: { id: fp.firmId, name: fp.firmName },
    })),
  };
}

app.get('/api/products', asyncHandler(async (_req, res) => {
  let rows;
  try { rows = await db.all('SELECT * FROM product ORDER BY orderNo ASC, id ASC'); }
  catch { rows = await db.all('SELECT * FROM product ORDER BY id ASC'); }
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
      'INSERT INTO product (id, name, managerId) VALUES (@id, @name, @managerId)',
      { id: newId, name: name ?? '', managerId }
    );
  } else {
    newId = await db.insert(
      'INSERT INTO product (name, managerId) VALUES (@name, @managerId)',
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
    'UPDATE product SET name = @name, managerId = @managerId WHERE id = @id',
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
    'SELECT 1 AS x FROM firmProduct WHERE productId = @productId AND firmId = @firmId',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  if (exists) return res.status(400).json({ error: 'Bu firma zaten bu ürüne eklenmiş.' });
  await db.run(
    'INSERT INTO firmProduct (productId, firmId) VALUES (@productId, @firmId)',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  res.json({ success: true });
}));

app.delete('/api/products/:id/firms/:firmId', asyncHandler(async (req, res) => {
  const fp = await db.get(
    'SELECT 1 AS x FROM firmProduct WHERE productId = @productId AND firmId = @firmId',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  if (!fp) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'DELETE FROM firmProduct WHERE productId = @productId AND firmId = @firmId',
    { productId: Number(req.params.id), firmId: Number(req.params.firmId) }
  );
  res.json({ success: true });
}));

// ── Lookup endpoints ──
app.get('/api/ticket-statuses', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticketStatus ORDER BY orderNo');
  res.json(rows.map((r) => ({ id: r.id, name: r.name, isClosed: !!r.isClosed, orderNo: r.orderNo })));
}));

app.get('/api/ticket-priorities', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticketPriority ORDER BY level');
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
    `SELECT c.*, u.name AS userName FROM ticketComment c
     LEFT JOIN [user] u ON c.userId = u.id
     WHERE c.ticketId = @ticketId`,
    { ticketId }
  );

  const tagEvents = await db.all(
    `SELECT el.*, u.name AS userName FROM eventLog el
     LEFT JOIN [user] u ON el.createdBy = u.id
     WHERE el.entityTypeId = 2 AND el.entityId = @ticketId
       AND (el.description LIKE 'Tag % added' OR el.description LIKE 'Tag % removed')`,
    { ticketId }
  );

  const fieldEvents = await db.all(
    `SELECT el.*, u.name AS userName FROM eventLog el
     LEFT JOIN [user] u ON el.createdBy = u.id
     WHERE el.entityTypeId = 2 AND el.entityId = @ticketId
       AND el.description LIKE 'Field:%'`,
    { ticketId }
  );

  const activity = [];

  for (const c of comments) {
    activity.push({
      type: 'comment',
      id: `comment-${c.id}`,
      content: c.content,
      userId: c.userId,
      userName: c.userName,
      createdAt: c.createdAt,
    });
  }

  for (const ev of tagEvents) {
    const match = ev.description.match(/^Tag (\d+) (added|removed)$/);
    if (!match) continue;
    const tagId = Number(match[1]);
    const action = match[2];
    const tag = await db.get('SELECT * FROM tag WHERE id = @id', { id: tagId });
    activity.push({
      type: action === 'added' ? 'tagAdded' : 'tagRemoved',
      id: `tag-${ev.id}`,
      tagId,
      tagName: tag?.name || `Tag #${tagId}`,
      colorHex: tag?.colorHex,
      userId: ev.createdBy,
      userName: ev.userName,
      createdAt: ev.createdAt,
    });
  }

  for (const ev of fieldEvents) {
    const field = ev.description.replace('Field:', '');
    activity.push({
      type: 'fieldChanged',
      id: `field-${ev.id}`,
      field,
      oldValue: ev.oldValue,
      newValue: ev.newValue,
      userId: ev.createdBy,
      userName: ev.userName,
      createdAt: ev.createdAt,
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