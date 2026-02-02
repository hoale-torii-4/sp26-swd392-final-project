using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using ShopHangTet.Models;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ShopHangTetDbContext _context;

    public ProductsController(ShopHangTetDbContext context) => _context = context;
    //Add search and filter functionality in GetAll list
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? category)
    {
        // 1. Create base query
        var query = _context.Products.AsQueryable();

        // 2. Search
        if (!string.IsNullOrEmpty(search))
        {
            // Tìm tên có chứa từ khóa (tương đương SQL LIKE %search%)
            query = query.Where(p => p.Name.Contains(search));
        }

        // 3. Filter by category
        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(p => p.Category == category);
        }

        // 4. Execute query and return results
        var products = await query.ToListAsync();
        return Ok(products);
    }
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (!ObjectId.TryParse(id, out ObjectId objectId))
            return BadRequest("ID không hợp lệ.");

        var product = await _context.Products.FindAsync(objectId);
        if (product == null) return NotFound("Không tìm thấy sản phẩm.");

        return Ok(product);
    }

    //CREATE
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(Product product)
    {
        product.Id = ObjectId.GenerateNewId();

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id.ToString() }, product);
    }

    //UPDATE
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, Product updatedProduct)
    {
        if (!ObjectId.TryParse(id, out ObjectId objectId))
            return BadRequest("ID không hợp lệ.");

        var product = await _context.Products.FindAsync(objectId);
        if (product == null) return NotFound("Không tìm thấy sản phẩm để sửa.");
        product.Name = updatedProduct.Name;
        product.Price = updatedProduct.Price;
        product.Category = updatedProduct.Category;
        product.Meaning = updatedProduct.Meaning;
        product.IsComponent = updatedProduct.IsComponent;

        await _context.SaveChangesAsync();
        return Ok("Cập nhật thành công!");
    }

    //DELETE
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!ObjectId.TryParse(id, out ObjectId objectId))
            return BadRequest("ID không hợp lệ.");

        var product = await _context.Products.FindAsync(objectId);
        if (product == null) return NotFound("Sản phẩm không tồn tại.");

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return Ok("Đã xóa sản phẩm.");
    }
}