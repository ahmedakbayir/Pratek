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

            // TICKET EVENT HISTORY
            _context.TicketEventHistories.Add(new TicketEventHistory
            {
                TicketId = model.Id,
                TicketEventTypeId = 1, // Created
                ActionDate = DateTime.UtcNow,
                Description = $"Ticket created: {model.Title}",
                UserId = model.CreatedUserId
            });

            await _context.SaveChangesAsync();

            // Reload with navigation properties
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
        // UPDATE
        // --------------------------------------------------
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Ticket model)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound();

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

            _context.TicketEventHistories.Add(new TicketEventHistory
            {
                TicketId = ticket.Id,
                TicketEventTypeId = 2, // Updated
                ActionDate = DateTime.UtcNow,
                Description = $"Ticket updated: {ticket.Title}",
                UserId = model.CreatedUserId
            });

            await _context.SaveChangesAsync();

            // Reload with navigation properties
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

            _context.TicketEventHistories.Add(new TicketEventHistory
            {
                TicketId = id,
                TicketEventTypeId = 2, // Updated
                ActionDate = DateTime.UtcNow,
                Description = "Comment added",
                UserId = model.UserId
            });

            await _context.SaveChangesAsync();

            await _context.Entry(model).Reference(c => c.User).LoadAsync();
            return Ok(model);
        }

        // --------------------------------------------------
        // ASSIGN
        // --------------------------------------------------
        [HttpPost("{id}/assign/{userId}")]
        public async Task<IActionResult> Assign(int id, int userId)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound();

            var oldValue = ticket.AssignedUserId?.ToString();
            ticket.AssignedUserId = userId;

            await _context.SaveChangesAsync();

            _context.TicketEventHistories.Add(new TicketEventHistory
            {
                TicketId = ticket.Id,
                TicketEventTypeId = 4, // Assigned
                ActionDate = DateTime.UtcNow,
                Description = $"Assigned to user {userId}",
                OldValue = oldValue,
                NewValue = userId.ToString(),
                UserId = userId
            });

            await _context.SaveChangesAsync();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // CHANGE STATUS
        // --------------------------------------------------
        [HttpPost("{id}/status/{statusId}")]
        public async Task<IActionResult> ChangeStatus(int id, int statusId)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null)
                return NotFound();

            var oldValue = ticket.StatusId?.ToString();
            ticket.StatusId = statusId;

            await _context.SaveChangesAsync();

            _context.TicketEventHistories.Add(new TicketEventHistory
            {
                TicketId = ticket.Id,
                TicketEventTypeId = 3, // StatusChanged
                ActionDate = DateTime.UtcNow,
                Description = $"Status changed to {statusId}",
                OldValue = oldValue,
                NewValue = statusId.ToString(),
                UserId = ticket.AssignedUserId
            });

            await _context.SaveChangesAsync();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // ADD LABEL
        // --------------------------------------------------
        [HttpPost("{id}/label/{labelId}")]
        public async Task<IActionResult> AddLabel(int id, int labelId, int userId)
        {
            _context.TicketLabelHistories.Add(new TicketLabelHistory
            {
                TicketId = id,
                LabelId = labelId,
                UserId = userId,
                ActionType = true, // added
                ActionDate = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok();
        }

        // --------------------------------------------------
        // REMOVE LABEL
        // --------------------------------------------------
        [HttpDelete("{id}/label/{labelId}")]
        public async Task<IActionResult> RemoveLabel(int id, int labelId, int userId)
        {
            _context.TicketLabelHistories.Add(new TicketLabelHistory
            {
                TicketId = id,
                LabelId = labelId,
                UserId = userId,
                ActionType = false, // removed
                ActionDate = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok();
        }

        // --------------------------------------------------
        // GET EVENT HISTORY
        // --------------------------------------------------
        [HttpGet("{id}/activity")]
        public async Task<IActionResult> GetActivity(int id)
        {
            var history = await _context.TicketEventHistories
                .Where(e => e.TicketId == id)
                .Include(e => e.TicketEventType)
                .Include(e => e.User)
                .OrderByDescending(e => e.ActionDate)
                .ToListAsync();

            return Ok(history);
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

            // Remove related records first to avoid FK constraint violations
            var ticketComments = _context.TicketComments.Where(c => c.TicketId == id);
            _context.TicketComments.RemoveRange(ticketComments);

            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
