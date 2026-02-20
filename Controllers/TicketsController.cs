using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Protekh.Api.Data;
using Protekh.Api.Models;

namespace Protekh.Api.Controllers
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