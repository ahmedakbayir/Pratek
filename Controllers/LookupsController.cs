using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;

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

        [HttpGet("ticket-statuses")]
        public async Task<IActionResult> GetTicketStatuses()
        {
            var statuses = await _context.TicketStatuses
                .OrderBy(s => s.OrderNo)
                .ToListAsync();
            return Ok(statuses);
        }

        [HttpGet("ticket-priorities")]
        public async Task<IActionResult> GetTicketPriorities()
        {
            var priorities = await _context.TicketPriorities
                .OrderBy(p => p.OrderNo)
                .ToListAsync();
            return Ok(priorities);
        }

        [HttpGet("entity-event-types")]
        public async Task<IActionResult> GetEntityEventTypes()
        {
            var types = await _context.EntityEventTypes.ToListAsync();
            return Ok(types);
        }

        [HttpGet("ticket-event-types")]
        public async Task<IActionResult> GetTicketEventTypes()
        {
            var types = await _context.TicketEventTypes.ToListAsync();
            return Ok(types);
        }

        [HttpGet("entities")]
        public async Task<IActionResult> GetEntities()
        {
            var entities = await _context.Entities.ToListAsync();
            return Ok(entities);
        }

        [HttpGet("privileges")]
        public async Task<IActionResult> GetPrivileges()
        {
            var privileges = await _context.Privileges
                .OrderBy(p => p.OrderNo)
                .ToListAsync();
            return Ok(privileges);
        }
    }
}
