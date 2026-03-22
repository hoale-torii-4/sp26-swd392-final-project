using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    public class AdminUsersController : ControllerBase
    {
        private readonly InternalUserService _service;

        public AdminUsersController(InternalUserService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<InternalUserListResponseDTO>> GetUsers([FromQuery] string? search, [FromQuery] string? role, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetInternalUsersAsync(search, role, status, page, pageSize);
            return Ok(res);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<InternalUserResponseDTO>> GetUser(string id)
        {
            var user = await _service.GetInternalUserByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateUser([FromBody] CreateInternalUserDTO dto)
        {
            var id = await _service.CreateInternalUserAsync(dto);
            return CreatedAtAction(nameof(GetUser), new { id }, new { id });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateInternalUserDTO dto)
        {
            await _service.UpdateInternalUserAsync(id, dto);
            return NoContent();
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] ToggleUserStatusDTO body)
        {
            await _service.ToggleUserStatusAsync(id, body.IsActive);
            return NoContent();
        }
    }
}
