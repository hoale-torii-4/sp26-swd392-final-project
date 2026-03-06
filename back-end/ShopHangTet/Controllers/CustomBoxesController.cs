using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/custom-boxes")]
public class CustomBoxesController : ControllerBase
{
    private readonly ShopHangTetDbContext _context;

    public CustomBoxesController(ShopHangTetDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomBoxDto request)
    {
        try
        {
            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(ApiResponse<string>.ErrorResult("Ít nhất 1 item được yêu cầu"));
            }

            if (request.Items.Any(x => x.Quantity <= 0))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("Quantity must be greater than 0"));
            }

            var itemIds = request.Items.Select(x => x.ItemId).Distinct().ToList();
            var dbItems = await _context.Items
                .Where(x => itemIds.Contains(x.Id) && x.IsActive)
                .ToListAsync();

            if (dbItems.Count != itemIds.Count)
            {
                return BadRequest(ApiResponse<string>.ErrorResult("One or more items are invalid or inactive"));
            }

            var itemMap = dbItems.ToDictionary(x => x.Id, x => x);

            var drinkCount = request.Items.Count(x => itemMap[x.ItemId].Category == ItemCategory.DRINK);
            var foodCount = request.Items.Count(x => itemMap[x.ItemId].Category == ItemCategory.FOOD);
            var alcoholCount = request.Items.Count(x => itemMap[x.ItemId].Category == ItemCategory.ALCOHOL);

            var errors = new List<string>();
            if (drinkCount < 1)
            {
                errors.Add("Mix & Match phải có ít nhất 1 đồ uống");
            }

            if (foodCount < 2)
            {
                errors.Add("Mix & Match phải có ít nhất 2 món ăn");
            }
            else if (foodCount > 4)
            {
                errors.Add("Mix & Match không được có quá 4 món ăn");
            }

            if (alcoholCount > 1)
            {
                errors.Add("Mix & Match không được có quá 1 rượu");
            }

            if (errors.Count > 0)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Mix & Match validation failed", errors));
            }

            var customBox = new CustomBox
            {
                Items = request.Items.Select(x => new CustomBoxItem
                {
                    ItemId = x.ItemId,
                    Quantity = x.Quantity
                }).ToList(),
                TotalPrice = request.Items.Sum(x => itemMap[x.ItemId].Price * x.Quantity),
                GreetingMessage = request.GreetingMessage,
                CanvaCardLink = request.CanvaCardLink,
                HideInvoice = request.HideInvoice,
                CreatedAt = DateTime.UtcNow
            };

            _context.CustomBoxes.Add(customBox);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<CustomBoxDto>.SuccessResult(MapCustomBox(customBox, itemMap), "Custom box created successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        try
        {
            var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == id);
            if (customBox == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("CustomBox not found"));
            }

            var itemIds = customBox.Items.Select(x => x.ItemId).Distinct().ToList();
            var dbItems = await _context.Items
                .Where(x => itemIds.Contains(x.Id))
                .ToListAsync();

            var itemMap = dbItems.ToDictionary(x => x.Id, x => x);
            return Ok(ApiResponse<CustomBoxDto>.SuccessResult(MapCustomBox(customBox, itemMap), "Custom box retrieved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    private static CustomBoxDto MapCustomBox(CustomBox customBox, Dictionary<string, Item> itemMap)
    {
        return new CustomBoxDto
        {
            Id = customBox.Id,
            TotalPrice = customBox.TotalPrice,
            CreatedAt = customBox.CreatedAt,
            Items = customBox.Items.Select(x =>
            {
                itemMap.TryGetValue(x.ItemId, out var item);
                return new CustomBoxItemResponseDto
                {
                    ItemId = x.ItemId,
                    Quantity = x.Quantity,
                    Price = item?.Price ?? 0,
                    Name = item?.Name ?? string.Empty,
                    Category = item?.Category.ToString() ?? string.Empty,
                    IsAlcohol = item?.IsAlcohol ?? false
                };
            }).ToList()
        };
    }
}