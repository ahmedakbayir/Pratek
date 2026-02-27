using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LookupsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LookupsController(AppDbContext context)
        {
            _context = context;
        }

        // ── TICKET STATUS ──
        [HttpGet("ticket-statuses")]
        public async Task<IActionResult> GetTicketStatuses()
            => Ok(await _context.TicketStatuses.OrderBy(s => s.OrderNo).ToListAsync());

        [HttpPost("ticket-statuses")]
        public async Task<IActionResult> CreateTicketStatus([FromBody] TicketStatus model)
        {
            _context.TicketStatuses.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("ticket-statuses/{id}")]
        public async Task<IActionResult> UpdateTicketStatus(int id, [FromBody] TicketStatus model)
        {
            var entity = await _context.TicketStatuses.FindAsync(id);
            if (entity == null) return NotFound();
            entity.Name = model.Name;
            entity.IsClosed = model.IsClosed;
            entity.OrderNo = model.OrderNo;
            entity.ColorHex = model.ColorHex;
            await _context.SaveChangesAsync();
            return Ok(entity);
        }

        [HttpDelete("ticket-statuses/{id}")]
        public async Task<IActionResult> DeleteTicketStatus(int id)
        {
            var entity = await _context.TicketStatuses.FindAsync(id);
            if (entity == null) return NotFound();
            _context.TicketStatuses.Remove(entity);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ── TICKET PRIORITY ──
        [HttpGet("ticket-priorities")]
        public async Task<IActionResult> GetTicketPriorities()
            => Ok(await _context.TicketPriorities.OrderBy(p => p.OrderNo).ToListAsync());

        [HttpPost("ticket-priorities")]
        public async Task<IActionResult> CreateTicketPriority([FromBody] TicketPriority model)
        {
            _context.TicketPriorities.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("ticket-priorities/{id}")]
        public async Task<IActionResult> UpdateTicketPriority(int id, [FromBody] TicketPriority model)
        {
            var entity = await _context.TicketPriorities.FindAsync(id);
            if (entity == null) return NotFound();
            entity.Name = model.Name;
            entity.OrderNo = model.OrderNo;
            entity.ColorHex = model.ColorHex;
            await _context.SaveChangesAsync();
            return Ok(entity);
        }

        [HttpDelete("ticket-priorities/{id}")]
        public async Task<IActionResult> DeleteTicketPriority(int id)
        {
            var entity = await _context.TicketPriorities.FindAsync(id);
            if (entity == null) return NotFound();
            _context.TicketPriorities.Remove(entity);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ── PRIVILEGE ──
        [HttpGet("privileges")]
        public async Task<IActionResult> GetPrivileges()
            => Ok(await _context.Privileges.OrderBy(p => p.OrderNo).ToListAsync());

        [HttpPost("privileges")]
        public async Task<IActionResult> CreatePrivilege([FromBody] Privilege model)
        {
            _context.Privileges.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("privileges/{id}")]
        public async Task<IActionResult> UpdatePrivilege(int id, [FromBody] Privilege model)
        {
            var entity = await _context.Privileges.FindAsync(id);
            if (entity == null) return NotFound();
            entity.Name = model.Name;
            entity.OrderNo = model.OrderNo;
            entity.ColorHex = model.ColorHex;
            await _context.SaveChangesAsync();
            return Ok(entity);
        }

        [HttpDelete("privileges/{id}")]
        public async Task<IActionResult> DeletePrivilege(int id)
        {
            var entity = await _context.Privileges.FindAsync(id);
            if (entity == null) return NotFound();
            _context.Privileges.Remove(entity);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ── OTHER LOOKUPS (read-only) ──
        [HttpGet("entity-event-types")]
        public async Task<IActionResult> GetEntityEventTypes()
            => Ok(await _context.EntityEventTypes.ToListAsync());

        [HttpGet("ticket-event-types")]
        public async Task<IActionResult> GetTicketEventTypes()
            => Ok(await _context.TicketEventTypes.ToListAsync());

        [HttpGet("entities")]
        public async Task<IActionResult> GetEntities()
            => Ok(await _context.Entities.ToListAsync());
    }
}
