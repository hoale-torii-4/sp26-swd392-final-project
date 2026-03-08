using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/admin/giftboxes")]
    public class GiftBoxesController : ControllerBase
    {
        private readonly IGiftBoxService _service;

        public GiftBoxesController(IGiftBoxService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<GiftBoxListResponseDTO>>> Get([FromQuery] string? collectionId, [FromQuery] string? keyword, [FromQuery] bool? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _service.GetGiftBoxesAsync(collectionId, keyword, status, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<GiftBoxDetailResponseDTO>> GetById(string id)
        {
            var dto = await _service.GetGiftBoxByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<string>> Create([FromBody] GiftBoxCreateDTO dto)
        {
            var id = await _service.CreateGiftBoxAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] GiftBoxUpdateDTO dto)
        {
            await _service.UpdateGiftBoxAsync(id, dto);
            return NoContent();
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] GiftBoxStatusDTO body)
        {
            await _service.ToggleGiftBoxStatusAsync(id, body.IsActive);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.DeleteGiftBoxAsync(id);
            return NoContent();
        }

        [HttpGet("collections")]
        public async Task<ActionResult<List<SimpleCollectionDTO>>> Collections()
        {
            var list = await _service.GetCollectionsAsync();
            return Ok(list);
        }

        [HttpGet("items")]
        public async Task<ActionResult<List<SimpleItemDTO>>> Items()
        {
            var list = await _service.GetItemsAsync();
            return Ok(list);
        }

        [HttpGet("tags")]
        public async Task<ActionResult<List<SimpleTagDTO>>> Tags()
        {
            var list = await _service.GetTagsAsync();
            return Ok(list);
        }
    }
}
