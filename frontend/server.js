import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. VERİTABANI BAĞLANTISI (Ortak Ana Dizinde)
const dbPath = join(__dirname, '..', 'pratek.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('════════════════════════════════════════════════════');
console.log(`[PRATEK] Veritabanı Aktif → ${dbPath}`);
console.log('════════════════════════════════════════════════════');

// 2. TABLOLARIN OLUŞTURULMASI (Yeni Şema)
db.exec(`
  CREATE TABLE IF NOT EXISTS "entity" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT);
  CREATE TABLE IF NOT EXISTS "entity_event_type" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT);
  CREATE TABLE IF NOT EXISTS "ticket_event_type" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT);
  CREATE TABLE IF NOT EXISTS "ticket_status" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "IsClosed" INTEGER, "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "ticket_priority" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "privilege" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "firm" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "OrderNo" INTEGER, "ParentId" INTEGER REFERENCES "firm"("Id"));
  CREATE TABLE IF NOT EXISTS "label" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "Description" TEXT, "ColorHex" TEXT);
  CREATE TABLE IF NOT EXISTS "user" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "Mail" TEXT, "Password" TEXT, "Gsm" TEXT, "FirmId" INTEGER REFERENCES "firm"("Id"), "PrivilegeId" INTEGER REFERENCES "privilege"("Id"), "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "product" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT, "ManagerId" INTEGER REFERENCES "user"("Id"), "OrderNo" INTEGER);
  CREATE TABLE IF NOT EXISTS "ticket" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Title" TEXT, "Content" TEXT, "DueDate" TEXT, "AssignedUserId" INTEGER REFERENCES "user"("Id"), "CreatedUserId" INTEGER REFERENCES "user"("Id"), "FirmId" INTEGER REFERENCES "firm"("Id"), "PriorityId" INTEGER REFERENCES "ticket_priority"("Id"), "ProductId" INTEGER REFERENCES "product"("Id"), "StatusId" INTEGER REFERENCES "ticket_status"("Id"));
  CREATE TABLE IF NOT EXISTS "ticket_label_history" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "ActionType" INTEGER, "ActionDate" TEXT, "LabelId" INTEGER NOT NULL REFERENCES "label"("Id"), "TicketId" INTEGER NOT NULL REFERENCES "ticket"("Id"), "UserId" INTEGER REFERENCES "user"("Id"));
  CREATE TABLE IF NOT EXISTS "ticket_comment" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "TicketId" INTEGER NOT NULL REFERENCES "ticket"("Id") ON DELETE CASCADE, "UserId" INTEGER NOT NULL REFERENCES "user"("Id"), "Content" TEXT, "ActionDate" TEXT, "Inactive" INTEGER);
  CREATE TABLE IF NOT EXISTS "entity_event_history" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "ActionDate" TEXT, "EntityEventTypeId" INTEGER NOT NULL REFERENCES "entity_event_type"("Id"), "EntityId" INTEGER NOT NULL, "UserId" INTEGER REFERENCES "user"("Id"), "Description" TEXT);
  CREATE TABLE IF NOT EXISTS "ticket_event_history" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "ActionDate" TEXT, "TicketEventTypeId" INTEGER NOT NULL REFERENCES "ticket_event_type"("Id"), "TicketId" INTEGER NOT NULL REFERENCES "ticket"("Id"), "UserId" INTEGER REFERENCES "user"("Id"), "Description" TEXT, "NewValue" TEXT, "OldValue" TEXT);
  CREATE TABLE IF NOT EXISTS "firm_product" ("FirmId" INTEGER NOT NULL REFERENCES "firm"("Id") ON DELETE CASCADE, "ProductId" INTEGER NOT NULL REFERENCES "product"("Id") ON DELETE CASCADE, PRIMARY KEY("FirmId", "ProductId"));
`);

// 3. VERİ FORMATLAYICI (PascalCase'i React için camelCase yapar)
const toCamel = (obj) => {
  if (!obj) return obj;
  const newObj = {};
  for (const key of Object.keys(obj)) {
    newObj[key.charAt(0).toLowerCase() + key.slice(1)] = obj[key];
  }
  return newObj;
};

// 5. API ROUTE'LARI
// --- FIRMALAR ---
app.get('/api/firms', (req, res) => res.json(db.prepare('SELECT * FROM "firm"').all().map(toCamel)));
app.get('/api/firms/:id', (req, res) => res.json(toCamel(db.prepare('SELECT * FROM "firm" WHERE "Id" = ?').get(req.params.id))));
app.post('/api/firms', (req, res) => {
  const { name, orderNo, parentId } = req.body;
  const info = db.prepare('INSERT INTO "firm" ("Name", "OrderNo", "ParentId") VALUES (?, ?, ?)').run(name, orderNo || null, parentId || null);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/firms/:id', (req, res) => {
  const { name, orderNo, parentId } = req.body;
  db.prepare('UPDATE "firm" SET "Name" = ?, "OrderNo" = ?, "ParentId" = ? WHERE "Id" = ?').run(name, orderNo || null, parentId || null, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/firms/:id', (req, res) => {
  db.prepare('DELETE FROM "firm" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});
app.get('/api/firms/:firmId/products', (req, res) => {
  const products = db.prepare(`SELECT p.* FROM "product" p JOIN "firm_product" fp ON p."Id" = fp."ProductId" WHERE fp."FirmId" = ?`).all(req.params.firmId).map(toCamel);
  res.json(products);
});

// --- KULLANICILAR ---
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM "user"').all().map(toCamel);
  users.forEach(u => {
    u.firm = toCamel(db.prepare('SELECT * FROM "firm" WHERE "Id" = ?').get(u.firmId));
    u.privilege = toCamel(db.prepare('SELECT * FROM "privilege" WHERE "Id" = ?').get(u.privilegeId));
  });
  res.json(users);
});
app.post('/api/users', (req, res) => {
  const { name, mail, password, gsm, firmId, privilegeId, orderNo } = req.body;
  const info = db.prepare('INSERT INTO "user" ("Name", "Mail", "Password", "Gsm", "FirmId", "PrivilegeId", "OrderNo") VALUES (?, ?, ?, ?, ?, ?, ?)').run(name||'', mail||'', password||'', gsm||'', firmId||null, privilegeId||null, orderNo||null);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/users/:id', (req, res) => {
  const { name, mail, gsm, firmId, privilegeId, orderNo } = req.body;
  db.prepare('UPDATE "user" SET "Name"=?, "Mail"=?, "Gsm"=?, "FirmId"=?, "PrivilegeId"=?, "OrderNo"=? WHERE "Id"=?').run(name, mail, gsm||'', firmId||null, privilegeId||null, orderNo||null, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM "user" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ETIKETLER (Labels) ---
app.get('/api/labels', (req, res) => res.json(db.prepare('SELECT * FROM "label"').all().map(toCamel)));
app.post('/api/labels', (req, res) => {
  const { name, description, colorHex } = req.body;
  const info = db.prepare('INSERT INTO "label" ("Name", "Description", "ColorHex") VALUES (?, ?, ?)').run(name, description, colorHex);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/labels/:id', (req, res) => {
  const { name, description, colorHex } = req.body;
  db.prepare('UPDATE "label" SET "Name"=?, "Description"=?, "ColorHex"=? WHERE "Id"=?').run(name, description, colorHex, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/labels/:id', (req, res) => {
  db.prepare('DELETE FROM "label" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ÜRÜNLER ---
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM "product"').all().map(toCamel);
  products.forEach(p => {
    p.manager = toCamel(db.prepare('SELECT * FROM "user" WHERE "Id" = ?').get(p.managerId));
    p.firmProducts = db.prepare('SELECT fp.*, f."Name" AS firmName FROM "firm_product" fp JOIN "firm" f ON fp."FirmId" = f."Id" WHERE fp."ProductId" = ?').all(p.id).map(toCamel);
    if(p.firmProducts) {
      p.firmProducts = p.firmProducts.map(fp => ({ firmId: fp.firmId, productId: fp.productId, firm: { id: fp.firmId, name: fp.firmName } }));
    }
  });
  res.json(products);
});
app.post('/api/products', (req, res) => {
  const info = db.prepare('INSERT INTO "product" ("Name", "ManagerId", "OrderNo") VALUES (?, ?, ?)').run(req.body.name, req.body.managerId || null, req.body.orderNo || null);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/products/:id', (req, res) => {
  db.prepare('UPDATE "product" SET "Name"=?, "ManagerId"=?, "OrderNo"=? WHERE "Id"=?').run(req.body.name, req.body.managerId || null, req.body.orderNo || null, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM "product" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});
app.post('/api/products/:id/firms/:firmId', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO "firm_product" ("ProductId", "FirmId") VALUES (?, ?)').run(req.params.id, req.params.firmId);
  res.json({ success: true });
});
app.delete('/api/products/:id/firms/:firmId', (req, res) => {
  db.prepare('DELETE FROM "firm_product" WHERE "ProductId" = ? AND "FirmId" = ?').run(req.params.id, req.params.firmId);
  res.json({ success: true });
});

// --- TICKETLAR ---
const getFullTicket = (id) => {
  const t = toCamel(db.prepare('SELECT * FROM "ticket" WHERE "Id" = ?').get(id));
  if (!t) return null;
  t.firm = toCamel(db.prepare('SELECT * FROM "firm" WHERE "Id" = ?').get(t.firmId));
  t.assignedUser = toCamel(db.prepare('SELECT * FROM "user" WHERE "Id" = ?').get(t.assignedUserId));
  t.createdUser = toCamel(db.prepare('SELECT * FROM "user" WHERE "Id" = ?').get(t.createdUserId));
  t.status = toCamel(db.prepare('SELECT * FROM "ticket_status" WHERE "Id" = ?').get(t.statusId));
  t.priority = toCamel(db.prepare('SELECT * FROM "ticket_priority" WHERE "Id" = ?').get(t.priorityId));
  t.product = toCamel(db.prepare('SELECT * FROM "product" WHERE "Id" = ?').get(t.productId));
  // Labels via ticket_label_history (actionType=1 means added, 0 means removed - get current active labels)
  const labelHistory = db.prepare(`
    SELECT tlh."LabelId", l."Name", l."ColorHex", l."Description",
           MAX(tlh."Id") as lastAction, tlh."ActionType"
    FROM "ticket_label_history" tlh
    JOIN "label" l ON tlh."LabelId" = l."Id"
    WHERE tlh."TicketId" = ?
    GROUP BY tlh."LabelId"
    HAVING tlh."ActionType" = 1
  `).all(t.id);
  t.ticketLabels = labelHistory.map(lh => ({ label: { id: lh.LabelId, name: lh.Name, colorHex: lh.ColorHex, description: lh.Description } }));
  if (t.status) t.status.isClosed = !!t.status.isClosed;
  return t;
};

app.get('/api/tickets', (req, res) => {
  const ids = db.prepare('SELECT "Id" FROM "ticket" ORDER BY "Id" DESC').all();
  res.json(ids.map(row => getFullTicket(row.Id)));
});
app.get('/api/tickets/:id', (req, res) => res.json(getFullTicket(req.params.id)));
app.post('/api/tickets', (req, res) => {
  const { title, content, firmId, assignedUserId, statusId, priorityId, createdUserId, productId, dueDate } = req.body;
  const info = db.prepare(`INSERT INTO "ticket" ("Title", "Content", "FirmId", "AssignedUserId", "StatusId", "PriorityId", "CreatedUserId", "ProductId", "DueDate") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, content, firmId||null, assignedUserId||null, statusId||null, priorityId||null, createdUserId||null, productId||null, dueDate||null);
  db.prepare(`INSERT INTO "ticket_event_history" ("TicketEventTypeId", "TicketId", "Description", "UserId", "ActionDate") VALUES (1, ?, 'Ticket oluşturuldu', ?, ?)`).run(info.lastInsertRowid, createdUserId||null, new Date().toISOString());
  res.json(getFullTicket(info.lastInsertRowid));
});
app.put('/api/tickets/:id', (req, res) => {
  const { title, content, priorityId, statusId, firmId, assignedUserId, productId, dueDate } = req.body;
  db.prepare(`UPDATE "ticket" SET "Title"=?, "Content"=?, "PriorityId"=?, "StatusId"=?, "FirmId"=?, "AssignedUserId"=?, "ProductId"=?, "DueDate"=? WHERE "Id"=?`).run(title, content, priorityId||null, statusId||null, firmId||null, assignedUserId||null, productId||null, dueDate||null, req.params.id);
  res.json(getFullTicket(req.params.id));
});
app.delete('/api/tickets/:id', (req, res) => {
  db.prepare('DELETE FROM "ticket" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- TICKET COMMENTS ---
app.get('/api/tickets/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM "ticket_comment" WHERE "TicketId" = ? ORDER BY "ActionDate" ASC').all(req.params.id).map(toCamel);
  comments.forEach(c => { c.user = toCamel(db.prepare('SELECT * FROM "user" WHERE "Id" = ?').get(c.userId)); });
  res.json(comments);
});
app.post('/api/tickets/:id/comments', (req, res) => {
  const { content, userId } = req.body;
  const info = db.prepare('INSERT INTO "ticket_comment" ("TicketId", "UserId", "Content", "ActionDate") VALUES (?, ?, ?, ?)').run(req.params.id, userId, content, new Date().toISOString());
  res.json({ id: info.lastInsertRowid, ticketId: Number(req.params.id), userId, content, actionDate: new Date().toISOString() });
});

// --- TICKET LABELS ---
app.post('/api/tickets/:id/labels/:labelId', (req, res) => {
  const { userId } = req.body;
  db.prepare('INSERT INTO "ticket_label_history" ("ActionType", "ActionDate", "LabelId", "TicketId", "UserId") VALUES (1, ?, ?, ?, ?)').run(new Date().toISOString(), req.params.labelId, req.params.id, userId || null);
  res.json({ success: true });
});
app.delete('/api/tickets/:id/labels/:labelId', (req, res) => {
  db.prepare('INSERT INTO "ticket_label_history" ("ActionType", "ActionDate", "LabelId", "TicketId", "UserId") VALUES (0, ?, ?, ?, ?)').run(new Date().toISOString(), req.params.labelId, req.params.id, null);
  res.json({ success: true });
});

// --- TICKET ACTIVITY ---
app.get('/api/tickets/:id/activity', (req, res) => {
  const events = db.prepare('SELECT * FROM "ticket_event_history" WHERE "TicketId" = ? ORDER BY "ActionDate" DESC').all(req.params.id).map(toCamel);
  events.forEach(e => { e.user = toCamel(db.prepare('SELECT * FROM "user" WHERE "Id" = ?').get(e.userId)); });
  res.json(events);
});

// --- LOOKUPS: TICKET STATUS (CRUD) ---
app.get('/api/lookups/ticket-statuses', (req, res) => res.json(db.prepare('SELECT * FROM "ticket_status" ORDER BY "OrderNo"').all().map(toCamel).map(s => ({...s, isClosed: !!s.isClosed}))));
app.post('/api/lookups/ticket-statuses', (req, res) => {
  const { name, isClosed, orderNo } = req.body;
  const info = db.prepare('INSERT INTO "ticket_status" ("Name", "IsClosed", "OrderNo") VALUES (?, ?, ?)').run(name, isClosed ? 1 : 0, orderNo || null);
  res.json({ id: info.lastInsertRowid, name, isClosed: !!isClosed, orderNo });
});
app.put('/api/lookups/ticket-statuses/:id', (req, res) => {
  const { name, isClosed, orderNo } = req.body;
  db.prepare('UPDATE "ticket_status" SET "Name"=?, "IsClosed"=?, "OrderNo"=? WHERE "Id"=?').run(name, isClosed ? 1 : 0, orderNo || null, req.params.id);
  res.json({ id: Number(req.params.id), name, isClosed: !!isClosed, orderNo });
});
app.delete('/api/lookups/ticket-statuses/:id', (req, res) => {
  db.prepare('DELETE FROM "ticket_status" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS: TICKET PRIORITY (CRUD) ---
app.get('/api/lookups/ticket-priorities', (req, res) => res.json(db.prepare('SELECT * FROM "ticket_priority" ORDER BY "OrderNo"').all().map(toCamel)));
app.post('/api/lookups/ticket-priorities', (req, res) => {
  const { name, orderNo } = req.body;
  const info = db.prepare('INSERT INTO "ticket_priority" ("Name", "OrderNo") VALUES (?, ?)').run(name, orderNo || null);
  res.json({ id: info.lastInsertRowid, name, orderNo });
});
app.put('/api/lookups/ticket-priorities/:id', (req, res) => {
  const { name, orderNo } = req.body;
  db.prepare('UPDATE "ticket_priority" SET "Name"=?, "OrderNo"=? WHERE "Id"=?').run(name, orderNo || null, req.params.id);
  res.json({ id: Number(req.params.id), name, orderNo });
});
app.delete('/api/lookups/ticket-priorities/:id', (req, res) => {
  db.prepare('DELETE FROM "ticket_priority" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS: PRIVILEGE (CRUD) ---
app.get('/api/lookups/privileges', (req, res) => res.json(db.prepare('SELECT * FROM "privilege" ORDER BY "OrderNo"').all().map(toCamel)));
app.post('/api/lookups/privileges', (req, res) => {
  const { name, orderNo } = req.body;
  const info = db.prepare('INSERT INTO "privilege" ("Name", "OrderNo") VALUES (?, ?)').run(name, orderNo || null);
  res.json({ id: info.lastInsertRowid, name, orderNo });
});
app.put('/api/lookups/privileges/:id', (req, res) => {
  const { name, orderNo } = req.body;
  db.prepare('UPDATE "privilege" SET "Name"=?, "OrderNo"=? WHERE "Id"=?').run(name, orderNo || null, req.params.id);
  res.json({ id: Number(req.params.id), name, orderNo });
});
app.delete('/api/lookups/privileges/:id', (req, res) => {
  db.prepare('DELETE FROM "privilege" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS: READ-ONLY ---
app.get('/api/lookups/entities', (req, res) => res.json(db.prepare('SELECT * FROM "entity" ORDER BY "Id"').all().map(toCamel)));
app.get('/api/lookups/entity-event-types', (req, res) => res.json(db.prepare('SELECT * FROM "entity_event_type" ORDER BY "Id"').all().map(toCamel)));
app.get('/api/lookups/ticket-event-types', (req, res) => res.json(db.prepare('SELECT * FROM "ticket_event_type" ORDER BY "Id"').all().map(toCamel)));

app.listen(PORT, () => {
  console.log(`[API] Server çalışıyor → http://localhost:${PORT}`);
});
