using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _context.Users
                .Include(u => u.Firm)
                .Include(u => u.Privilege)
                .OrderBy(u => u.OrderNo)
                .ToListAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var user = await _context.Users
                .Include(u => u.Firm)
                .Include(u => u.Privilege)
                .FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return NotFound();
            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create(User model)
        {
            _context.Users.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, User model)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            user.Name = model.Name;
            user.Mail = model.Mail;
            user.Gsm = model.Gsm;
            user.Password = model.Password;
            user.FirmId = model.FirmId;
            user.PrivilegeId = model.PrivilegeId;
            user.OrderNo = model.OrderNo;

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            // Nullify user references on tickets to avoid FK constraint violations
            var assignedTickets = await _context.Tickets
                .Where(t => t.AssignedUserId == id)
                .ToListAsync();
            foreach (var ticket in assignedTickets)
                ticket.AssignedUserId = null;

            var createdTickets = await _context.Tickets
                .Where(t => t.CreatedUserId == id)
                .ToListAsync();
            foreach (var ticket in createdTickets)
                ticket.CreatedUserId = null;

            // Remove comments by this user (UserId is non-nullable)
            var comments = _context.TicketComments.Where(c => c.UserId == id);
            _context.TicketComments.RemoveRange(comments);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
