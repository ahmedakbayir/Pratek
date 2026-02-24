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

// 2. TABLOLARIN OLUŞTURULMASI (EF Core ile Birebir Uyumlu)
db.exec(`
  CREATE TABLE IF NOT EXISTS "entity_type" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS "event_type" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS "ticket_status" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL, "IsClosed" INTEGER NOT NULL DEFAULT 0, "OrderNo" INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS "ticket_priority" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL, "Level" INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS "yetki" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS "user" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL DEFAULT '', "Mail" TEXT NOT NULL DEFAULT '', "Password" TEXT NOT NULL DEFAULT '', "Tel" TEXT NOT NULL DEFAULT '', "RoleId" INTEGER NOT NULL DEFAULT 2);
  CREATE TABLE IF NOT EXISTS "firm" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS "tag" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL, "Description" TEXT, "ColorHex" TEXT);
  CREATE TABLE IF NOT EXISTS "product" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL DEFAULT '', "ManagerId" INTEGER NOT NULL REFERENCES "user"("Id"));
  CREATE TABLE IF NOT EXISTS "ticket" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "Title" TEXT NOT NULL, "Description" TEXT, "FirmId" INTEGER REFERENCES "firm"("Id") ON DELETE SET NULL, "CreatedBy" INTEGER REFERENCES "user"("Id"), "AssignedUserId" INTEGER REFERENCES "user"("Id") ON DELETE SET NULL, "TicketStatusId" INTEGER NOT NULL REFERENCES "ticket_status"("Id"), "TicketPriorityId" INTEGER NOT NULL REFERENCES "ticket_priority"("Id"), "ProductId" INTEGER REFERENCES "product"("Id"), "CreatedAt" TEXT NOT NULL, "UpdatedAt" TEXT, "UpdatedBy" INTEGER);
  CREATE TABLE IF NOT EXISTS "ticket_tag" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "TicketId" INTEGER NOT NULL REFERENCES "ticket"("Id") ON DELETE CASCADE, "TagId" INTEGER NOT NULL REFERENCES "tag"("Id") ON DELETE CASCADE, "CreatedBy" INTEGER NOT NULL DEFAULT 0, "CreatedAt" TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS "ticket_comment" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "TicketId" INTEGER NOT NULL REFERENCES "ticket"("Id") ON DELETE CASCADE, "UserId" INTEGER NOT NULL REFERENCES "user"("Id"), "Content" TEXT NOT NULL DEFAULT '', "CreatedAt" TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS "event_log" ("Id" INTEGER PRIMARY KEY AUTOINCREMENT, "CreatedAt" TEXT NOT NULL, "EntityTypeId" INTEGER NOT NULL REFERENCES "entity_type"("Id"), "EntityId" INTEGER NOT NULL, "EventTypeId" INTEGER NOT NULL REFERENCES "event_type"("Id"), "Description" TEXT, "UserId" INTEGER REFERENCES "user"("Id"));
  CREATE TABLE IF NOT EXISTS "firm_product" ("FirmId" INTEGER NOT NULL REFERENCES "firm"("Id") ON DELETE CASCADE, "ProductId" INTEGER NOT NULL REFERENCES "product"("Id") ON DELETE CASCADE, PRIMARY KEY("FirmId", "ProductId"));
`);

// 3. İLK VERİLER (SEED)
function seed(table, rows) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get().c;
  if (count === 0) {
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO "${table}" ("${cols.join('", "')}") VALUES (${placeholders})`);
    for (const r of rows) stmt.run(...cols.map(c => r[c]));
  }
}
seed('ticket_status', [{Id:1,Name:'Açık',IsClosed:0,OrderNo:1},{Id:2,Name:'Devam Ediyor',IsClosed:0,OrderNo:2},{Id:3,Name:'Çözümlendi',IsClosed:1,OrderNo:3},{Id:4,Name:'Kapalı',IsClosed:1,OrderNo:4}]);
seed('ticket_priority', [{Id:1,Name:'Kritik',Level:1},{Id:2,Name:'Yüksek',Level:2},{Id:3,Name:'Normal',Level:3},{Id:4,Name:'Düşük',Level:4}]);
seed('entity_type', [{Id:1,Name:'User'},{Id:2,Name:'Ticket'},{Id:3,Name:'Firm'},{Id:4,Name:'Tag'}]);
seed('event_type', [{Id:1,Name:'Created'},{Id:2,Name:'Updated'},{Id:3,Name:'Assigned'},{Id:4,Name:'Deleted'}]);
seed('yetki', [{Id:1,Name:'Admin'},{Id:2,Name:'Agent'},{Id:3,Name:'Müşteri'}]);

// 4. VERİ FORMATLAYICI (PascalCase'i React için camelCase yapar)
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
  const info = db.prepare('INSERT INTO "firm" ("Name") VALUES (?)').run(req.body.name);
  res.json({ id: info.lastInsertRowid, name: req.body.name });
});
app.put('/api/firms/:id', (req, res) => {
  db.prepare('UPDATE "firm" SET "Name" = ? WHERE "Id" = ?').run(req.body.name, req.params.id);
  res.json({ id: Number(req.params.id), name: req.body.name });
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
app.get('/api/users', (req, res) => res.json(db.prepare('SELECT * FROM "user"').all().map(toCamel)));
app.post('/api/users', (req, res) => {
  const { name, mail, password, tel, roleId } = req.body;
  const info = db.prepare('INSERT INTO "user" ("Name", "Mail", "Password", "Tel", "RoleId") VALUES (?, ?, ?, ?, ?)').run(name||'', mail||'', password||'', tel||'', roleId||2);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/users/:id', (req, res) => {
  const { name, mail, tel, roleId } = req.body;
  db.prepare('UPDATE "user" SET "Name"=?, "Mail"=?, "Tel"=?, "RoleId"=? WHERE "Id"=?').run(name, mail, tel||'', roleId, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM "user" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- TAGLER ---
app.get('/api/tags', (req, res) => res.json(db.prepare('SELECT * FROM "tag"').all().map(toCamel)));
app.post('/api/tags', (req, res) => {
  const { name, description, colorHex } = req.body;
  const info = db.prepare('INSERT INTO "tag" ("Name", "Description", "ColorHex") VALUES (?, ?, ?)').run(name, description, colorHex);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/tags/:id', (req, res) => {
  const { name, description, colorHex } = req.body;
  db.prepare('UPDATE "tag" SET "Name"=?, "Description"=?, "ColorHex"=? WHERE "Id"=?').run(name, description, colorHex, req.params.id);
  res.json({ id: Number(req.params.id), ...req.body });
});
app.delete('/api/tags/:id', (req, res) => {
  db.prepare('DELETE FROM "tag" WHERE "Id" = ?').run(req.params.id);
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
  const info = db.prepare('INSERT INTO "product" ("Name", "ManagerId") VALUES (?, ?)').run(req.body.name, req.body.managerId);
  res.json({ id: info.lastInsertRowid, ...req.body });
});
app.put('/api/products/:id', (req, res) => {
  db.prepare('UPDATE "product" SET "Name"=?, "ManagerId"=? WHERE "Id"=?').run(req.body.name, req.body.managerId, req.params.id);
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
  t.status = toCamel(db.prepare('SELECT * FROM "ticket_status" WHERE "Id" = ?').get(t.ticketStatusId));
  t.priority = toCamel(db.prepare('SELECT * FROM "ticket_priority" WHERE "Id" = ?').get(t.ticketPriorityId));
  t.product = toCamel(db.prepare('SELECT * FROM "product" WHERE "Id" = ?').get(t.productId));
  t.ticketTags = db.prepare(`SELECT tt.*, t."Name", t."ColorHex" FROM "ticket_tag" tt JOIN "tag" t ON tt."TagId" = t."Id" WHERE tt."TicketId" = ?`).all(t.id).map(tt => ({ tag: { id: tt.TagId, name: tt.Name, colorHex: tt.ColorHex } }));
  if (t.status) t.status.isClosed = !!t.status.isClosed;
  return t;
};

app.get('/api/tickets', (req, res) => {
  const ids = db.prepare('SELECT "Id" FROM "ticket" ORDER BY "Id" DESC').all();
  res.json(ids.map(row => getFullTicket(row.Id)));
});
app.get('/api/tickets/:id', (req, res) => res.json(getFullTicket(req.params.id)));
app.post('/api/tickets', (req, res) => {
  const { title, description, firmId, assignedUserId, ticketStatusId, ticketPriorityId, createdBy, productId } = req.body;
  const info = db.prepare(`INSERT INTO "ticket" ("Title", "Description", "FirmId", "AssignedUserId", "TicketStatusId", "TicketPriorityId", "CreatedBy", "ProductId", "CreatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, description, firmId, assignedUserId, ticketStatusId||1, ticketPriorityId||3, createdBy, productId, new Date().toISOString());
  db.prepare(`INSERT INTO "event_log" ("EntityTypeId", "EventTypeId", "EntityId", "Description", "UserId", "CreatedAt") VALUES (2, 1, ?, 'Ticket created', ?, ?)`).run(info.lastInsertRowid, createdBy, new Date().toISOString());
  res.json(getFullTicket(info.lastInsertRowid));
});
app.put('/api/tickets/:id', (req, res) => {
  const { title, description, ticketPriorityId, ticketStatusId, firmId, assignedUserId, productId } = req.body;
  db.prepare(`UPDATE "ticket" SET "Title"=?, "Description"=?, "TicketPriorityId"=?, "TicketStatusId"=?, "FirmId"=?, "AssignedUserId"=?, "ProductId"=?, "UpdatedAt"=? WHERE "Id"=?`).run(title, description, ticketPriorityId, ticketStatusId, firmId, assignedUserId, productId, new Date().toISOString(), req.params.id);
  res.json(getFullTicket(req.params.id));
});
app.delete('/api/tickets/:id', (req, res) => {
  db.prepare('DELETE FROM "ticket" WHERE "Id" = ?').run(req.params.id);
  res.json({ success: true });
});

// --- LOOKUPS ---
app.get('/api/ticket-statuses', (req, res) => res.json(db.prepare('SELECT * FROM "ticket_status" ORDER BY "OrderNo"').all().map(toCamel).map(s => ({...s, isClosed: !!s.isClosed}))));
app.get('/api/ticket-priorities', (req, res) => res.json(db.prepare('SELECT * FROM "ticket_priority" ORDER BY "Level"').all().map(toCamel)));
app.get('/api/roles', (req, res) => res.json(db.prepare('SELECT * FROM "yetki" ORDER BY "Id"').all().map(toCamel)));

app.listen(PORT, () => {
  console.log(`[API] Server çalışıyor → http://localhost:${PORT}`);
});