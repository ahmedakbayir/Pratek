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
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.TicketTags).ThenInclude(tt => tt.Tag)
                .OrderByDescending(t => t.CreatedAt)
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
                .Include(t => t.Status)
                .Include(t => t.Priority)
                .Include(t => t.TicketTags).ThenInclude(tt => tt.Tag)
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
            model.CreatedAt = DateTime.UtcNow;

            _context.Tickets.Add(model);
            await _context.SaveChangesAsync();

            // EVENT LOG
            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2, // Ticket
                EventTypeId = 1,  // Created
                EntityId = model.Id,
                Description = $"Ticket created: {model.Title}",
                UserId = model.CreatedBy
            });

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            var created = await _context.Tickets
                .Include(t => t.Firm)
                .Include(t => t.AssignedUser)
                .Include(t => t.Status)
                .Include(t => t.Priority)
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
            ticket.Description = model.Description;
            ticket.TicketPriorityId = model.TicketPriorityId;
            ticket.TicketStatusId = model.TicketStatusId;
            ticket.FirmId = model.FirmId;
            ticket.AssignedUserId = model.AssignedUserId;
            ticket.UpdatedAt = DateTime.UtcNow;
            ticket.UpdatedBy = model.UpdatedBy;

            await _context.SaveChangesAsync();

            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2,
                EventTypeId = 2,
                EntityId = ticket.Id,
                Description = $"Ticket updated: {ticket.Title}",
                UserId = model.UpdatedBy
            });

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            var updated = await _context.Tickets
                .Include(t => t.Firm)
                .Include(t => t.AssignedUser)
                .Include(t => t.Status)
                .Include(t => t.Priority)
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
                .OrderByDescending(c => c.CreatedAt)
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
            model.CreatedAt = DateTime.UtcNow;

            _context.TicketComments.Add(model);
            await _context.SaveChangesAsync();

            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2,
                EventTypeId = 2,
                EntityId = id,
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

            ticket.AssignedUserId = userId;

            await _context.SaveChangesAsync();

            // EVENT LOG
            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2, // Ticket
                EventTypeId = 3,  // Assigned
                EntityId = ticket.Id,
                Description = $"Assigned to user {userId}",
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

            ticket.TicketStatusId = statusId;

            await _context.SaveChangesAsync();

            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2, // Ticket
                EventTypeId = 2,  // Updated
                EntityId = ticket.Id,
                Description = $"Status changed to {statusId}",
                UserId = ticket.AssignedUserId
            });

            await _context.SaveChangesAsync();

            return Ok(ticket);
        }

        // --------------------------------------------------
        // ADD TAG
        // --------------------------------------------------
        [HttpPost("{id}/tag/{tagId}")]
        public async Task<IActionResult> AddTag(int id, int tagId, int userId)
        {
            var exists = await _context.TicketTags
                .AnyAsync(x => x.TicketId == id && x.TagId == tagId);

            if (exists)
                return BadRequest("Tag already exists");

            _context.TicketTags.Add(new TicketTag
            {
                TicketId = id,
                TagId = tagId,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2,
                EventTypeId = 2,
                EntityId = id,
                Description = $"Tag {tagId} added",
                UserId = userId
            });

            await _context.SaveChangesAsync();

            return Ok();
        }

        // --------------------------------------------------
        // REMOVE TAG
        // --------------------------------------------------
        [HttpDelete("{id}/tag/{tagId}")]
        public async Task<IActionResult> RemoveTag(int id, int tagId, int userId)
        {
            var tag = await _context.TicketTags
                .FirstOrDefaultAsync(x => x.TicketId == id && x.TagId == tagId);

            if (tag == null)
                return NotFound();

            _context.TicketTags.Remove(tag);
            await _context.SaveChangesAsync();

            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2,
                EventTypeId = 2,
                EntityId = id,
                Description = $"Tag {tagId} removed",
                UserId = userId
            });

            await _context.SaveChangesAsync();

            return Ok();
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
            var ticketTags = _context.TicketTags.Where(tt => tt.TicketId == id);
            _context.TicketTags.RemoveRange(ticketTags);

            var ticketComments = _context.TicketComments.Where(c => c.TicketId == id);
            _context.TicketComments.RemoveRange(ticketComments);

            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();

            _context.EventLogs.Add(new EventLog
            {
                EntityTypeId = 2,
                EventTypeId = 4, // Deleted
                EntityId = id,
                Description = "Ticket deleted"
            });

            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}