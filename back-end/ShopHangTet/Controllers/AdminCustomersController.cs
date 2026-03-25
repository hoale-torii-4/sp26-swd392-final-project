using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/admin/customers")]
    public class AdminCustomersController : ControllerBase
    {
        private readonly CustomerService _service;

        public AdminCustomersController(CustomerService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<CustomerListResponseDto>> GetCustomers(
            [FromQuery] string? search, 
            [FromQuery] string? status, 
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetCustomersAsync(search, status, page, pageSize);
            return Ok(res);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponseDto>> GetCustomerById(string id)
        {
            var user = await _service.GetCustomerByIdAsync(id);
            if (user == null) return NotFound(new ApiResponse<object>
            {
                Success = false,
                Message = "Không tìm thấy khách hàng này.",
                Errors = new List<string> { "User not found or is not a customer." },
                Timestamp = DateTime.UtcNow
            });

            return Ok(user);
        }
    }
}
