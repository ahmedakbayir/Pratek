import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────
// DATABASE SETUP
// ──────────────────────────────────────
const db = new Database(join(__dirname, 'protekh.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS entity_type (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS event_type (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ticket_status (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    IsClosed INTEGER NOT NULL DEFAULT 0,
    OrderNo INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS ticket_priority (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Level INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS yetki (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "user" (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL DEFAULT '',
    Mail TEXT NOT NULL DEFAULT '',
    Password TEXT NOT NULL DEFAULT '',
    Tel TEXT NOT NULL DEFAULT '',
    RoleId INTEGER NOT NULL DEFAULT 2
  );
  CREATE TABLE IF NOT EXISTS firm (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tag (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    ColorHex TEXT
  );
  CREATE TABLE IF NOT EXISTS ticket (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Title TEXT NOT NULL,
    Description TEXT,
    FirmId INTEGER REFERENCES firm(Id) ON DELETE SET NULL,
    AssignedUserId INTEGER REFERENCES "user"(Id) ON DELETE SET NULL,
    TicketStatusId INTEGER NOT NULL REFERENCES ticket_status(Id),
    TicketPriorityId INTEGER NOT NULL REFERENCES ticket_priority(Id),
    CreatedAt TEXT NOT NULL,
    CreatedBy INTEGER,
    UpdatedAt TEXT,
    UpdatedBy INTEGER
  );
  CREATE TABLE IF NOT EXISTS ticket_tag (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TicketId INTEGER NOT NULL REFERENCES ticket(Id) ON DELETE CASCADE,
    TagId INTEGER NOT NULL REFERENCES tag(Id) ON DELETE CASCADE,
    CreatedBy INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ticket_comment (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TicketId INTEGER NOT NULL REFERENCES ticket(Id) ON DELETE CASCADE,
    UserId INTEGER NOT NULL REFERENCES "user"(Id),
    Content TEXT NOT NULL DEFAULT '',
    CreatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS event_log (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    EntityTypeId INTEGER NOT NULL REFERENCES entity_type(Id),
    EventTypeId INTEGER NOT NULL REFERENCES event_type(Id),
    EntityId INTEGER NOT NULL,
    Description TEXT,
    UserId INTEGER,
    CreatedAt TEXT NOT NULL
  );
`);

// ──────────────────────────────────────
// SEED LOOKUP DATA
// ──────────────────────────────────────
function seedIfEmpty(table, rows) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  if (count === 0) {
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
    for (const row of rows) {
      stmt.run(...cols.map(c => row[c]));
    }
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
  { Id: 1, Name: 'User' },
  { Id: 2, Name: 'Ticket' },
  { Id: 3, Name: 'Firm' },
  { Id: 4, Name: 'Tag' },
]);

seedIfEmpty('event_type', [
  { Id: 1, Name: 'Created' },
  { Id: 2, Name: 'Updated' },
  { Id: 3, Name: 'Assigned' },
  { Id: 4, Name: 'Deleted' },
]);

seedIfEmpty('yetki', [
  { Id: 1, Name: 'Admin' },
  { Id: 2, Name: 'Agent' },
  { Id: 3, Name: 'Müşteri' },
]);

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────
function now() {
  return new Date().toISOString();
}

function logEvent(entityTypeId, eventTypeId, entityId, description, userId) {
  db.prepare(
    `INSERT INTO event_log (EntityTypeId, EventTypeId, EntityId, Description, UserId, CreatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(entityTypeId, eventTypeId, entityId, description, userId ?? null, now());
}

// Convert SQLite row to camelCase-like format matching ASP.NET Core JSON output
function toTicketJson(row) {
  if (!row) return null;
  const firm = row.FirmId ? db.prepare('SELECT * FROM firm WHERE Id = ?').get(row.FirmId) : null;
  const user = row.AssignedUserId ? db.prepare('SELECT * FROM "user" WHERE Id = ?').get(row.AssignedUserId) : null;
  const status = db.prepare('SELECT * FROM ticket_status WHERE Id = ?').get(row.TicketStatusId);
  const priority = db.prepare('SELECT * FROM ticket_priority WHERE Id = ?').get(row.TicketPriorityId);
  const tags = db.prepare(
    `SELECT tt.*, t.Name, t.Description as TagDescription, t.ColorHex
     FROM ticket_tag tt JOIN tag t ON tt.TagId = t.Id WHERE tt.TicketId = ?`
  ).all(row.Id);

  return {
    id: row.Id,
    title: row.Title,
    description: row.Description,
    firmId: row.FirmId,
    assignedUserId: row.AssignedUserId,
    ticketStatusId: row.TicketStatusId,
    ticketPriorityId: row.TicketPriorityId,
    createdAt: row.CreatedAt,
    createdBy: row.CreatedBy,
    updatedAt: row.UpdatedAt,
    updatedBy: row.UpdatedBy,
    firm: firm ? { id: firm.Id, name: firm.Name } : null,
    assignedUser: user ? { id: user.Id, name: user.Name, mail: user.Mail, tel: user.Tel, roleId: user.RoleId } : null,
    status: status ? { id: status.Id, name: status.Name, isClosed: !!status.IsClosed, orderNo: status.OrderNo } : null,
    priority: priority ? { id: priority.Id, name: priority.Name, level: priority.Level } : null,
    ticketTags: tags.map(tt => ({
      id: tt.Id,
      ticketId: tt.TicketId,
      tagId: tt.TagId,
      createdBy: tt.CreatedBy,
      createdAt: tt.CreatedAt,
      tag: { id: tt.TagId, name: tt.Name, description: tt.TagDescription, colorHex: tt.ColorHex },
    })),
  };
}

// ══════════════════════════════════════
// FIRMS
// ══════════════════════════════════════
app.get('/api/firms', (_req, res) => {
  const rows = db.prepare('SELECT * FROM firm').all();
  res.json(rows.map(r => ({ id: r.Id, name: r.Name })));
});

app.get('/api/firms/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM firm WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name });
});

app.post('/api/firms', (req, res) => {
  const { name } = req.body;
  const result = db.prepare('INSERT INTO firm (Name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

app.put('/api/firms/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM firm WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE firm SET Name = ? WHERE Id = ?').run(req.body.name, req.params.id);
  res.json({ id: row.Id, name: req.body.name });
});

app.delete('/api/firms/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM firm WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM firm WHERE Id = ?').run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════
// TAGS
// ══════════════════════════════════════
app.get('/api/tags', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tag').all();
  res.json(rows.map(r => ({ id: r.Id, name: r.Name, description: r.Description, colorHex: r.ColorHex })));
});

app.get('/api/tags/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tag WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name, description: row.Description, colorHex: row.ColorHex });
});

app.post('/api/tags', (req, res) => {
  const { name, description, colorHex } = req.body;
  const result = db.prepare('INSERT INTO tag (Name, Description, ColorHex) VALUES (?, ?, ?)').run(name, description ?? null, colorHex ?? null);
  res.json({ id: result.lastInsertRowid, name, description: description ?? null, colorHex: colorHex ?? null });
});

app.put('/api/tags/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tag WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE tag SET Name = ?, Description = ?, ColorHex = ? WHERE Id = ?')
    .run(req.body.name, req.body.description ?? null, req.body.colorHex ?? null, req.params.id);
  res.json({ id: row.Id, name: req.body.name, description: req.body.description ?? null, colorHex: req.body.colorHex ?? null });
});

app.delete('/api/tags/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tag WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM tag WHERE Id = ?').run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════
app.get('/api/users', (_req, res) => {
  const rows = db.prepare('SELECT * FROM "user"').all();
  res.json(rows.map(r => ({ id: r.Id, name: r.Name, mail: r.Mail, tel: r.Tel, roleId: r.RoleId, password: r.Password })));
});

app.get('/api/users/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM "user" WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name, mail: row.Mail, tel: row.Tel, roleId: row.RoleId });
});

app.post('/api/users', (req, res) => {
  const { name, mail, password, tel, roleId } = req.body;
  const result = db.prepare('INSERT INTO "user" (Name, Mail, Password, Tel, RoleId) VALUES (?, ?, ?, ?, ?)')
    .run(name ?? '', mail ?? '', password ?? '', tel ?? '', roleId ?? 2);
  res.json({ id: result.lastInsertRowid, name, mail, tel, roleId: roleId ?? 2 });
});

app.put('/api/users/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM "user" WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE "user" SET Name = ?, Mail = ?, Tel = ?, RoleId = ? WHERE Id = ?')
    .run(req.body.name, req.body.mail, req.body.tel ?? '', req.body.roleId ?? row.RoleId, req.params.id);
  res.json({ id: row.Id, name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.RoleId });
});

app.delete('/api/users/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM "user" WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM "user" WHERE Id = ?').run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════
// TICKETS
// ══════════════════════════════════════
app.get('/api/tickets', (_req, res) => {
  const rows = db.prepare('SELECT * FROM ticket ORDER BY CreatedAt DESC').all();
  res.json(rows.map(toTicketJson));
});

app.get('/api/tickets/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(toTicketJson(row));
});

app.post('/api/tickets', (req, res) => {
  const { title, description, firmId, assignedUserId, ticketStatusId, ticketPriorityId, createdBy } = req.body;
  const createdAt = now();
  const result = db.prepare(
    `INSERT INTO ticket (Title, Description, FirmId, AssignedUserId, TicketStatusId, TicketPriorityId, CreatedAt, CreatedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(title, description ?? null, firmId ?? null, assignedUserId ?? null, ticketStatusId ?? 1, ticketPriorityId ?? 3, createdAt, createdBy ?? null);

  logEvent(2, 1, result.lastInsertRowid, `Ticket created: ${title}`, createdBy);

  const created = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(result.lastInsertRowid);
  res.json(toTicketJson(created));
});

app.put('/api/tickets/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { title, description, ticketPriorityId, ticketStatusId, firmId, assignedUserId, updatedBy } = req.body;
  db.prepare(
    `UPDATE ticket SET Title=?, Description=?, TicketPriorityId=?, TicketStatusId=?, FirmId=?, AssignedUserId=?, UpdatedAt=?, UpdatedBy=?
     WHERE Id=?`
  ).run(title, description ?? null, ticketPriorityId, ticketStatusId, firmId ?? null, assignedUserId ?? null, now(), updatedBy ?? null, req.params.id);

  logEvent(2, 2, row.Id, `Ticket updated: ${title}`, updatedBy);

  const updated = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  res.json(toTicketJson(updated));
});

app.delete('/api/tickets/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM ticket WHERE Id = ?').run(req.params.id);
  logEvent(2, 4, row.Id, 'Ticket deleted', null);
  res.json({ success: true });
});

// ── Ticket Comments ──
app.get('/api/tickets/:id/comments', (req, res) => {
  const rows = db.prepare(
    `SELECT c.*, u.Name as UserName, u.Mail as UserMail, u.Tel as UserTel, u.RoleId as UserRoleId
     FROM ticket_comment c LEFT JOIN "user" u ON c.UserId = u.Id
     WHERE c.TicketId = ? ORDER BY c.CreatedAt DESC`
  ).all(req.params.id);
  res.json(rows.map(r => ({
    id: r.Id, ticketId: r.TicketId, userId: r.UserId, content: r.Content, createdAt: r.CreatedAt,
    user: r.UserName ? { id: r.UserId, name: r.UserName, mail: r.UserMail, tel: r.UserTel, roleId: r.UserRoleId } : null,
  })));
});

app.post('/api/tickets/:id/comments', (req, res) => {
  const { content, userId } = req.body;
  const createdAt = now();
  const result = db.prepare('INSERT INTO ticket_comment (TicketId, UserId, Content, CreatedAt) VALUES (?, ?, ?, ?)')
    .run(req.params.id, userId, content, createdAt);
  logEvent(2, 2, Number(req.params.id), 'Comment added', userId);

  const user = db.prepare('SELECT * FROM "user" WHERE Id = ?').get(userId);
  res.json({
    id: result.lastInsertRowid, ticketId: Number(req.params.id), userId, content, createdAt,
    user: user ? { id: user.Id, name: user.Name, mail: user.Mail, tel: user.Tel, roleId: user.RoleId } : null,
  });
});

// ── Assign ──
app.post('/api/tickets/:id/assign/:userId', (req, res) => {
  const row = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE ticket SET AssignedUserId = ? WHERE Id = ?').run(req.params.userId, req.params.id);
  logEvent(2, 3, row.Id, `Assigned to user ${req.params.userId}`, Number(req.params.userId));
  const updated = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  res.json(toTicketJson(updated));
});

// ── Status Change ──
app.post('/api/tickets/:id/status/:statusId', (req, res) => {
  const row = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE ticket SET TicketStatusId = ? WHERE Id = ?').run(req.params.statusId, req.params.id);
  logEvent(2, 2, row.Id, `Status changed to ${req.params.statusId}`, row.AssignedUserId);
  const updated = db.prepare('SELECT * FROM ticket WHERE Id = ?').get(req.params.id);
  res.json(toTicketJson(updated));
});

// ── Tags on Ticket ──
app.post('/api/tickets/:id/tag/:tagId', (req, res) => {
  const userId = req.query.userId ?? 0;
  const exists = db.prepare('SELECT 1 FROM ticket_tag WHERE TicketId = ? AND TagId = ?').get(req.params.id, req.params.tagId);
  if (exists) return res.status(400).json({ error: 'Tag already exists' });
  db.prepare('INSERT INTO ticket_tag (TicketId, TagId, CreatedBy, CreatedAt) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.params.tagId, userId, now());
  logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} added`, Number(userId));
  res.json({ success: true });
});

app.delete('/api/tickets/:id/tag/:tagId', (req, res) => {
  const userId = req.query.userId ?? 0;
  const tag = db.prepare('SELECT * FROM ticket_tag WHERE TicketId = ? AND TagId = ?').get(req.params.id, req.params.tagId);
  if (!tag) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM ticket_tag WHERE TicketId = ? AND TagId = ?').run(req.params.id, req.params.tagId);
  logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} removed`, Number(userId));
  res.json({ success: true });
});

// ──────────────────────────────────────
// START
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API server running → http://localhost:${PORT}`);
});
