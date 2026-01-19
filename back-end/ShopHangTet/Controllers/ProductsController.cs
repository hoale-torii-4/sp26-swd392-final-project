using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ShopHangTetDbContext _context;

    public ProductsController(ShopHangTetDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll() 
    {
        var products = await _context.Products.ToListAsync();
        return Ok(products);
    }
}