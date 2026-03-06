using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Repositories;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/delivery-slots")]
public class DeliverySlotsController : ControllerBase
{
    private readonly IDeliverySlotRepository _slotRepository;

    public DeliverySlotsController(IDeliverySlotRepository slotRepository)
    {
        _slotRepository = slotRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetSlots(
        [FromQuery] DateTime? date = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] bool availableOnly = false)
    {
        try
        {
            IEnumerable<ShopHangTet.Models.DeliverySlot> slots;

            if (date.HasValue)
            {
                var slot = await _slotRepository.GetByDateAsync(date.Value);
                slots = slot != null ? new List<ShopHangTet.Models.DeliverySlot> { slot } : new List<ShopHangTet.Models.DeliverySlot>();
            }
            else if (availableOnly)
            {
                var start = fromDate ?? DateTime.UtcNow.Date;
                var end = toDate ?? start.AddDays(14);
                slots = await _slotRepository.GetAvailableSlotsAsync(start, end);
            }
            else
            {
                slots = await _slotRepository.GetAllAsync();
            }

            var data = slots
                .OrderBy(x => x.DeliveryDate)
                .Select(x => new
                {
                    id = x.Id.ToString(),
                    deliveryDate = x.DeliveryDate,
                    maxOrdersPerDay = x.MaxOrdersPerDay,
                    currentOrderCount = x.CurrentOrderCount,
                    isLocked = x.IsLocked,
                    isAvailable = !x.IsLocked && x.CurrentOrderCount < x.MaxOrdersPerDay
                })
                .ToList();

            return Ok(ApiResponse<object>.SuccessResult(data, "Delivery dates retrieved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }
}