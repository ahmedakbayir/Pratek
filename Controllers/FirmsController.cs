using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
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
            var firms = await _context.Firms
                .Include(f => f.Parent)
                .OrderBy(f => f.OrderNo)
                .ToListAsync();
            return Ok(firms);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var firm = await _context.Firms
                .Include(f => f.Parent)
                .FirstOrDefaultAsync(f => f.Id == id);
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
            firm.OrderNo = model.OrderNo;
            firm.ParentId = model.ParentId;
            firm.Version = model.Version;

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

            // Nullify firm references on users
            var users = await _context.Users.Where(u => u.FirmId == id).ToListAsync();
            foreach (var user in users)
                user.FirmId = null;

            _context.Firms.Remove(firm);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // ---- Firm Products ----

        [HttpGet("{id}/products")]
        public async Task<IActionResult> GetProducts(int id)
        {
            var products = await _context.FirmProducts
                .Where(fp => fp.FirmId == id)
                .Include(fp => fp.Product)
                .Select(fp => fp.Product)
                .ToListAsync();
            return Ok(products);
        }
    }
}
