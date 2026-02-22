using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Protekh.Api.Data;
using Protekh.Api.Models;

namespace Protekh.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FirmsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FirmsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var firms = await _context.Firms.ToListAsync();
            return Ok(firms);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var firm = await _context.Firms.FindAsync(id);
            if (firm == null)
                return NotFound();
            return Ok(firm);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Firm model)
        {
            _context.Firms.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Firm model)
        {
            var firm = await _context.Firms.FindAsync(id);
            if (firm == null)
                return NotFound();

            firm.Name = model.Name;

            await _context.SaveChangesAsync();
            return Ok(firm);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var firm = await _context.Firms.FindAsync(id);
            if (firm == null)
                return NotFound();

            // Nullify firm references on tickets to avoid FK constraint violations
            var tickets = await _context.Tickets.Where(t => t.FirmId == id).ToListAsync();
            foreach (var ticket in tickets)
                ticket.FirmId = null;

            _context.Firms.Remove(firm);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
