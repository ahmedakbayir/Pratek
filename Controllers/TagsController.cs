using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Protekh.Api.Data;
using Protekh.Api.Models;

namespace Protekh.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TagsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TagsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var tags = await _context.Tags.ToListAsync();
            return Ok(tags);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound();
            return Ok(tag);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Tag model)
        {
            _context.Tags.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Tag model)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound();

            tag.Name = model.Name;
            tag.Description = model.Description;
            tag.ColorHex = model.ColorHex;

            await _context.SaveChangesAsync();
            return Ok(tag);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound();

            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
