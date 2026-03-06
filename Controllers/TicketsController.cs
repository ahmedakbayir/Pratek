using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
{
    // DTO for unified activity timeline
    public class ActivityItem
    {
        public string Type { get; set; } = "event";
        public int Id { get; set; }
        public DateTime ActionDate { get; set; }
        public string? EventType { get; set; }
        public int EventTypeId { get; set; }
        public string? Description { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public ActivityUser? User { get; set; }
    }

    public class ActivityUser
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? AvatarUrl { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class TicketsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TicketsController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            if (Request.Headers.TryGetValue("x-user-id", out var val) && int.TryParse(val, out var uid))
                return uid;
            return null;
        }

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
        // SEARCH
        // --------------------------------------------------
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? q)
        {
            var query = _context.Tickets
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                query = query.Where(t =>
                    (t.Title != null && t.Title.Contains(q)) ||
                    t.Id.ToString() == q);
            }

            var tickets = await query
                .OrderByDescending(t => t.Id)
                .Take(50)
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

                var oldIsClosed = ticket.Status?.IsClosed == true;
                var newIsClosed = newStatus?.IsClosed == true;

                if (!oldIsClosed && newIsClosed)
                    LogEvent(ticket.Id, 4, userId, "Ticket kapatıldı", oldStatusName, newStatusName);
                else if (oldIsClosed && !newIsClosed)
                    LogEvent(ticket.Id, 12, userId, "Ticket yeniden açıldı", oldStatusName, newStatusName);
                else
                    LogEvent(ticket.Id, 5, userId, "Durum değiştirildi", oldStatusName, newStatusName);
            }

            // --- Priority change ---
            if (model.PriorityId != ticket.PriorityId)
            {
                var oldPriorityName = ticket.Priority?.Name ?? ticket.PriorityId?.ToString();
                var newPriority = model.PriorityId.HasValue
                    ? await _context.TicketPriorities.FindAsync(model.PriorityId.Value)
                    : null;
                var newPriorityName = newPriority?.Name ?? model.PriorityId?.ToString();
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
                    LogEvent(ticket.Id, 3, userId, "Ticket atandı", oldUserName, newUserName);
                }
                else if (ticket.AssignedUserId.HasValue)
                {
                    var oldUserName = ticket.AssignedUser?.Name ?? ticket.AssignedUserId?.ToString();
                    LogEvent(ticket.Id, 11, userId, "Atama kaldırıldı", oldUserName, null);
                }
            }

            // --- General field changes ---
            if (model.Title != ticket.Title) hasGeneralUpdate = true;
            if (model.Content != ticket.Content) hasGeneralUpdate = true;
            if (model.FirmId != ticket.FirmId) hasGeneralUpdate = true;
            if (model.ProductId != ticket.ProductId) hasGeneralUpdate = true;
            if (model.DueDate != ticket.DueDate) hasGeneralUpdate = true;
            if (model.Scope != ticket.Scope) hasGeneralUpdate = true;

            if (hasGeneralUpdate)
                LogEvent(ticket.Id, 2, userId, "Ticket güncellendi");

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
                LogEvent(ticket.Id, 4, currentUserId, "Ticket kapatıldı", oldStatusName, newStatusName);
            else if (oldIsClosed && !newIsClosed)
                LogEvent(ticket.Id, 12, currentUserId, "Ticket yeniden açıldı", oldStatusName, newStatusName);
            else
                LogEvent(ticket.Id, 5, currentUserId, "Durum değiştirildi", oldStatusName, newStatusName);

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
        // GET ACTIVITY (unified timeline)
        // --------------------------------------------------
        [HttpGet("{id}/activity")]
        public async Task<IActionResult> GetActivity(int id)
        {
            var timeline = new List<ActivityItem>();

            // 1) TicketEventHistory - exclude types covered by dedicated tables
            var events = await _context.TicketEventHistories
                .Where(e => e.TicketId == id
                    && e.TicketEventTypeId != 7
                    && e.TicketEventTypeId != 8
                    && e.TicketEventTypeId != 9)
                .Include(e => e.TicketEventType)
                .Include(e => e.User)
                .ToListAsync();

            foreach (var e in events)
            {
                timeline.Add(new ActivityItem
                {
                    Type = "event",
                    Id = e.Id,
                    ActionDate = e.ActionDate ?? DateTime.MinValue,
                    EventType = e.TicketEventType?.Name,
                    EventTypeId = e.TicketEventTypeId ?? 0,
                    Description = e.Description,
                    OldValue = e.OldValue,
                    NewValue = e.NewValue,
                    User = e.User != null ? new ActivityUser { Id = e.User.Id, Name = e.User.Name, AvatarUrl = e.User.AvatarUrl } : null,
                });
            }

            // 2) TicketComments (active only)
            var comments = await _context.TicketComments
                .Where(c => c.TicketId == id && (c.Inactive == null || c.Inactive == false))
                .Include(c => c.User)
                .ToListAsync();

            foreach (var c in comments)
            {
                timeline.Add(new ActivityItem
                {
                    Type = "comment",
                    Id = c.Id,
                    ActionDate = c.ActionDate,
                    EventType = "TicketCommentAdded",
                    EventTypeId = 9,
                    Description = c.Content,
                    User = c.User != null ? new ActivityUser { Id = c.User.Id, Name = c.User.Name, AvatarUrl = c.User.AvatarUrl } : null,
                });
            }

            // 3) TicketLabelHistory
            var labelHistory = await _context.TicketLabelHistories
                .Where(lh => lh.TicketId == id)
                .Include(lh => lh.Label)
                .Include(lh => lh.User)
                .ToListAsync();

            foreach (var lh in labelHistory)
            {
                var isAdded = lh.ActionType == true;
                timeline.Add(new ActivityItem
                {
                    Type = "label",
                    Id = lh.Id,
                    ActionDate = lh.ActionDate ?? DateTime.MinValue,
                    EventType = isAdded ? "TicketLabelAdded" : "TicketLabelRemoved",
                    EventTypeId = isAdded ? 7 : 8,
                    Description = isAdded ? $"Etiket eklendi: {lh.Label?.Name}" : $"Etiket kaldırıldı: {lh.Label?.Name}",
                    OldValue = isAdded ? null : lh.Label?.Name,
                    NewValue = isAdded ? lh.Label?.Name : null,
                    User = lh.User != null ? new ActivityUser { Id = lh.User.Id, Name = lh.User.Name, AvatarUrl = lh.User.AvatarUrl } : null,
                });
            }

            // Sort by date descending
            timeline.Sort((a, b) => b.ActionDate.CompareTo(a.ActionDate));

            return Ok(timeline);
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

            // 13 = TicketDeleted
            LogEvent(ticket.Id, 13, userId, $"Ticket silindi: {ticket.Title}");

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
