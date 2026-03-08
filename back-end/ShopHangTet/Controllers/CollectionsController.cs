using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/admin/collections")]
    public class CollectionsController : ControllerBase
    {
        private readonly ICollectionService _service;

        public CollectionsController(ICollectionService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<CollectionResponseDTO>>> Get()
        {
            var list = await _service.GetCollectionsAsync();
            return Ok(list);
        }

        [HttpGet("{id}", Name = "GetCollectionById")]
        public async Task<ActionResult<CollectionResponseDTO>> GetById(string id)
        {
            var dto = await _service.GetCollectionByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<string>> Create([FromBody] CollectionCreateDTO dto)
        {
            var id = await _service.CreateCollectionAsync(dto);
            return CreatedAtRoute("GetCollectionById", new { id }, id);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] CollectionUpdateDTO dto)
        {
            await _service.UpdateCollectionAsync(id, dto);
            return NoContent();
        }

        public class ToggleStatusDto
        {
            public bool IsActive { get; set; }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] ToggleStatusDto body)
        {
            await _service.ToggleCollectionStatusAsync(id, body.IsActive);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            await _service.DeleteCollectionAsync(id);
            return NoContent();
        }

        [HttpPatch("reorder")]
        public async Task<IActionResult> Reorder([FromBody] List<CollectionReorderDTO> items)
        {
            await _service.ReorderCollectionsAsync(items);
            return NoContent();
        }
    }
}
