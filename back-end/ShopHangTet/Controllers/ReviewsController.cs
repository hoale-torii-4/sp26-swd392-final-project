using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/admin/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _service;

    public ReviewsController(IReviewService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<ReviewListResponseDTO>> GetReviews([FromQuery] string? status, [FromQuery] int? rating, [FromQuery] string? giftBoxId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var res = await _service.GetReviewsAsync(status, rating, giftBoxId, page, pageSize);
        return Ok(res);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReviewDetailDTO>> GetReview(string id)
    {
        var res = await _service.GetReviewDetailAsync(id);
        if (res == null) return NotFound();
        return Ok(res);
    }

    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> Approve(string id)
    {
        await _service.ApproveReviewAsync(id);
        return NoContent();
    }

    [HttpPatch("{id}/hide")]
    public async Task<IActionResult> Hide(string id)
    {
        await _service.HideReviewAsync(id);
        return NoContent();
    }

    // ----------------- User-facing review APIs -----------------
    [HttpPost("/api/reviews")]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewDTO dto)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("Id")?.Value
                      ?? User.FindFirst("id")?.Value
                      ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var created = await _service.CreateReviewAsync(dto, userId);
            return Ok(created);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("/api/reviews/giftbox/{giftBoxId}")]
    public async Task<IActionResult> GetGiftBoxReviews(string giftBoxId)
    {
        var res = await _service.GetGiftBoxReviewsAsync(giftBoxId);
        return Ok(res);
    }

    [HttpGet("/api/user/reviews")]
    public async Task<IActionResult> GetUserReviews()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("Id")?.Value
                  ?? User.FindFirst("id")?.Value
                  ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

        var list = await _service.GetUserReviewsAsync(userId);
        return Ok(list);
    }
}
