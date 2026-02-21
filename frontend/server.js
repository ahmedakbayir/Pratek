import express from 'express';
import sql from 'mssql/msnodesqlv8.js';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────
// SQL SERVER CONNECTION
// ──────────────────────────────────────
const pool = new sql.ConnectionPool({
  connectionString:
    'Server=(localdb)\\MSSQLLocalDB;Database=protekh_db;Trusted_Connection=Yes;',
});

let poolReady = pool.connect();
poolReady
  .then(() => console.log('Connected to SQL Server (localdb)'))
  .catch((err) => {
    console.error('SQL Server connection failed:', err);
    process.exit(1);
  });

// Ensure pool is ready before handling requests
app.use(async (_req, _res, next) => {
  await poolReady;
  next();
});

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────
function now() {
  return new Date().toISOString();
}

async function logEvent(entityTypeId, eventTypeId, entityId, description, userId) {
  await pool
    .request()
    .input('entityTypeId', sql.Int, entityTypeId)
    .input('eventTypeId', sql.Int, eventTypeId)
    .input('entityId', sql.Int, entityId)
    .input('description', sql.NVarChar, description)
    .input('userId', sql.Int, userId ?? null)
    .input('createdAt', sql.DateTime2, new Date())
    .query(
      `INSERT INTO event_log (EntityTypeId, EventTypeId, EntityId, Description, UserId, CreatedAt)
       VALUES (@entityTypeId, @eventTypeId, @entityId, @description, @userId, @createdAt)`
    );
}

async function toTicketJson(row) {
  if (!row) return null;

  let firm = null;
  if (row.FirmId) {
    const r = await pool.request().input('id', sql.Int, row.FirmId).query('SELECT * FROM firm WHERE Id = @id');
    firm = r.recordset[0] || null;
  }

  let user = null;
  if (row.AssignedUserId) {
    const r = await pool.request().input('id', sql.Int, row.AssignedUserId).query('SELECT * FROM [user] WHERE Id = @id');
    user = r.recordset[0] || null;
  }

  const statusRes = await pool.request().input('id', sql.Int, row.TicketStatusId).query('SELECT * FROM ticket_status WHERE Id = @id');
  const status = statusRes.recordset[0] || null;

  const priorityRes = await pool.request().input('id', sql.Int, row.TicketPriorityId).query('SELECT * FROM ticket_priority WHERE Id = @id');
  const priority = priorityRes.recordset[0] || null;

  const tagsRes = await pool
    .request()
    .input('ticketId', sql.Int, row.Id)
    .query(
      `SELECT tt.*, t.Name, t.Description AS TagDescription, t.ColorHex
       FROM ticket_tag tt JOIN tag t ON tt.TagId = t.Id WHERE tt.TicketId = @ticketId`
    );

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
    assignedUser: user
      ? { id: user.Id, name: user.Name, mail: user.Mail, tel: user.Tel, roleId: user.RoleId }
      : null,
    status: status
      ? { id: status.Id, name: status.Name, isClosed: !!status.IsClosed, orderNo: status.OrderNo }
      : null,
    priority: priority
      ? { id: priority.Id, name: priority.Name, level: priority.Level }
      : null,
    ticketTags: tagsRes.recordset.map((tt) => ({
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
app.get('/api/firms', async (_req, res) => {
  const result = await pool.request().query('SELECT * FROM firm');
  res.json(result.recordset.map((r) => ({ id: r.Id, name: r.Name })));
});

app.get('/api/firms/:id', async (req, res) => {
  const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM firm WHERE Id = @id');
  const row = result.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name });
});

app.post('/api/firms', async (req, res) => {
  const { name } = req.body;
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .query('INSERT INTO firm (Name) OUTPUT INSERTED.Id VALUES (@name)');
  res.json({ id: result.recordset[0].Id, name });
});

app.put('/api/firms/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM firm WHERE Id = @id');
  if (!check.recordset[0]) return res.status(404).json({ error: 'Not found' });
  await pool.request().input('name', sql.NVarChar, req.body.name).input('id', sql.Int, req.params.id).query('UPDATE firm SET Name = @name WHERE Id = @id');
  res.json({ id: Number(req.params.id), name: req.body.name });
});

app.delete('/api/firms/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM firm WHERE Id = @id');
  if (!check.recordset[0]) return res.status(404).json({ error: 'Not found' });
  await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM firm WHERE Id = @id');
  res.json({ success: true });
});

// ══════════════════════════════════════
// TAGS
// ══════════════════════════════════════
app.get('/api/tags', async (_req, res) => {
  const result = await pool.request().query('SELECT * FROM tag');
  res.json(result.recordset.map((r) => ({ id: r.Id, name: r.Name, description: r.Description, colorHex: r.ColorHex })));
});

app.get('/api/tags/:id', async (req, res) => {
  const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM tag WHERE Id = @id');
  const row = result.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name, description: row.Description, colorHex: row.ColorHex });
});

app.post('/api/tags', async (req, res) => {
  const { name, description, colorHex } = req.body;
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('description', sql.NVarChar, description ?? null)
    .input('colorHex', sql.NVarChar, colorHex ?? null)
    .query('INSERT INTO tag (Name, Description, ColorHex) OUTPUT INSERTED.Id VALUES (@name, @description, @colorHex)');
  res.json({ id: result.recordset[0].Id, name, description: description ?? null, colorHex: colorHex ?? null });
});

app.put('/api/tags/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM tag WHERE Id = @id');
  if (!check.recordset[0]) return res.status(404).json({ error: 'Not found' });
  await pool
    .request()
    .input('name', sql.NVarChar, req.body.name)
    .input('description', sql.NVarChar, req.body.description ?? null)
    .input('colorHex', sql.NVarChar, req.body.colorHex ?? null)
    .input('id', sql.Int, req.params.id)
    .query('UPDATE tag SET Name = @name, Description = @description, ColorHex = @colorHex WHERE Id = @id');
  res.json({ id: Number(req.params.id), name: req.body.name, description: req.body.description ?? null, colorHex: req.body.colorHex ?? null });
});

app.delete('/api/tags/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM tag WHERE Id = @id');
  if (!check.recordset[0]) return res.status(404).json({ error: 'Not found' });
  await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM tag WHERE Id = @id');
  res.json({ success: true });
});

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════
app.get('/api/users', async (_req, res) => {
  const result = await pool.request().query('SELECT * FROM [user]');
  res.json(result.recordset.map((r) => ({ id: r.Id, name: r.Name, mail: r.Mail, tel: r.Tel, roleId: r.RoleId, password: r.Password })));
});

app.get('/api/users/:id', async (req, res) => {
  const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM [user] WHERE Id = @id');
  const row = result.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ id: row.Id, name: row.Name, mail: row.Mail, tel: row.Tel, roleId: row.RoleId });
});

app.post('/api/users', async (req, res) => {
  const { name, mail, password, tel, roleId } = req.body;
  const result = await pool
    .request()
    .input('name', sql.NVarChar, name ?? '')
    .input('mail', sql.NVarChar, mail ?? '')
    .input('password', sql.NVarChar, password ?? '')
    .input('tel', sql.NVarChar, tel ?? '')
    .input('roleId', sql.Int, roleId ?? 2)
    .query('INSERT INTO [user] (Name, Mail, Password, Tel, RoleId) OUTPUT INSERTED.Id VALUES (@name, @mail, @password, @tel, @roleId)');
  res.json({ id: result.recordset[0].Id, name, mail, tel, roleId: roleId ?? 2 });
});

app.put('/api/users/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM [user] WHERE Id = @id');
  const row = check.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  await pool
    .request()
    .input('name', sql.NVarChar, req.body.name)
    .input('mail', sql.NVarChar, req.body.mail)
    .input('tel', sql.NVarChar, req.body.tel ?? '')
    .input('roleId', sql.Int, req.body.roleId ?? row.RoleId)
    .input('id', sql.Int, req.params.id)
    .query('UPDATE [user] SET Name = @name, Mail = @mail, Tel = @tel, RoleId = @roleId WHERE Id = @id');
  res.json({ id: Number(req.params.id), name: req.body.name, mail: req.body.mail, tel: req.body.tel ?? '', roleId: req.body.roleId ?? row.RoleId });
});

app.delete('/api/users/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM [user] WHERE Id = @id');
  if (!check.recordset[0]) return res.status(404).json({ error: 'Not found' });
  await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM [user] WHERE Id = @id');
  res.json({ success: true });
});

// ══════════════════════════════════════
// TICKETS
// ══════════════════════════════════════
app.get('/api/tickets', async (_req, res) => {
  const result = await pool.request().query('SELECT * FROM ticket ORDER BY CreatedAt DESC');
  const tickets = await Promise.all(result.recordset.map(toTicketJson));
  res.json(tickets);
});

app.get('/api/tickets/:id', async (req, res) => {
  const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  const row = result.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(await toTicketJson(row));
});

app.post('/api/tickets', async (req, res) => {
  const { title, description, firmId, assignedUserId, ticketStatusId, ticketPriorityId, createdBy } = req.body;
  const createdAt = new Date();
  const result = await pool
    .request()
    .input('title', sql.NVarChar, title)
    .input('description', sql.NVarChar, description ?? null)
    .input('firmId', sql.Int, firmId ?? null)
    .input('assignedUserId', sql.Int, assignedUserId ?? null)
    .input('ticketStatusId', sql.Int, ticketStatusId ?? 1)
    .input('ticketPriorityId', sql.Int, ticketPriorityId ?? 3)
    .input('createdAt', sql.DateTime2, createdAt)
    .input('createdBy', sql.Int, createdBy ?? null)
    .query(
      `INSERT INTO ticket (Title, Description, FirmId, AssignedUserId, TicketStatusId, TicketPriorityId, CreatedAt, CreatedBy)
       OUTPUT INSERTED.Id
       VALUES (@title, @description, @firmId, @assignedUserId, @ticketStatusId, @ticketPriorityId, @createdAt, @createdBy)`
    );

  const newId = result.recordset[0].Id;
  await logEvent(2, 1, newId, `Ticket created: ${title}`, createdBy);

  const created = await pool.request().input('id', sql.Int, newId).query('SELECT * FROM ticket WHERE Id = @id');
  res.json(await toTicketJson(created.recordset[0]));
});

app.put('/api/tickets/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  const row = check.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { title, description, ticketPriorityId, ticketStatusId, firmId, assignedUserId, updatedBy } = req.body;
  await pool
    .request()
    .input('title', sql.NVarChar, title)
    .input('description', sql.NVarChar, description ?? null)
    .input('ticketPriorityId', sql.Int, ticketPriorityId)
    .input('ticketStatusId', sql.Int, ticketStatusId)
    .input('firmId', sql.Int, firmId ?? null)
    .input('assignedUserId', sql.Int, assignedUserId ?? null)
    .input('updatedAt', sql.DateTime2, new Date())
    .input('updatedBy', sql.Int, updatedBy ?? null)
    .input('id', sql.Int, req.params.id)
    .query(
      `UPDATE ticket SET Title=@title, Description=@description, TicketPriorityId=@ticketPriorityId,
       TicketStatusId=@ticketStatusId, FirmId=@firmId, AssignedUserId=@assignedUserId,
       UpdatedAt=@updatedAt, UpdatedBy=@updatedBy WHERE Id=@id`
    );

  await logEvent(2, 2, row.Id, `Ticket updated: ${title}`, updatedBy);

  const updated = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  res.json(await toTicketJson(updated.recordset[0]));
});

app.delete('/api/tickets/:id', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  const row = check.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM ticket WHERE Id = @id');
  await logEvent(2, 4, row.Id, 'Ticket deleted', null);
  res.json({ success: true });
});

// ── Ticket Comments ──
app.get('/api/tickets/:id/comments', async (req, res) => {
  const result = await pool
    .request()
    .input('ticketId', sql.Int, req.params.id)
    .query(
      `SELECT c.*, u.Name AS UserName, u.Mail AS UserMail, u.Tel AS UserTel, u.RoleId AS UserRoleId
       FROM ticket_comment c LEFT JOIN [user] u ON c.UserId = u.Id
       WHERE c.TicketId = @ticketId ORDER BY c.CreatedAt DESC`
    );
  res.json(
    result.recordset.map((r) => ({
      id: r.Id,
      ticketId: r.TicketId,
      userId: r.UserId,
      content: r.Content,
      createdAt: r.CreatedAt,
      user: r.UserName
        ? { id: r.UserId, name: r.UserName, mail: r.UserMail, tel: r.UserTel, roleId: r.UserRoleId }
        : null,
    }))
  );
});

app.post('/api/tickets/:id/comments', async (req, res) => {
  const { content, userId } = req.body;
  const createdAt = new Date();
  const result = await pool
    .request()
    .input('ticketId', sql.Int, req.params.id)
    .input('userId', sql.Int, userId)
    .input('content', sql.NVarChar, content)
    .input('createdAt', sql.DateTime2, createdAt)
    .query(
      'INSERT INTO ticket_comment (TicketId, UserId, Content, CreatedAt) OUTPUT INSERTED.Id VALUES (@ticketId, @userId, @content, @createdAt)'
    );
  await logEvent(2, 2, Number(req.params.id), 'Comment added', userId);

  const userRes = await pool.request().input('id', sql.Int, userId).query('SELECT * FROM [user] WHERE Id = @id');
  const user = userRes.recordset[0];
  res.json({
    id: result.recordset[0].Id,
    ticketId: Number(req.params.id),
    userId,
    content,
    createdAt,
    user: user ? { id: user.Id, name: user.Name, mail: user.Mail, tel: user.Tel, roleId: user.RoleId } : null,
  });
});

// ── Assign ──
app.post('/api/tickets/:id/assign/:userId', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  const row = check.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  await pool
    .request()
    .input('userId', sql.Int, req.params.userId)
    .input('id', sql.Int, req.params.id)
    .query('UPDATE ticket SET AssignedUserId = @userId WHERE Id = @id');
  await logEvent(2, 3, row.Id, `Assigned to user ${req.params.userId}`, Number(req.params.userId));
  const updated = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  res.json(await toTicketJson(updated.recordset[0]));
});

// ── Status Change ──
app.post('/api/tickets/:id/status/:statusId', async (req, res) => {
  const check = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  const row = check.recordset[0];
  if (!row) return res.status(404).json({ error: 'Not found' });
  await pool
    .request()
    .input('statusId', sql.Int, req.params.statusId)
    .input('id', sql.Int, req.params.id)
    .query('UPDATE ticket SET TicketStatusId = @statusId WHERE Id = @id');
  await logEvent(2, 2, row.Id, `Status changed to ${req.params.statusId}`, row.AssignedUserId);
  const updated = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM ticket WHERE Id = @id');
  res.json(await toTicketJson(updated.recordset[0]));
});

// ── Tags on Ticket ──
app.post('/api/tickets/:id/tag/:tagId', async (req, res) => {
  const userId = req.query.userId ?? 0;
  const exists = await pool
    .request()
    .input('ticketId', sql.Int, req.params.id)
    .input('tagId', sql.Int, req.params.tagId)
    .query('SELECT 1 AS x FROM ticket_tag WHERE TicketId = @ticketId AND TagId = @tagId');
  if (exists.recordset.length > 0) return res.status(400).json({ error: 'Tag already exists' });
  await pool
    .request()
    .input('ticketId', sql.Int, req.params.id)
    .input('tagId', sql.Int, req.params.tagId)
    .input('createdBy', sql.Int, userId)
    .input('createdAt', sql.DateTime2, new Date())
    .query('INSERT INTO ticket_tag (TicketId, TagId, CreatedBy, CreatedAt) VALUES (@ticketId, @tagId, @createdBy, @createdAt)');
  await logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} added`, Number(userId));
  res.json({ success: true });
});

app.delete('/api/tickets/:id/tag/:tagId', async (req, res) => {
  const userId = req.query.userId ?? 0;
  const tag = await pool
    .request()
    .input('ticketId', sql.Int, req.params.id)
    .input('tagId', sql.Int, req.params.tagId)
    .query('SELECT * FROM ticket_tag WHERE TicketId = @ticketId AND TagId = @tagId');
  if (!tag.recordset[0]) return res.status(404).json({ error: 'Not found' });
  await pool
    .request()
    .input('ticketId', sql.Int, req.params.id)
    .input('tagId', sql.Int, req.params.tagId)
    .query('DELETE FROM ticket_tag WHERE TicketId = @ticketId AND TagId = @tagId');
  await logEvent(2, 2, Number(req.params.id), `Tag ${req.params.tagId} removed`, Number(userId));
  res.json({ success: true });
});

// ── Lookup endpoints ──
app.get('/api/ticket-statuses', async (_req, res) => {
  const result = await pool.request().query('SELECT * FROM ticket_status ORDER BY OrderNo');
  res.json(result.recordset.map((r) => ({ id: r.Id, name: r.Name, isClosed: !!r.IsClosed, orderNo: r.OrderNo })));
});

app.get('/api/ticket-priorities', async (_req, res) => {
  const result = await pool.request().query('SELECT * FROM ticket_priority ORDER BY Level');
  res.json(result.recordset.map((r) => ({ id: r.Id, name: r.Name, level: r.Level })));
});

// ──────────────────────────────────────
// START
// ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API server running → http://localhost:${PORT}`);
});
