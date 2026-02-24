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
                .OrderBy(p => p.Level)
                .ToListAsync();
            return Ok(priorities);
        }

        [HttpGet("event-types")]
        public async Task<IActionResult> GetEventTypes()
        {
            var types = await _context.EventTypes.ToListAsync();
            return Ok(types);
        }

        [HttpGet("entity-types")]
        public async Task<IActionResult> GetEntityTypes()
        {
            var types = await _context.EntityTypes.ToListAsync();
            return Ok(types);
        }

        [HttpGet("yetkiler")]
        public async Task<IActionResult> GetYetkiler()
        {
            var yetkiler = await _context.Yetkiler.ToListAsync();
            return Ok(yetkiler);
        }
    }
}
