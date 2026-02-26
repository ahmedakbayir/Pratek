using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LabelsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LabelsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var labels = await _context.Labels.ToListAsync();
            return Ok(labels);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var label = await _context.Labels.FindAsync(id);
            if (label == null)
                return NotFound();
            return Ok(label);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Label model)
        {
            _context.Labels.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Label model)
        {
            var label = await _context.Labels.FindAsync(id);
            if (label == null)
                return NotFound();

            label.Name = model.Name;
            label.Description = model.Description;
            label.ColorHex = model.ColorHex;

            await _context.SaveChangesAsync();
            return Ok(label);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var label = await _context.Labels.FindAsync(id);
            if (label == null)
                return NotFound();

            _context.Labels.Remove(label);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
