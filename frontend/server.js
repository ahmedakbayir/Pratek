import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, createWriteStream } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. VERİTABANI BAĞLANTISI (Ortak Ana Dizinde)
const dbPath = join(__dirname, '..', 'pratek.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('════════════════════════════════════════════════════');
console.log(`[PRATEK] Veritabanı Aktif → ${dbPath}`);
console.log('════════════════════════════════════════════════════');

// 2. TABLOLARIN OLUŞTURULMASI
db.exec(`
  CREATE TABLE IF NOT EXISTS "Entity" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT);
  CREATE TABLE IF NOT EXISTS "EntityEventType" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT);
  CREATE TABLE IF NOT EXISTS "TicketEventType" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT);
  CREATE TABLE IF NOT EXISTS "TicketStatus" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "IsClosed" INTEGER, "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "TicketPriority" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "Privilege" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "Firm" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "OrderNo" INTEGER, "ParentId" INTEGER REFERENCES "Firm"("Id"), "Version" INTEGER);
  CREATE TABLE IF NOT EXISTS "Label" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "Description" TEXT, "ColorHex" TEXT);
  CREATE TABLE IF NOT EXISTS "User" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "Mail" TEXT, "Password" TEXT, "Gsm" TEXT, "FirmId" INTEGER REFERENCES "Firm"("Id"), "PrivilegeId" INTEGER REFERENCES "Privilege"("Id"), "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "Product" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "ManagerId" INTEGER REFERENCES "User"("Id"), "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "Ticket" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Title" TEXT, "Content" TEXT, "DueDate" TEXT, "AssignedUserId" INTEGER REFERENCES "User"("Id"), "CreatedUserId" INTEGER REFERENCES "User"("Id"), "FirmId" INTEGER REFERENCES "Firm"("Id"), "PriorityId" INTEGER REFERENCES "TicketPriority"("Id"), "ProductId" INTEGER REFERENCES "Product"("Id"), "StatusId" INTEGER REFERENCES "TicketStatus"("Id"));
  CREATE TABLE IF NOT EXISTS "TicketLabelHistory" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "ActionType" INTEGER, "ActionDate" TEXT, "LabelId" INTEGER NOT NULL REFERENCES "Label"("Id"), "TicketId" INTEGER NOT NULL REFERENCES "Ticket"("Id"), "UserId" INTEGER REFERENCES "User"("Id"));
  CREATE TABLE IF NOT EXISTS "TicketComments" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "TicketId" INTEGER NOT NULL REFERENCES "Ticket"("Id") ON DELETE CASCADE, "UserId" INTEGER NOT NULL REFERENCES "User"("Id"), "Content" TEXT, "ActionDate" TEXT, "Inactive" INTEGER);
  CREATE TABLE IF NOT EXISTS "EntityEventHistory" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "ActionDate" TEXT, "EntityEventTypeId" INTEGER NOT NULL REFERENCES "EntityEventType"("Id"), "EntityId" INTEGER NOT NULL, "UserId" INTEGER REFERENCES "User"("Id"), "Description" TEXT);
  CREATE TABLE IF NOT EXISTS "TicketEventHistory" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "ActionDate" TEXT, "TicketEventTypeId" INTEGER NOT NULL REFERENCES "TicketEventType"("Id"), "TicketId" INTEGER NOT NULL REFERENCES "Ticket"("Id"), "UserId" INTEGER REFERENCES "User"("Id"), "Description" TEXT, "NewValue" TEXT, "OldValue" TEXT);
  CREATE TABLE IF NOT EXISTS "Firm_Product" ("FirmId" INTEGER NOT NULL REFERENCES "Firm"("Id") ON DELETE CASCADE, "ProductId" INTEGER NOT NULL REFERENCES "Product"("Id") ON DELETE CASCADE, PRIMARY KEY("FirmId", "ProductId"));
`);

// --- SCHEMA MIGRATIONS (add missing columns) ---
const safeAddColumn = (table, column, type) => {
  try { db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`); }
  catch { /* column already exists */ }
};
safeAddColumn('Ticket', 'Scope', 'TEXT');
safeAddColumn('TicketPriority', 'ColorHex', 'TEXT');
safeAddColumn('TicketStatus', 'ColorHex', 'TEXT');
safeAddColumn('Privilege', 'ColorHex', 'TEXT');
safeAddColumn('Firm', 'Version', 'INTEGER');

// --- Uploads directory ---
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// 3. VERİ FORMATLAYICI (PascalCase'i React için camelCase yapar)
const toCamel = (obj) => {
  if (!obj) return obj;
  const newObj = {};
  for (const key of Object.keys(obj)) {
    newObj[key.charAt(0).toLowerCase() + key.slice(1)] = obj[key];
  }
  return newObj;
};

// Global error handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

// 4. API ROUTE'LARI
// --- FIRMALAR ---
app.get('/api/firms', (req, res) => {
  const firms = db.prepare('SELECT * FROM "Firm" ORDER BY "OrderNo"').all().map(toCamel);
  firms.forEach(f => { f.parent = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(f.parentId)); });
  res.json(firms);
});
app.get('/api/firms/:id', (req, res) => res.json(toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(req.params.id))));
app.post('/api/firms', (req, res) => {
  try {
    const { name, orderNo, parentId, version } = req.body;
    const info = db.prepare('INSERT INTO "Firm" ("Name", "OrderNo", "ParentId", "Version") VALUES (?, ?, ?, ?)').run(name, orderNo != null ? Number(orderNo) : null, parentId ? Number(parentId) : null, version != null ? Number(version) : null);
    const created = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(info.lastInsertRowid));
    if (created) created.parent = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(created.parentId));
    res.json(created);
  } catch (err) {
    console.error('[FIRM CREATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/firms/:id', (req, res) => {
  try {
    const { name, orderNo, parentId, version } = req.body;
    db.prepare('UPDATE "Firm" SET "Name" = ?, "OrderNo" = ?, "ParentId" = ?, "Version" = ? WHERE "Id" = ?').run(name, orderNo != null ? Number(orderNo) : null, parentId ? Number(parentId) : null, version != null ? Number(version) : null, req.params.id);
    const updated = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(req.params.id));
    if (updated) updated.parent = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(updated.parentId));
    res.json(updated);
  } catch (err) {
    console.error('[FIRM UPDATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/firms/:id', (req, res) => {
  try {
    // Nullify firm references before deleting
    db.prepare('UPDATE "Ticket" SET "FirmId" = NULL WHERE "FirmId" = ?').run(req.params.id);
    db.prepare('UPDATE "User" SET "FirmId" = NULL WHERE "FirmId" = ?').run(req.params.id);
    db.prepare('UPDATE "Firm" SET "ParentId" = NULL WHERE "ParentId" = ?').run(req.params.id);
    db.prepare('DELETE FROM "Firm_Product" WHERE "FirmId" = ?').run(req.params.id);
    db.prepare('DELETE FROM "Firm" WHERE "Id" = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[FIRM DELETE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/firms/:firmId/products', (req, res) => {
  const products = db.prepare('SELECT p.* FROM "Product" p JOIN "Firm_Product" fp ON p."Id" = fp."ProductId" WHERE fp."FirmId" = ?').all(req.params.firmId).map(toCamel);
  res.json(products);
});

// --- KULLANICILAR ---
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM "User" ORDER BY "OrderNo"').all().map(toCamel);
  users.forEach(u => {
    u.firm = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(u.firmId));
    u.privilege = toCamel(db.prepare('SELECT * FROM "Privilege" WHERE "Id" = ?').get(u.privilegeId));
  });
  res.json(users);
});
app.post('/api/users', (req, res) => {
  const { name, mail, password, gsm, firmId, privilegeId, orderNo } = req.body;
  const info = db.prepare('INSERT INTO "User" ("Name", "Mail", "Password", "Gsm", "FirmId", "PrivilegeId", "OrderNo") VALUES (?, ?, ?, ?, ?, ?, ?)').run(name||'', mail||'', password||'', gsm||'', firmId||null, privilegeId||null, orderNo||null);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/users/:id', (req, res) => {
  const { name, mail, gsm, firmId, privilegeId, orderNo } = req.body;
  db.prepare('UPDATE "User" SET "Name"=?, "Mail"=?, "Gsm"=?, "FirmId"=?, "PrivilegeId"=?, "OrderNo"=? WHERE "Id"=?').run(name, mail, gsm||'', firmId||null, privilegeId||null, orderNo||null, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM "User" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ETIKETLER (Labels) ---
app.get('/api/labels', (req, res) => res.json(db.prepare('SELECT * FROM "Label"').all().map(toCamel)));
app.post('/api/labels', (req, res) => {
  const { name, description, colorHex } = req.body;
  const info = db.prepare('INSERT INTO "Label" ("Name", "Description", "ColorHex") VALUES (?, ?, ?)').run(name, description, colorHex);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/labels/:id', (req, res) => {
  const { name, description, colorHex } = req.body;
  db.prepare('UPDATE "Label" SET "Name"=?, "Description"=?, "ColorHex"=? WHERE "Id"=?').run(name, description, colorHex, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/labels/:id', (req, res) => {
  db.prepare('DELETE FROM "Label" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ÜRÜNLER ---
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM "Product" ORDER BY "OrderNo"').all().map(toCamel);
  products.forEach(p => {
    p.manager = toCamel(db.prepare('SELECT * FROM "User" WHERE "Id" = ?').get(p.managerId));
    p.firmProducts = db.prepare('SELECT fp.*, f."Name" AS firmName FROM "Firm_Product" fp JOIN "Firm" f ON fp."FirmId" = f."Id" WHERE fp."ProductId" = ?').all(p.id).map(toCamel);
    if(p.firmProducts) {
      p.firmProducts = p.firmProducts.map(fp => ({ firmId: fp.firmId, productId: fp.productId, firm: { id: fp.firmId, name: fp.firmName } }));
    }
  });
  res.json(products);
});
app.post('/api/products', (req, res) => {
  const info = db.prepare('INSERT INTO "Product" ("Name", "ManagerId", "OrderNo") VALUES (?, ?, ?)').run(req.body.name, req.body.managerId || null, req.body.orderNo || null);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/products/:id', (req, res) => {
  db.prepare('UPDATE "Product" SET "Name"=?, "ManagerId"=?, "OrderNo"=? WHERE "Id"=?').run(req.body.name, req.body.managerId || null, req.body.orderNo || null, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM "Product" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});
app.post('/api/products/:id/firms/:firmId', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO "Firm_Product" ("ProductId", "FirmId") VALUES (?, ?)').run(req.params.id, req.params.firmId);
  res.json({ success: true });
});
app.delete('/api/products/:id/firms/:firmId', (req, res) => {
  db.prepare('DELETE FROM "Firm_Product" WHERE "ProductId" = ? AND "FirmId" = ?').run(req.params.id, req.params.firmId);
  res.json({ success: true });
});

// --- TICKETLAR ---
const getFullTicket = (id) => {
  const t = toCamel(db.prepare('SELECT * FROM "Ticket" WHERE "Id" = ?').get(id));
  if (!t) return null;
  t.firm = toCamel(db.prepare('SELECT * FROM "Firm" WHERE "Id" = ?').get(t.firmId));
  t.assignedUser = toCamel(db.prepare('SELECT * FROM "User" WHERE "Id" = ?').get(t.assignedUserId));
  t.createdUser = toCamel(db.prepare('SELECT * FROM "User" WHERE "Id" = ?').get(t.createdUserId));
  t.status = toCamel(db.prepare('SELECT * FROM "TicketStatus" WHERE "Id" = ?').get(t.statusId));
  t.priority = toCamel(db.prepare('SELECT * FROM "TicketPriority" WHERE "Id" = ?').get(t.priorityId));
  t.product = toCamel(db.prepare('SELECT * FROM "Product" WHERE "Id" = ?').get(t.productId));
  // Product manager
  if (t.product) {
    t.product.manager = toCamel(db.prepare('SELECT * FROM "User" WHERE "Id" = ?').get(t.product.managerId));
  }
  const labelHistory = db.prepare(`
    SELECT tlh."LabelId", l."Name", l."ColorHex", l."Description",
           MAX(tlh."Id") as lastAction, tlh."ActionType"
    FROM "TicketLabelHistory" tlh
    JOIN "Label" l ON tlh."LabelId" = l."Id"
    WHERE tlh."TicketId" = ?
    GROUP BY tlh."LabelId"
    HAVING tlh."ActionType" = 1
  `).all(t.id);
  t.ticketLabels = labelHistory.map(lh => ({ labelId: lh.LabelId, label: { id: lh.LabelId, name: lh.Name, colorHex: lh.ColorHex, description: lh.Description } }));
  if (t.status) t.status.isClosed = !!t.status.isClosed;
  return t;
};

app.get('/api/tickets', (req, res) => {
  const ids = db.prepare('SELECT "Id" FROM "Ticket" ORDER BY "Id" DESC').all();
  res.json(ids.map(row => getFullTicket(row.Id)));
});
app.get('/api/tickets/:id', (req, res) => res.json(getFullTicket(req.params.id)));
app.post('/api/tickets', (req, res) => {
  const { title, content, firmId, assignedUserId, statusId, priorityId, createdUserId, productId, dueDate, scope } = req.body;
  const info = db.prepare('INSERT INTO "Ticket" ("Title", "Content", "FirmId", "AssignedUserId", "StatusId", "PriorityId", "CreatedUserId", "ProductId", "DueDate", "Scope") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(title, content, firmId||null, assignedUserId||null, statusId||null, priorityId||null, createdUserId||null, productId||null, dueDate||null, scope||null);
  // TicketEventHistory kaydı sadece TicketEventType tablosunda kayıt varsa oluştur
  const hasEventType = db.prepare('SELECT COUNT(*) as c FROM "TicketEventType" WHERE "Id" = 1').get().c > 0;
  if (hasEventType) {
    db.prepare('INSERT INTO "TicketEventHistory" ("TicketEventTypeId", "TicketId", "Description", "UserId", "ActionDate") VALUES (1, ?, \'Ticket oluşturuldu\', ?, ?)').run(info.lastInsertRowid, createdUserId||null, new Date().toISOString());
  }
  res.json(getFullTicket(info.lastInsertRowid));
});
app.put('/api/tickets/:id', (req, res) => {
  const { title, content, priorityId, statusId, firmId, assignedUserId, productId, dueDate, scope } = req.body;
  db.prepare('UPDATE "Ticket" SET "Title"=?, "Content"=?, "PriorityId"=?, "StatusId"=?, "FirmId"=?, "AssignedUserId"=?, "ProductId"=?, "DueDate"=?, "Scope"=? WHERE "Id"=?').run(title, content, priorityId||null, statusId||null, firmId||null, assignedUserId||null, productId||null, dueDate||null, scope||null, req.params.id);
  res.json(getFullTicket(req.params.id));
});
app.delete('/api/tickets/:id', (req, res) => {
  db.prepare('DELETE FROM "TicketComments" WHERE "TicketId" = ?').run(req.params.id);
  db.prepare('DELETE FROM "TicketLabelHistory" WHERE "TicketId" = ?').run(req.params.id);
  db.prepare('DELETE FROM "TicketEventHistory" WHERE "TicketId" = ?').run(req.params.id);
  db.prepare('DELETE FROM "Ticket" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- TICKET STATUS CHANGE ---
app.post('/api/tickets/:id/status/:statusId', (req, res) => {
  const ticket = db.prepare('SELECT * FROM "Ticket" WHERE "Id" = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket bulunamadı' });
  const oldStatusId = ticket.StatusId;
  db.prepare('UPDATE "Ticket" SET "StatusId" = ? WHERE "Id" = ?').run(req.params.statusId, req.params.id);
  const hasEventType = db.prepare('SELECT COUNT(*) as c FROM "TicketEventType"').get().c > 0;
  if (hasEventType) {
    db.prepare('INSERT INTO "TicketEventHistory" ("TicketEventTypeId", "TicketId", "Description", "OldValue", "NewValue", "UserId", "ActionDate") VALUES (3, ?, ?, ?, ?, ?, ?)').run(
      req.params.id, 'Durum değiştirildi', String(oldStatusId || ''), String(req.params.statusId), ticket.AssignedUserId || null, new Date().toISOString()
    );
  }
  res.json(getFullTicket(req.params.id));
});

// --- TICKET ASSIGN ---
app.post('/api/tickets/:id/assign/:userId', (req, res) => {
  db.prepare('UPDATE "Ticket" SET "AssignedUserId" = ? WHERE "Id" = ?').run(req.params.userId, req.params.id);
  res.json(getFullTicket(req.params.id));
});

// --- TICKET COMMENTS ---
app.get('/api/tickets/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM "TicketComments" WHERE "TicketId" = ? ORDER BY "ActionDate" ASC').all(req.params.id).map(toCamel);
  comments.forEach(c => { c.user = toCamel(db.prepare('SELECT * FROM "User" WHERE "Id" = ?').get(c.userId)); });
  res.json(comments);
});
app.post('/api/tickets/:id/comments', (req, res) => {
  const { content, userId } = req.body;
  const info = db.prepare('INSERT INTO "TicketComments" ("TicketId", "UserId", "Content", "ActionDate") VALUES (?, ?, ?, ?)').run(req.params.id, userId, content, new Date().toISOString());
  res.json({ id: info.lastInsertRowid, ticketId: Number(req.params.id), userId, content, actionDate: new Date().toISOString() });
});

// --- TICKET LABELS ---
app.post('/api/tickets/:id/label/:labelId', (req, res) => {
  const userId = req.query.userId || req.body?.userId || null;
  db.prepare('INSERT INTO "TicketLabelHistory" ("ActionType", "ActionDate", "LabelId", "TicketId", "UserId") VALUES (1, ?, ?, ?, ?)').run(new Date().toISOString(), req.params.labelId, req.params.id, userId);
  res.json({ success: true });
});
app.delete('/api/tickets/:id/label/:labelId', (req, res) => {
  const userId = req.query.userId || null;
  db.prepare('INSERT INTO "TicketLabelHistory" ("ActionType", "ActionDate", "LabelId", "TicketId", "UserId") VALUES (0, ?, ?, ?, ?)').run(new Date().toISOString(), req.params.labelId, req.params.id, userId);
  res.json({ success: true });
});

// --- TICKET ACTIVITY ---
app.get('/api/tickets/:id/activity', (req, res) => {
  const events = db.prepare('SELECT * FROM "TicketEventHistory" WHERE "TicketId" = ? ORDER BY "ActionDate" DESC').all(req.params.id).map(toCamel);
  events.forEach(e => { e.user = toCamel(db.prepare('SELECT * FROM "User" WHERE "Id" = ?').get(e.userId)); });
  res.json(events);
});

// --- LOOKUPS: TICKET STATUS (CRUD) ---
app.get('/api/lookups/ticket-statuses', (req, res) => res.json(db.prepare('SELECT * FROM "TicketStatus" ORDER BY "OrderNo"').all().map(toCamel).map(s => ({...s, isClosed: !!s.isClosed}))));
app.post('/api/lookups/ticket-statuses', (req, res) => {
  const { name, isClosed, orderNo, colorHex } = req.body;
  const info = db.prepare('INSERT INTO "TicketStatus" ("Name", "IsClosed", "OrderNo", "ColorHex") VALUES (?, ?, ?, ?)').run(name, isClosed ? 1 : 0, orderNo || null, colorHex || null);
  res.json({ id: info.lastInsertRowid, name, isClosed: !!isClosed, orderNo, colorHex });
});
app.put('/api/lookups/ticket-statuses/:id', (req, res) => {
  const { name, isClosed, orderNo, colorHex } = req.body;
  db.prepare('UPDATE "TicketStatus" SET "Name"=?, "IsClosed"=?, "OrderNo"=?, "ColorHex"=? WHERE "Id"=?').run(name, isClosed ? 1 : 0, orderNo || null, colorHex || null, req.params.id);
  res.json({ id: Number(req.params.id), name, isClosed: !!isClosed, orderNo, colorHex });
});
app.delete('/api/lookups/ticket-statuses/:id', (req, res) => {
  db.prepare('DELETE FROM "TicketStatus" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS: TICKET PRIORITY (CRUD) ---
app.get('/api/lookups/ticket-priorities', (req, res) => res.json(db.prepare('SELECT * FROM "TicketPriority" ORDER BY "OrderNo"').all().map(toCamel)));
app.post('/api/lookups/ticket-priorities', (req, res) => {
  const { name, orderNo, colorHex } = req.body;
  const info = db.prepare('INSERT INTO "TicketPriority" ("Name", "OrderNo", "ColorHex") VALUES (?, ?, ?)').run(name, orderNo || null, colorHex || null);
  res.json({ id: info.lastInsertRowid, name, orderNo, colorHex });
});
app.put('/api/lookups/ticket-priorities/:id', (req, res) => {
  const { name, orderNo, colorHex } = req.body;
  db.prepare('UPDATE "TicketPriority" SET "Name"=?, "OrderNo"=?, "ColorHex"=? WHERE "Id"=?').run(name, orderNo || null, colorHex || null, req.params.id);
  res.json({ id: Number(req.params.id), name, orderNo, colorHex });
});
app.delete('/api/lookups/ticket-priorities/:id', (req, res) => {
  db.prepare('DELETE FROM "TicketPriority" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS: PRIVILEGE (CRUD) ---
app.get('/api/lookups/privileges', (req, res) => res.json(db.prepare('SELECT * FROM "Privilege" ORDER BY "OrderNo"').all().map(toCamel)));
app.post('/api/lookups/privileges', (req, res) => {
  const { name, orderNo, colorHex } = req.body;
  const info = db.prepare('INSERT INTO "Privilege" ("Name", "OrderNo", "ColorHex") VALUES (?, ?, ?)').run(name, orderNo || null, colorHex || null);
  res.json({ id: info.lastInsertRowid, name, orderNo, colorHex });
});
app.put('/api/lookups/privileges/:id', (req, res) => {
  const { name, orderNo, colorHex } = req.body;
  db.prepare('UPDATE "Privilege" SET "Name"=?, "OrderNo"=?, "ColorHex"=? WHERE "Id"=?').run(name, orderNo || null, colorHex || null, req.params.id);
  res.json({ id: Number(req.params.id), name, orderNo, colorHex });
});
app.delete('/api/lookups/privileges/:id', (req, res) => {
  db.prepare('DELETE FROM "Privilege" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS: READ-ONLY ---
app.get('/api/lookups/entities', (req, res) => res.json(db.prepare('SELECT * FROM "Entity" ORDER BY "Id"').all().map(toCamel)));
app.get('/api/lookups/entity-event-types', (req, res) => res.json(db.prepare('SELECT * FROM "EntityEventType" ORDER BY "Id"').all().map(toCamel)));
app.get('/api/lookups/ticket-event-types', (req, res) => res.json(db.prepare('SELECT * FROM "TicketEventType" ORDER BY "Id"').all().map(toCamel)));

// --- FILE UPLOAD ---
app.post('/api/upload', async (req, res) => {
  try {
    // Simple base64 upload fallback
    const { fileName, data } = req.body || {};
    if (fileName && data) {
      const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
      const newName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filePath = join(uploadsDir, newName);
      const buffer = Buffer.from(data, 'base64');
      const { writeFileSync } = await import('fs');
      writeFileSync(filePath, buffer);
      return res.json({ url: `/uploads/${newName}`, name: fileName, size: buffer.length });
    }
    res.status(400).json({ error: 'No file provided' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

app.listen(PORT, () => {
  console.log(`[API] Server çalışıyor → http://localhost:${PORT}`);
});
