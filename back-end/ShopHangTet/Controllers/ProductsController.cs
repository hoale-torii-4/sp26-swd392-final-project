using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.Models;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly ShopHangTetDbContext _context;

        public ProductsController(ShopHangTetDbContext context) => _context = context;

        [HttpGet("items")]
        public async Task<IActionResult> GetItems() 
        {
            var items = await _context.Items
                .Where(x => x.IsActive)
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("gift-boxes")]
        public async Task<IActionResult> GetGiftBoxes()
        {
            var giftBoxes = await _context.GiftBoxes
                .Where(x => x.IsActive)
                .ToListAsync();
            return Ok(giftBoxes);
        }

        [HttpGet("collections")]
        public async Task<IActionResult> GetCollections()
        {
            var collections = await _context.Collections
                .Where(x => x.IsActive)
                .ToListAsync();
            return Ok(collections);
        }
    }
}