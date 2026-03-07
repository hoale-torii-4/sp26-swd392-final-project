using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using ShopHangTet.Services;
using System.Collections.Generic;
using System.Text.Json;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiController : ControllerBase
    {
        private readonly AiService _aiService;
        private readonly IProductService _productService;

        public AiController(AiService aiService, IProductService productService)
        {
            _aiService = aiService;
            _productService = productService;
        }

        // POST: api/ai/chat
        [HttpPost("chat")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message is required.");

            var language = string.IsNullOrWhiteSpace(request.Language) ? "Vietnamese" : request.Language;

            // ==========================================
            // FORCE AI EXTRACT KEYWORD TO SEARCH
            // ==========================================
            var extractPrompt = $@"
Bạn là trợ lý hệ thống. Hãy trích xuất CÁC từ khóa để tìm kiếm sản phẩm.
LƯU Ý CỰC KỲ QUAN TRỌNG:
- TUYỆT ĐỐI GIỮ NGUYÊN các dấu câu đặc biệt (như dấu gạch ngang '-', khoảng trắng) nếu có trong câu hỏi.
- Lấy từ khóa là phần TÊN ĐẶC TRƯNG NHẤT, tránh lấy cụm quá dài dễ sai sót. 
  (Ví dụ 1: Khách hỏi 'Hộp quà Xuân Đoàn Viên - Phúc Lộc' -> Từ khóa lấy là 'Phúc Lộc' hoặc 'Xuân Đoàn Viên - Phúc Lộc').
  (Ví dụ 2: Khách hỏi 'Hạt điều rang muối và macca' -> Từ khóa lấy là 'điều rang muối' và 'macca').
- Khách hỏi 1 món -> trả 1 từ khóa. Khách hỏi nhiều món -> trả nhiều từ khóa.

Câu hỏi: '{request.Message}'
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng mảng sau:
{{ ""keywords"": [""từ khóa 1"", ""từ khóa 2""] }}";

            var jsonResult = await _aiService.AskAsync(extractPrompt);
            jsonResult = jsonResult.Replace("```json", "").Replace("```", "").Trim();

            var searchKeywords = new List<string>();
            try
            {
                using var doc = JsonDocument.Parse(jsonResult);
                // Bóc tách mảng JSON thành List string trong C#
                foreach (var element in doc.RootElement.GetProperty("keywords").EnumerateArray())
                {
                    var kw = element.GetString();
                    if (!string.IsNullOrWhiteSpace(kw)) searchKeywords.Add(kw.Trim());
                }
            }
            catch { /* Bỏ qua nếu parse lỗi */ }

            // ==========================================
            // C# FIND BOTH GIFTBOX AND INDIVIDUAL ITEMS BASED ON KEYWORD
            // ==========================================
            var giftBoxes = new List<GiftBoxListDto>();
            var individualItems = new List<Item>();

            if (searchKeywords.Count == 0)
            {
                // Khách nói lăng nhăng ko có từ khóa -> Mồi thử lệnh rỗng
                giftBoxes.AddRange(await _productService.GetGiftBoxesAsync(null));
                individualItems.AddRange(await _productService.GetItemsAsync(null));
            }
            else
            {
                // Khách hỏi bao nhiêu món thì chạy tìm bấy nhiêu lần
                foreach (var kw in searchKeywords)
                {
                    giftBoxes.AddRange(await _productService.GetGiftBoxesAsync(kw));
                    individualItems.AddRange(await _productService.GetItemsAsync(kw));
                }
            }

            // Lọc trùng lặp (Phòng trường hợp khách hỏi 2 từ khóa nhưng ra cùng 1 sản phẩm)
            giftBoxes = giftBoxes.GroupBy(x => x.Id).Select(g => g.First()).ToList();
            individualItems = individualItems.GroupBy(x => x.Id).Select(g => g.First()).ToList();

            bool isFallback = false;

            // KỊCH BẢN CHỮA CHÁY: NẾU KHÔNG TÌM THẤY GÌ -> LẤY ĐẠI HÀNG HOT LÊN ĐỀ XUẤT
            if (!giftBoxes.Any() && !individualItems.Any())
            {
                isFallback = true;
                giftBoxes = await _productService.GetGiftBoxesAsync(null);
                individualItems = await _productService.GetItemsAsync(null);
            }

            var productInfoList = new List<string>();

            foreach (var gb in giftBoxes.Take(3))
                productInfoList.Add($"- [Hộp quà] {gb.Name} | Giá: {gb.Price:N0} VND | Mô tả: {gb.Description}");

            foreach (var item in individualItems.Take(5))
                productInfoList.Add($"- [Sản phẩm lẻ] {item.Name} | Giá: {item.Price:N0} VND");

            var productInfo = string.Join("\n", productInfoList);

            // ==========================================
            // AI RESPONSE BASED ON WHETHER PRODUCTS FOUND OR NOT
            // ==========================================
            var promptContext = isFallback
                ? $"Hiện tại shop KHÔNG CÓ sản phẩm khách yêu cầu. Hãy lịch sự xin lỗi và TỰ ĐỘNG GỢI Ý các sản phẩm nổi bật sau đây:\n{productInfo}"
                : $"Đây là các sản phẩm khớp với yêu cầu tìm kiếm của khách:\n{productInfo}";

            var finalPrompt = $@"
Bạn là nhân viên tư vấn nhiệt tình của Shop Hàng Tết. 
Khách hàng vừa hỏi: '{request.Message}'

{promptContext}

Hãy trả lời khách hàng bằng tiếng {language} thật tự nhiên và thân thiện. 
Tuyệt đối KHÔNG bịa ra sản phẩm hoặc báo sai giá ngoài danh sách trên.";

            var finalResult = await _aiService.AskAsync(finalPrompt);

            return Ok(new
            {
                response = finalResult,
                debug_keywords = searchKeywords, // Trả về dạng mảng để mình theo dõi
                debug_is_fallback_suggestion = isFallback, // Báo cho FE biết đây là đồ gợi ý thay thế
                debug_giftbox_found = giftBoxes.Count,
                debug_item_found = individualItems.Count
            });
        }

        public class ChatRequest
        {
            public string Message { get; set; } = string.Empty;
            public string? Language { get; set; }
        }
    }
}