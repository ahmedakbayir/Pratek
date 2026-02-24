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
            var users = await _context.Users.ToListAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var user = await _context.Users.FindAsync(id);
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
            user.Tel = model.Tel;
            user.RoleId = model.RoleId;

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
            var tickets = await _context.Tickets
                .Where(t => t.AssignedUserId == id)
                .ToListAsync();
            foreach (var ticket in tickets)
                ticket.AssignedUserId = null;

            // Remove comments by this user (UserId is non-nullable)
            var comments = _context.TicketComments.Where(c => c.UserId == id);
            _context.TicketComments.RemoveRange(comments);

            // Nullify user references on event logs
            var eventLogs = await _context.EventLogs
                .Where(e => e.UserId == id)
                .ToListAsync();
            foreach (var log in eventLogs)
                log.UserId = null;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
