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
// DATABASE ADAPTER
// ──────────────────────────────────────
// Queries use SQL Server @param syntax everywhere.
// SQLite adapter converts @param → $param and strips OUTPUT INSERTED.Id.

function createSqlServerAdapter(pool) {
  return {
    type: 'sqlserver',
    all: async (query, params = {}) => {
      const req = pool.request();
      for (const [k, v] of Object.entries(params)) req.input(k, v);
      return (await req.query(query)).recordset;
    },
    get: async (query, params = {}) => {
      const req = pool.request();
      for (const [k, v] of Object.entries(params)) req.input(k, v);
      return (await req.query(query)).recordset[0] || null;
    },
    insert: async (query, params = {}) => {
      const req = pool.request();
      for (const [k, v] of Object.entries(params)) req.input(k, v);
      const result = await req.query(query);
      return result.recordset[0]?.Id;
    },
    run: async (query, params = {}) => {
      const req = pool.request();
      for (const [k, v] of Object.entries(params)) req.input(k, v);
      await req.query(query);
    },
  };
}

function createSqliteAdapter(sqliteDb) {
  const toSqlite = (query) => query.replace(/@(\w+)/g, '$$$1');
  const toParams = (params) => {
    const out = {};
    for (const [k, v] of Object.entries(params)) out[`$${k}`] = v instanceof Date ? v.toISOString() : v;
    return out;
  };
  const stripOutput = (query) => query.replace(/\s*OUTPUT\s+INSERTED\.Id\s*/i, ' ');

  return {
    type: 'sqlite',
    all: async (query, params = {}) => sqliteDb.prepare(toSqlite(query)).all(toParams(params)),
    get: async (query, params = {}) => sqliteDb.prepare(toSqlite(query)).get(toParams(params)) || null,
    insert: async (query, params = {}) => {
      const result = sqliteDb.prepare(toSqlite(stripOutput(query))).run(toParams(params));
      return Number(result.lastInsertRowid);
    },
    run: async (query, params = {}) => { sqliteDb.prepare(toSqlite(query)).run(toParams(params)); },
  };
}

// ──────────────────────────────────────
// CONNECT: SQL Server first, SQLite fallback
// ──────────────────────────────────────
let db;

try {
  const { default: sql } = await import('mssql/msnodesqlv8.js');
  const pool = new sql.ConnectionPool({
    connectionString: 'Server=(localdb)\\MSSQLLocalDB;Database=protekh_db;Trusted_Connection=Yes;',
  });
  await pool.connect();
  db = createSqlServerAdapter(pool);
  console.log('════════════════════════════════════════════════════');
  console.log('[DB] SQL Server (localdb)\\MSSQLLocalDB → protekh_db');
  console.log('════════════════════════════════════════════════════');
} catch (err) {
  console.warn(`[DB] SQL Server kullanılamıyor: ${err.message}`);
  console.log('[DB] SQLite fallback\'a geçiliyor...');

  const Database = (await import('better-sqlite3')).default;
  const dbPath = join(__dirname, 'protekh.db');
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  // Create tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS entity_type (Id INTEGER PRIMARY KEY, Name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_type (Id INTEGER PRIMARY KEY, Name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ticket_status (Id INTEGER PRIMARY KEY, Name TEXT NOT NULL, IsClosed INTEGER NOT NULL DEFAULT 0, OrderNo INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS ticket_priority (Id INTEGER PRIMARY KEY, Name TEXT NOT NULL, Level INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS yetki (Id INTEGER PRIMARY KEY, Name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS [user] (Id INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT NOT NULL DEFAULT '', Mail TEXT NOT NULL DEFAULT '', Password TEXT NOT NULL DEFAULT '', Tel TEXT NOT NULL DEFAULT '', RoleId INTEGER NOT NULL DEFAULT 2);
    CREATE TABLE IF NOT EXISTS firm (Id INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tag (Id INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT NOT NULL, Description TEXT, ColorHex TEXT);
    CREATE TABLE IF NOT EXISTS ticket (Id INTEGER PRIMARY KEY AUTOINCREMENT, Title TEXT NOT NULL, Description TEXT, FirmId INTEGER REFERENCES firm(Id) ON DELETE SET NULL, AssignedUserId INTEGER REFERENCES [user](Id) ON DELETE SET NULL, TicketStatusId INTEGER NOT NULL REFERENCES ticket_status(Id), TicketPriorityId INTEGER NOT NULL REFERENCES ticket_priority(Id), CreatedAt TEXT NOT NULL, CreatedBy INTEGER, UpdatedAt TEXT, UpdatedBy INTEGER);
    CREATE TABLE IF NOT EXISTS ticket_tag (Id INTEGER PRIMARY KEY AUTOINCREMENT, TicketId INTEGER NOT NULL REFERENCES ticket(Id) ON DELETE CASCADE, TagId INTEGER NOT NULL REFERENCES tag(Id) ON DELETE CASCADE, CreatedBy INTEGER NOT NULL DEFAULT 0, CreatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ticket_comment (Id INTEGER PRIMARY KEY AUTOINCREMENT, TicketId INTEGER NOT NULL REFERENCES ticket(Id) ON DELETE CASCADE, UserId INTEGER NOT NULL REFERENCES [user](Id), Content TEXT NOT NULL DEFAULT '', CreatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_log (Id INTEGER PRIMARY KEY AUTOINCREMENT, EntityTypeId INTEGER NOT NULL REFERENCES entity_type(Id), EventTypeId INTEGER NOT NULL REFERENCES event_type(Id), EntityId INTEGER NOT NULL, Description TEXT, UserId INTEGER, CreatedAt TEXT NOT NULL);
  `);

  // Seed lookup data
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
    { Id: 1, Name: 'Açık', IsClosed: 0, OrderNo: 1 },
    { Id: 2, Name: 'Devam Ediyor', IsClosed: 0, OrderNo: 2 },
    { Id: 3, Name: 'Çözümlendi', IsClosed: 1, OrderNo: 3 },
    { Id: 4, Name: 'Kapalı', IsClosed: 1, OrderNo: 4 },
  ]);
  seedIfEmpty('ticket_priority', [
    { Id: 1, Name: 'Kritik', Level: 1 },
    { Id: 2, Name: 'Yüksek', Level: 2 },
    { Id: 3, Name: 'Normal', Level: 3 },
    { Id: 4, Name: 'Düşük', Level: 4 },
  ]);
  seedIfEmpty('entity_type', [
    { Id: 1, Name: 'User' }, { Id: 2, Name: 'Ticket' }, { Id: 3, Name: 'Firm' }, { Id: 4, Name: 'Tag' },
  ]);
  seedIfEmpty('event_type', [
    { Id: 1, Name: 'Created' }, { Id: 2, Name: 'Updated' }, { Id: 3, Name: 'Assigned' }, { Id: 4, Name: 'Deleted' },
  ]);
  seedIfEmpty('yetki', [
    { Id: 1, Name: 'Admin' }, { Id: 2, Name: 'Agent' }, { Id: 3, Name: 'Müşteri' },
  ]);

  db = createSqliteAdapter(sqliteDb);
  console.log('════════════════════════════════════════════════════');
  console.log(`[DB] SQLite → ${dbPath}`);
  console.log('════════════════════════════════════════════════════');
}

// ──────────────────────────────────────
// ASYNC ERROR WRAPPER
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
    `INSERT INTO event_log (EntityTypeId, EventTypeId, EntityId, Description, UserId, CreatedAt)
     VALUES (@entityTypeId, @eventTypeId, @entityId, @description, @userId, @createdAt)`,
    { entityTypeId, eventTypeId, entityId, description, userId: userId ?? null, createdAt: now() }
  );
}

async function toTicketJson(row) {
  if (!row) return null;
  const firm = row.FirmId ? await db.get('SELECT * FROM firm WHERE Id = @id', { id: row.FirmId }) : null;
  const user = row.AssignedUserId ? await db.get('SELECT * FROM [user] WHERE Id = @id', { id: row.AssignedUserId }) : null;
  const status = await db.get('SELECT * FROM ticket_status WHERE Id = @id', { id: row.TicketStatusId });
  const priority = await db.get('SELECT * FROM ticket_priority WHERE Id = @id', { id: row.TicketPriorityId });
  const tags = await db.all(
    `SELECT tt.*, t.Name, t.Description AS TagDescription, t.ColorHex
     FROM ticket_tag tt JOIN tag t ON tt.TagId = t.Id WHERE tt.TicketId = @ticketId`,
    { ticketId: row.Id }
  );

  return {
    id: row.Id, title: row.Title, description: row.Description,
    firmId: row.FirmId, assignedUserId: row.AssignedUserId,
    ticketStatusId: row.TicketStatusId, ticketPriorityId: row.TicketPriorityId,
    createdAt: row.CreatedAt, createdBy: row.CreatedBy,
    updatedAt: row.UpdatedAt, updatedBy: row.UpdatedBy,
    firm: firm ? { id: firm.Id, name: firm.Name } : null,
    assignedUser: user ? { id: user.Id, name: user.Name, mail: user.Mail, tel: user.Tel, roleId: user.RoleId } : null,
    status: status ? { id: status.Id, name: status.Name, isClosed: !!status.IsClosed, orderNo: status.OrderNo } : null,
    priority: priority ? { id: priority.Id, name: priority.Name, level: priority.Level } : null,
    ticketTags: tags.map((tt) => ({
      id: tt.Id, ticketId: tt.TicketId, tagId: tt.TagId, createdBy: tt.CreatedBy, createdAt: tt.CreatedAt,
      tag: { id: tt.TagId, name: tt.Name, description: tt.TagDescription, colorHex: tt.ColorHex },
    })),
  };
}

// ══════════════════════════════════════
// FIRMS
// ══════════════════════════════════════
app.get('/api/firms', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM firm');
  res.json(rows.map((r) => ({ id: r.Id, name: r.Name })));
}));

app.get('/api/firms/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM firm WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name });
}));

app.post('/api/firms', asyncHandler(async (req, res) => {
  const { name } = req.body;
  const newId = await db.insert('INSERT INTO firm (Name) OUTPUT INSERTED.Id VALUES (@name)', { name });
  res.json({ id: newId, name });
}));

app.put('/api/firms/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM firm WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE firm SET Name = @name WHERE Id = @id', { name: req.body.name, id: Number(req.params.id) });
  res.json({ id: Number(req.params.id), name: req.body.name });
}));

app.delete('/api/firms/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM firm WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM firm WHERE Id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ══════════════════════════════════════
// TAGS
// ══════════════════════════════════════
app.get('/api/tags', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM tag');
  res.json(rows.map((r) => ({ id: r.Id, name: r.Name, description: r.Description, colorHex: r.ColorHex })));
}));

app.get('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name, description: row.Description, colorHex: row.ColorHex });
}));

app.post('/api/tags', asyncHandler(async (req, res) => {
  const { name, description, colorHex } = req.body;
  const newId = await db.insert(
    'INSERT INTO tag (Name, Description, ColorHex) OUTPUT INSERTED.Id VALUES (@name, @description, @colorHex)',
    { name, description: description ?? null, colorHex: colorHex ?? null }
  );
  res.json({ id: newId, name, description: description ?? null, colorHex: colorHex ?? null });
}));

app.put('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE tag SET Name = @name, Description = @description, ColorHex = @colorHex WHERE Id = @id',
    { name: req.body.name, description: req.body.description ?? null, colorHex: req.body.colorHex ?? null, id: Number(req.params.id) }
  );
  res.json({ id: Number(req.params.id), name: req.body.name, description: req.body.description ?? null, colorHex: req.body.colorHex ?? null });
}));

app.delete('/api/tags/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM tag WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM tag WHERE Id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════
app.get('/api/users', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM [user]');
  res.json(rows.map((r) => ({ id: r.Id, name: r.Name, mail: r.Mail, tel: r.Tel, roleId: r.RoleId, password: r.Password })));
}));

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name, mail: row.Mail, tel: row.Tel, roleId: row.RoleId });
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const { name, mail, password, tel, roleId } = req.body;
  const newId = await db.insert(
    'INSERT INTO [user] (Name, Mail, Password, Tel, RoleId) OUTPUT INSERTED.Id VALUES (@name, @mail, @password, @tel, @roleId)',
    { name: name ?? '', mail: mail ?? '', password: password ?? '', tel: tel ?? '', roleId: roleId ?? 2 }
  );
  res.json({ id: newId, name, mail, tel, roleId: roleId ?? 2 });
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'UPDATE [user] SET Name = @name, Mail = @mail, Tel = @tel, RoleId = @roleId WHERE Id = @id',
    { name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.RoleId, id: Number(req.params.id) }
  );
  res.json({ id: Number(req.params.id), name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.RoleId });
}));

app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM [user] WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM [user] WHERE Id = @id', { id: Number(req.params.id) });
  res.json({ success: true });
}));

// ══════════════════════════════════════
// TICKETS
// ══════════════════════════════════════
app.get('/api/tickets', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticket ORDER BY CreatedAt DESC');
  const tickets = await Promise.all(rows.map(toTicketJson));
  res.json(tickets);
}));

app.get('/api/tickets/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(await toTicketJson(row));
}));

app.post('/api/tickets', asyncHandler(async (req, res) => {
  const { title, description, firmId, assignedUserId, ticketStatusId, ticketPriorityId, createdBy } = req.body;
  const newId = await db.insert(
    `INSERT INTO ticket (Title, Description, FirmId, AssignedUserId, TicketStatusId, TicketPriorityId, CreatedAt, CreatedBy)
     OUTPUT INSERTED.Id
     VALUES (@title, @description, @firmId, @assignedUserId, @ticketStatusId, @ticketPriorityId, @createdAt, @createdBy)`,
    {
      title, description: description ?? null,
      firmId: firmId ?? null, assignedUserId: assignedUserId ?? null,
      ticketStatusId: ticketStatusId ?? 1, ticketPriorityId: ticketPriorityId ?? 3,
      createdAt: now(), createdBy: createdBy ?? null,
    }
  );
  await logEvent(2, 1, newId, `Ticket created: ${title}`, createdBy);
  const created = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: newId });
  res.json(await toTicketJson(created));
}));

app.put('/api/tickets/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { title, description, ticketPriorityId, ticketStatusId, firmId, assignedUserId, updatedBy } = req.body;
  await db.run(
    `UPDATE ticket SET Title=@title, Description=@description, TicketPriorityId=@ticketPriorityId,
     TicketStatusId=@ticketStatusId, FirmId=@firmId, AssignedUserId=@assignedUserId,
     UpdatedAt=@updatedAt, UpdatedBy=@updatedBy WHERE Id=@id`,
    {
      title, description: description ?? null,
      ticketPriorityId, ticketStatusId,
      firmId: firmId ?? null, assignedUserId: assignedUserId ?? null,
      updatedAt: now(), updatedBy: updatedBy ?? null, id: Number(req.params.id),
    }
  );
  await logEvent(2, 2, row.Id, `Ticket updated: ${title}`, updatedBy);
  const updated = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

app.delete('/api/tickets/:id', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  await logEvent(2, 4, row.Id, 'Ticket deleted', null);
  res.json({ success: true });
}));

// ── Ticket Comments ──
app.get('/api/tickets/:id/comments', asyncHandler(async (req, res) => {
  const rows = await db.all(
    `SELECT c.*, u.Name AS UserName, u.Mail AS UserMail, u.Tel AS UserTel, u.RoleId AS UserRoleId
     FROM ticket_comment c LEFT JOIN [user] u ON c.UserId = u.Id
     WHERE c.TicketId = @ticketId ORDER BY c.CreatedAt DESC`,
    { ticketId: Number(req.params.id) }
  );
  res.json(rows.map((r) => ({
    id: r.Id, ticketId: r.TicketId, userId: r.UserId, content: r.Content, createdAt: r.CreatedAt,
    user: r.UserName ? { id: r.UserId, name: r.UserName, mail: r.UserMail, tel: r.UserTel, roleId: r.UserRoleId } : null,
  })));
}));

app.post('/api/tickets/:id/comments', asyncHandler(async (req, res) => {
  const { content, userId } = req.body;
  const createdAt = now();
  const newId = await db.insert(
    'INSERT INTO ticket_comment (TicketId, UserId, Content, CreatedAt) OUTPUT INSERTED.Id VALUES (@ticketId, @userId, @content, @createdAt)',
    { ticketId: Number(req.params.id), userId, content, createdAt }
  );
  await logEvent(2, 2, Number(req.params.id), 'Comment added', userId);
  const user = await db.get('SELECT * FROM [user] WHERE Id = @id', { id: userId });
  res.json({
    id: newId, ticketId: Number(req.params.id), userId, content, createdAt,
    user: user ? { id: user.Id, name: user.Name, mail: user.Mail, tel: user.Tel, roleId: user.RoleId } : null,
  });
}));

// ── Assign ──
app.post('/api/tickets/:id/assign/:userId', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE ticket SET AssignedUserId = @userId WHERE Id = @id', { userId: Number(req.params.userId), id: Number(req.params.id) });
  await logEvent(2, 3, row.Id, `Assigned to user ${req.params.userId}`, Number(req.params.userId));
  const updated = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

// ── Status Change ──
app.post('/api/tickets/:id/status/:statusId', asyncHandler(async (req, res) => {
  const row = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await db.run('UPDATE ticket SET TicketStatusId = @statusId WHERE Id = @id', { statusId: Number(req.params.statusId), id: Number(req.params.id) });
  await logEvent(2, 2, row.Id, `Status changed to ${req.params.statusId}`, row.AssignedUserId);
  const updated = await db.get('SELECT * FROM ticket WHERE Id = @id', { id: Number(req.params.id) });
  res.json(await toTicketJson(updated));
}));

// ── Tags on Ticket ──
app.post('/api/tickets/:id/tag/:tagId', asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId ?? 0);
  const exists = await db.get(
    'SELECT 1 AS x FROM ticket_tag WHERE TicketId = @ticketId AND TagId = @tagId',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId) }
  );
  if (exists) return res.status(400).json({ error: 'Tag already exists' });
  await db.run(
    'INSERT INTO ticket_tag (TicketId, TagId, CreatedBy, CreatedAt) VALUES (@ticketId, @tagId, @createdBy, @createdAt)',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId), createdBy: userId, createdAt: now() }
  );
  await logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} added`, userId);
  res.json({ success: true });
}));

app.delete('/api/tickets/:id/tag/:tagId', asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId ?? 0);
  const tag = await db.get(
    'SELECT * FROM ticket_tag WHERE TicketId = @ticketId AND TagId = @tagId',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId) }
  );
  if (!tag) return res.status(404).json({ error: 'Not found' });
  await db.run(
    'DELETE FROM ticket_tag WHERE TicketId = @ticketId AND TagId = @tagId',
    { ticketId: Number(req.params.id), tagId: Number(req.params.tagId) }
  );
  await logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} removed`, userId);
  res.json({ success: true });
}));

// ── Lookup endpoints ──
app.get('/api/ticket-statuses', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticket_status ORDER BY OrderNo');
  res.json(rows.map((r) => ({ id: r.Id, name: r.Name, isClosed: !!r.IsClosed, orderNo: r.OrderNo })));
}));

app.get('/api/ticket-priorities', asyncHandler(async (_req, res) => {
  const rows = await db.all('SELECT * FROM ticket_priority ORDER BY Level');
  res.json(rows.map((r) => ({ id: r.Id, name: r.Name, level: r.Level })));
}));

// ──────────────────────────────────────
// START
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API server running → http://localhost:${PORT}`);
});
