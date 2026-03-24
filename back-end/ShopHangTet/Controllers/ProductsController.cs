using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;

        public ProductsController(IProductService productService)
        {
            _productService = productService;
        }

        [HttpGet("items")]
        public async Task<IActionResult> GetItems([FromQuery] string? name)
        {
            var items = await _productService.GetItemsAsync(name);
            return Ok(items);
        }

        [HttpGet("gift-boxes")]
        public async Task<IActionResult> GetGiftBoxes([FromQuery] string? name)
        {
            var giftBoxes = await _productService.GetGiftBoxesAsync(name);
            return Ok(giftBoxes);
        }

        [HttpGet("collections")]
        public async Task<IActionResult> GetCollections([FromQuery] string? name)
        {
            var collections = await _productService.GetCollectionsAsync(name);
            return Ok(collections);
        }

        [HttpGet("items/{id}")]
        public async Task<IActionResult> GetItemById(string id)
        {
            var item = await _productService.GetItemByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpGet("gift-boxes/{id}")]
        public async Task<IActionResult> GetGiftBoxById(string id)
        {
            var giftBox = await _productService.GetGiftBoxDetailByIdAsync(id);
            if (giftBox == null) return NotFound();
            return Ok(giftBox);
        }

        [HttpGet("collections/{id}")]
        public async Task<IActionResult> GetCollectionById(string id)
        {
            var collection = await _productService.GetCollectionDetailByIdAsync(id);
            if (collection == null) return NotFound();
            return Ok(collection);
        }

        // Admin GiftBox CRUD with auto pricing.

        /// Create GiftBox with calculated price.
        [HttpPost("gift-boxes")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CreateGiftBox([FromBody] CreateGiftBoxDto dto)
        {
            try
            {
                var giftBox = await _productService.CreateGiftBoxAsync(dto);
                return Ok(ApiResponse<object>.SuccessResult(new
                {
                    id = giftBox.Id,
                    name = giftBox.Name,
                    price = giftBox.Price,
                    collectionId = giftBox.CollectionId
                }, "GiftBox created with auto-calculated price"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
            }
        }

        /// Update GiftBox and recalculate price when needed.
        [HttpPut("gift-boxes/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateGiftBox(string id, [FromBody] UpdateGiftBoxDto dto)
        {
            try
            {
                var giftBox = await _productService.UpdateGiftBoxAsync(id, dto);
                return Ok(ApiResponse<object>.SuccessResult(new
                {
                    id = giftBox.Id,
                    name = giftBox.Name,
                    price = giftBox.Price,
                    collectionId = giftBox.CollectionId
                }, "GiftBox updated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
            }
        }

        /// Preview GiftBox price without saving.
        [HttpPost("gift-boxes/calculate-price")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CalculateGiftBoxPrice([FromBody] CalculateGiftBoxPriceDto dto)
        {
            try
            {
                var items = dto.Items.Select(i => new ShopHangTet.Models.GiftBoxItem
                {
                    ItemId = i.ItemId,
                    Quantity = i.Quantity
                }).ToList();

                var price = await _productService.CalculateGiftBoxPriceAsync(dto.CollectionId, items);
                return Ok(ApiResponse<object>.SuccessResult(new
                {
                    collectionId = dto.CollectionId,
                    calculatedPrice = price
                }, "Price calculated from collection pricing rule"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
            }
        }
    }
}