using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TicketsController(AppDbContext context)
        {
            _context = context;
        }

        // Helper: get userId from header
        private int? GetCurrentUserId()
        {
            if (Request.Headers.TryGetValue("x-user-id", out var val) && int.TryParse(val, out var uid))
                return uid;
            return null;
        }

        // Helper: log event
        private void LogEvent(int ticketId, int eventTypeId, int? userId, string? description = null, string? oldValue = null, string? newValue = null)
        {
            _context.TicketEventHistories.Add(new TicketEventHistory
            {
                TicketId = ticketId,
                TicketEventTypeId = eventTypeId,
                ActionDate = DateTime.UtcNow,
                UserId = userId,
                Description = description,
                OldValue = oldValue,
                NewValue = newValue,
            });
        }

        // --------------------------------------------------
        // GET ALL
        // --------------------------------------------------
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var tickets = await _context.Tickets
                .Include(t => t.Firm)
                .Include(t => t.AssignedUser)
                .Include(t => t.CreatedUser)
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.Product)
                .OrderByDescending(t => t.Id)
                .ToListAsync();

            return Ok(tickets);
        }

        // --------------------------------------------------
        // GET BY ID
        // --------------------------------------------------
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var ticket = await _context.Tickets
                .Include(t => t.Firm)
                .Include(t => t.AssignedUser)
                .Include(t => t.CreatedUser)
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.Product)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ticket == null)
                return NotFound();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // CREATE
        // --------------------------------------------------
        [HttpPost]
        public async Task<IActionResult> Create(Ticket model)
        {
            _context.Tickets.Add(model);
            await _context.SaveChangesAsync();

            // 1 = TicketCreated
            LogEvent(model.Id, 1, model.CreatedUserId, $"Ticket oluşturuldu: {model.Title}");
            await _context.SaveChangesAsync();

            var created = await _context.Tickets
                .Include(t => t.Firm)
                .Include(t => t.AssignedUser)
                .Include(t => t.CreatedUser)
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.Product)
                .FirstOrDefaultAsync(t => t.Id == model.Id);

            return Ok(created);
        }

        // --------------------------------------------------
        // UPDATE (granular field-change detection)
        // --------------------------------------------------
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Ticket model)
        {
            var ticket = await _context.Tickets
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.AssignedUser)
                .Include(t => t.Firm)
                .Include(t => t.Product)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (ticket == null)
                return NotFound();

            var userId = model.CreatedUserId ?? GetCurrentUserId();
            var hasGeneralUpdate = false;

            // --- Status change ---
            if (model.StatusId != ticket.StatusId)
            {
                var oldStatusName = ticket.Status?.Name ?? ticket.StatusId?.ToString();
                var newStatus = model.StatusId.HasValue
                    ? await _context.TicketStatuses.FindAsync(model.StatusId.Value)
                    : null;
                var newStatusName = newStatus?.Name ?? model.StatusId?.ToString();

                // Check for close/reopen
                var oldIsClosed = ticket.Status?.IsClosed == true;
                var newIsClosed = newStatus?.IsClosed == true;

                if (!oldIsClosed && newIsClosed)
                {
                    // 4 = TicketClosed
                    LogEvent(ticket.Id, 4, userId, "Ticket kapatıldı", oldStatusName, newStatusName);
                }
                else if (oldIsClosed && !newIsClosed)
                {
                    // 12 = TicketReopened
                    LogEvent(ticket.Id, 12, userId, "Ticket yeniden açıldı", oldStatusName, newStatusName);
                }
                else
                {
                    // 5 = TicketStatusChanged
                    LogEvent(ticket.Id, 5, userId, "Durum değiştirildi", oldStatusName, newStatusName);
                }
            }

            // --- Priority change ---
            if (model.PriorityId != ticket.PriorityId)
            {
                var oldPriorityName = ticket.Priority?.Name ?? ticket.PriorityId?.ToString();
                var newPriority = model.PriorityId.HasValue
                    ? await _context.TicketPriorities.FindAsync(model.PriorityId.Value)
                    : null;
                var newPriorityName = newPriority?.Name ?? model.PriorityId?.ToString();

                // 6 = TicketPriorityChanged
                LogEvent(ticket.Id, 6, userId, "Öncelik değiştirildi", oldPriorityName, newPriorityName);
            }

            // --- Assigned user change ---
            if (model.AssignedUserId != ticket.AssignedUserId)
            {
                if (model.AssignedUserId.HasValue && model.AssignedUserId.Value > 0)
                {
                    var oldUserName = ticket.AssignedUser?.Name ?? ticket.AssignedUserId?.ToString();
                    var newUser = await _context.Users.FindAsync(model.AssignedUserId.Value);
                    var newUserName = newUser?.Name ?? model.AssignedUserId?.ToString();

                    // 3 = TicketAssigned
                    LogEvent(ticket.Id, 3, userId, "Ticket atandı", oldUserName, newUserName);
                }
                else if (ticket.AssignedUserId.HasValue)
                {
                    var oldUserName = ticket.AssignedUser?.Name ?? ticket.AssignedUserId?.ToString();
                    // 11 = TicketUnassigned
                    LogEvent(ticket.Id, 11, userId, "Atama kaldırıldı", oldUserName, null);
                }
            }

            // --- General field changes (title, content, firm, product, dueDate, scope) ---
            if (model.Title != ticket.Title) hasGeneralUpdate = true;
            if (model.Content != ticket.Content) hasGeneralUpdate = true;
            if (model.FirmId != ticket.FirmId) hasGeneralUpdate = true;
            if (model.ProductId != ticket.ProductId) hasGeneralUpdate = true;
            if (model.DueDate != ticket.DueDate) hasGeneralUpdate = true;
            if (model.Scope != ticket.Scope) hasGeneralUpdate = true;

            if (hasGeneralUpdate)
            {
                // 2 = TicketUpdated
                LogEvent(ticket.Id, 2, userId, "Ticket güncellendi");
            }

            // Apply all field updates
            ticket.Title = model.Title;
            ticket.Content = model.Content;
            ticket.PriorityId = model.PriorityId;
            ticket.StatusId = model.StatusId;
            ticket.FirmId = model.FirmId;
            ticket.AssignedUserId = model.AssignedUserId;
            ticket.ProductId = model.ProductId;
            ticket.DueDate = model.DueDate;
            ticket.Scope = model.Scope;

            await _context.SaveChangesAsync();

            var updated = await _context.Tickets
                .Include(t => t.Firm)
                .Include(t => t.AssignedUser)
                .Include(t => t.CreatedUser)
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.Product)
                .FirstOrDefaultAsync(t => t.Id == id);

            return Ok(updated);
        }

        // --------------------------------------------------
        // GET COMMENTS
        // --------------------------------------------------
        [HttpGet("{id}/comments")]
        public async Task<IActionResult> GetComments(int id)
        {
            var comments = await _context.TicketComments
                .Where(c => c.TicketId == id)
                .Include(c => c.User)
                .OrderByDescending(c => c.ActionDate)
                .ToListAsync();

            return Ok(comments);
        }

        // --------------------------------------------------
        // ADD COMMENT
        // --------------------------------------------------
        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(int id, TicketComment model)
        {
            model.TicketId = id;
            model.ActionDate = DateTime.UtcNow;

            _context.TicketComments.Add(model);
            await _context.SaveChangesAsync();

            // 9 = TicketCommentAdded
            LogEvent(id, 9, model.UserId, "Yorum eklendi");
            await _context.SaveChangesAsync();

            await _context.Entry(model).Reference(c => c.User).LoadAsync();
            return Ok(model);
        }

        // --------------------------------------------------
        // REMOVE COMMENT
        // --------------------------------------------------
        [HttpDelete("{ticketId}/comments/{commentId}")]
        public async Task<IActionResult> RemoveComment(int ticketId, int commentId)
        {
            var comment = await _context.TicketComments
                .FirstOrDefaultAsync(c => c.Id == commentId && c.TicketId == ticketId);
            if (comment == null)
                return NotFound();

            var userId = GetCurrentUserId() ?? comment.UserId;
            _context.TicketComments.Remove(comment);

            // 10 = TicketCommentRemoved
            LogEvent(ticketId, 10, userId, "Yorum silindi");
            await _context.SaveChangesAsync();

            return Ok();
        }

        // --------------------------------------------------
        // ASSIGN
        // --------------------------------------------------
        [HttpPost("{id}/assign/{userId}")]
        public async Task<IActionResult> Assign(int id, int userId)
        {
            var ticket = await _context.Tickets
                .Include(t => t.AssignedUser)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null)
                return NotFound();

            var oldUserName = ticket.AssignedUser?.Name ?? ticket.AssignedUserId?.ToString();
            ticket.AssignedUserId = userId;

            var newUser = await _context.Users.FindAsync(userId);
            var newUserName = newUser?.Name ?? userId.ToString();

            // 3 = TicketAssigned
            LogEvent(ticket.Id, 3, GetCurrentUserId() ?? userId, "Ticket atandı", oldUserName, newUserName);
            await _context.SaveChangesAsync();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // UNASSIGN
        // --------------------------------------------------
        [HttpPost("{id}/unassign")]
        public async Task<IActionResult> Unassign(int id)
        {
            var ticket = await _context.Tickets
                .Include(t => t.AssignedUser)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null)
                return NotFound();

            var oldUserName = ticket.AssignedUser?.Name ?? ticket.AssignedUserId?.ToString();
            ticket.AssignedUserId = null;

            // 11 = TicketUnassigned
            LogEvent(ticket.Id, 11, GetCurrentUserId(), "Atama kaldırıldı", oldUserName, null);
            await _context.SaveChangesAsync();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // CHANGE STATUS
        // --------------------------------------------------
        [HttpPost("{id}/status/{statusId}")]
        public async Task<IActionResult> ChangeStatus(int id, int statusId)
        {
            var ticket = await _context.Tickets
                .Include(t => t.Status)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null)
                return NotFound();

            var oldStatusName = ticket.Status?.Name ?? ticket.StatusId?.ToString();
            var oldIsClosed = ticket.Status?.IsClosed == true;

            var newStatus = await _context.TicketStatuses.FindAsync(statusId);
            var newStatusName = newStatus?.Name ?? statusId.ToString();
            var newIsClosed = newStatus?.IsClosed == true;

            ticket.StatusId = statusId;

            var currentUserId = GetCurrentUserId() ?? ticket.AssignedUserId;

            if (!oldIsClosed && newIsClosed)
            {
                // 4 = TicketClosed
                LogEvent(ticket.Id, 4, currentUserId, "Ticket kapatıldı", oldStatusName, newStatusName);
            }
            else if (oldIsClosed && !newIsClosed)
            {
                // 12 = TicketReopened
                LogEvent(ticket.Id, 12, currentUserId, "Ticket yeniden açıldı", oldStatusName, newStatusName);
            }
            else
            {
                // 5 = TicketStatusChanged
                LogEvent(ticket.Id, 5, currentUserId, "Durum değiştirildi", oldStatusName, newStatusName);
            }

            await _context.SaveChangesAsync();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // ADD LABEL
        // --------------------------------------------------
        [HttpPost("{id}/label/{labelId}")]
        public async Task<IActionResult> AddLabel(int id, int labelId, int userId)
        {
            var label = await _context.Labels.FindAsync(labelId);
            var labelName = label?.Name ?? labelId.ToString();

            _context.TicketLabelHistories.Add(new TicketLabelHistory
            {
                TicketId = id,
                LabelId = labelId,
                UserId = userId,
                ActionType = true,
                ActionDate = DateTime.UtcNow
            });

            // 7 = TicketLabelAdded
            LogEvent(id, 7, userId, "Etiket eklendi", null, labelName);
            await _context.SaveChangesAsync();

            return Ok();
        }

        // --------------------------------------------------
        // REMOVE LABEL
        // --------------------------------------------------
        [HttpDelete("{id}/label/{labelId}")]
        public async Task<IActionResult> RemoveLabel(int id, int labelId, int userId)
        {
            var label = await _context.Labels.FindAsync(labelId);
            var labelName = label?.Name ?? labelId.ToString();

            _context.TicketLabelHistories.Add(new TicketLabelHistory
            {
                TicketId = id,
                LabelId = labelId,
                UserId = userId,
                ActionType = false,
                ActionDate = DateTime.UtcNow
            });

            // 8 = TicketLabelRemoved
            LogEvent(id, 8, userId, "Etiket kaldırıldı", labelName, null);
            await _context.SaveChangesAsync();

            return Ok();
        }

        // --------------------------------------------------
        // GET EVENT HISTORY (unified timeline)
        // --------------------------------------------------
        [HttpGet("{id}/activity")]
        public async Task<IActionResult> GetActivity(int id)
        {
            // 1) TicketEventHistory
            var events = await _context.TicketEventHistories
                .Where(e => e.TicketId == id)
                .Include(e => e.TicketEventType)
                .Include(e => e.User)
                .OrderByDescending(e => e.ActionDate)
                .ToListAsync();

            // 2) TicketComments (active only)
            var comments = await _context.TicketComments
                .Where(c => c.TicketId == id && c.Inactive != true)
                .Include(c => c.User)
                .OrderByDescending(c => c.ActionDate)
                .ToListAsync();

            // 3) TicketLabelHistory
            var labelHistory = await _context.TicketLabelHistories
                .Where(lh => lh.TicketId == id)
                .Include(lh => lh.Label)
                .Include(lh => lh.User)
                .OrderByDescending(lh => lh.ActionDate)
                .ToListAsync();

            // Build unified timeline
            var timeline = new List<object>();

            foreach (var e in events)
            {
                timeline.Add(new
                {
                    type = "event",
                    id = e.Id,
                    actionDate = e.ActionDate,
                    eventType = e.TicketEventType?.Name,
                    eventTypeId = e.TicketEventTypeId,
                    description = e.Description,
                    oldValue = e.OldValue,
                    newValue = e.NewValue,
                    user = e.User != null ? new { e.User.Id, e.User.Name, e.User.AvatarUrl } : null,
                });
            }

            foreach (var c in comments)
            {
                timeline.Add(new
                {
                    type = "comment",
                    id = c.Id,
                    actionDate = c.ActionDate,
                    eventType = "TicketCommentAdded",
                    eventTypeId = 9,
                    description = c.Content,
                    oldValue = (string?)null,
                    newValue = (string?)null,
                    user = c.User != null ? new { c.User.Id, c.User.Name, c.User.AvatarUrl } : null,
                });
            }

            foreach (var lh in labelHistory)
            {
                timeline.Add(new
                {
                    type = "label",
                    id = lh.Id,
                    actionDate = lh.ActionDate,
                    eventType = lh.ActionType == true ? "TicketLabelAdded" : "TicketLabelRemoved",
                    eventTypeId = lh.ActionType == true ? 7 : 8,
                    description = lh.ActionType == true
                        ? $"Etiket eklendi: {lh.Label?.Name}"
                        : $"Etiket kaldırıldı: {lh.Label?.Name}",
                    oldValue = lh.ActionType == true ? (string?)null : lh.Label?.Name,
                    newValue = lh.ActionType == true ? lh.Label?.Name : (string?)null,
                    user = lh.User != null ? new { lh.User.Id, lh.User.Name, lh.User.AvatarUrl } : null,
                });
            }

            var sorted = timeline
                .OrderByDescending(x => ((dynamic)x).actionDate)
                .ToList();

            return Ok(sorted);
        }

        // --------------------------------------------------
        // DELETE
        // --------------------------------------------------
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound();

            var userId = GetCurrentUserId();

            // 13 = TicketDeleted - log before deleting
            LogEvent(ticket.Id, 13, userId, $"Ticket silindi: {ticket.Title}");

            // Remove related records first to avoid FK constraint violations
            var ticketComments = _context.TicketComments.Where(c => c.TicketId == id);
            _context.TicketComments.RemoveRange(ticketComments);

            var ticketLabelHistories = _context.TicketLabelHistories.Where(lh => lh.TicketId == id);
            _context.TicketLabelHistories.RemoveRange(ticketLabelHistories);

            var ticketEventHistories = _context.TicketEventHistories.Where(e => e.TicketId == id);
            _context.TicketEventHistories.RemoveRange(ticketEventHistories);

            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
