using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using Pratek.Models;

namespace Pratek.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var products = await _context.Products
                .Include(p => p.Manager)
                .Include(p => p.FirmProducts!)
                    .ThenInclude(fp => fp.Firm)
                .OrderBy(p => p.OrderNo)
                .ToListAsync();
            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var product = await _context.Products
                .Include(p => p.Manager)
                .Include(p => p.FirmProducts!)
                    .ThenInclude(fp => fp.Firm)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound();
            return Ok(product);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Product model)
        {
            _context.Products.Add(model);
            await _context.SaveChangesAsync();

            var product = await _context.Products
                .Include(p => p.Manager)
                .FirstOrDefaultAsync(p => p.Id == model.Id);
            return Ok(product);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Product model)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            product.Name = model.Name;
            product.ManagerId = model.ManagerId;
            product.OrderNo = model.OrderNo;
            product.AvatarUrl = model.AvatarUrl;

            await _context.SaveChangesAsync();

            var updated = await _context.Products
                .Include(p => p.Manager)
                .Include(p => p.FirmProducts!)
                    .ThenInclude(fp => fp.Firm)
                .FirstOrDefaultAsync(p => p.Id == id);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // ---- Firm-Product many-to-many endpoints ----

        [HttpPost("{id}/firms/{firmId}")]
        public async Task<IActionResult> AddFirm(int id, int firmId)
        {
            var exists = await _context.FirmProducts
                .AnyAsync(fp => fp.ProductId == id && fp.FirmId == firmId);
            if (exists)
                return BadRequest("Bu firma zaten bu ürüne eklenmiş.");

            _context.FirmProducts.Add(new FirmProduct { ProductId = id, FirmId = firmId });
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("{id}/firms/{firmId}")]
        public async Task<IActionResult> RemoveFirm(int id, int firmId)
        {
            var fp = await _context.FirmProducts
                .FirstOrDefaultAsync(fp => fp.ProductId == id && fp.FirmId == firmId);
            if (fp == null)
                return NotFound();

            _context.FirmProducts.Remove(fp);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
