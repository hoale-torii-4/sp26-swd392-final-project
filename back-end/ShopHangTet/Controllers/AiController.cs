using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using ShopHangTet.Services;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

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

        [HttpPost("chat")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            // 1. Kiểm tra mảng tin nhắn gửi lên
            if (request.Messages == null || !request.Messages.Any())
                return BadRequest("Messages list cannot be empty.");

            // 2. Lấy câu chat MỚI NHẤT của khách (GUEST)
            var lastUserMessage = request.Messages.LastOrDefault(m => m.Sender.ToUpper() == "GUEST")?.Message;

            if (string.IsNullOrWhiteSpace(lastUserMessage))
                return BadRequest("User message is required.");

            // 3. Chặn spam Hello
            var msg = lastUserMessage.Trim().ToLower();
            if (msg == "hello" || msg == "hi" || msg == "chào shop" || msg == "chào bạn")
            {
                return Ok(new
                {
                    response = "Dạ chào anh/chị! Em là trợ lý AI của Shop Hàng Tết. Em có thể giúp gì cho mình hôm nay ạ? 😊",
                    debug_keyword = (string?)null
                });
            }

            var language = string.IsNullOrWhiteSpace(request.Language) ? "Vietnamese" : request.Language;

            // ==========================================
            // BƯỚC 1: DÙNG CÂU CUỐI CÙNG ĐỂ ÉP AI BÓC TỪ KHÓA
            // ==========================================
            var extractPrompt = $@"
Bạn là trợ lý hệ thống. Hãy trích xuất CÁC từ khóa để tìm kiếm sản phẩm.
LƯU Ý CỰC KỲ QUAN TRỌNG:
- TUYỆT ĐỐI GIỮ NGUYÊN các dấu câu đặc biệt (như dấu gạch ngang '-', khoảng trắng) nếu có trong câu hỏi.
- Lấy từ khóa là phần TÊN ĐẶC TRƯNG NHẤT, tránh lấy cụm quá dài dễ sai sót. 
- Khách hỏi 1 món -> trả 1 từ khóa. Khách hỏi nhiều món -> trả nhiều từ khóa.

Câu hỏi: '{lastUserMessage}'
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng mảng sau:
{{ ""keywords"": [""từ khóa 1"", ""từ khóa 2""] }}";

            // Vẫn dùng hàm cũ cho việc bóc tách
            var jsonResult = await _aiService.AskAsync(extractPrompt);
            jsonResult = jsonResult.Replace("```json", "").Replace("```", "").Trim();

            var searchKeywords = new List<string>();
            try
            {
                using var doc = JsonDocument.Parse(jsonResult);
                foreach (var element in doc.RootElement.GetProperty("keywords").EnumerateArray())
                {
                    var kw = element.GetString();
                    if (!string.IsNullOrWhiteSpace(kw)) searchKeywords.Add(kw.Trim());
                }
            }
            catch { /* Bỏ qua nếu parse lỗi */ }

            // ==========================================
            // BƯỚC 2: TÌM KIẾM DATABASE
            // ==========================================
            var giftBoxes = new List<GiftBoxListDto>();
            var individualItems = new List<Item>();

            if (searchKeywords.Count == 0)
            {
                giftBoxes.AddRange(await _productService.GetGiftBoxesAsync(null));
                individualItems.AddRange(await _productService.GetItemsAsync(null));
            }
            else
            {
                foreach (var kw in searchKeywords)
                {
                    giftBoxes.AddRange(await _productService.GetGiftBoxesAsync(kw));
                    individualItems.AddRange(await _productService.GetItemsAsync(kw));
                }
            }

            giftBoxes = giftBoxes.GroupBy(x => x.Id).Select(g => g.First()).ToList();
            individualItems = individualItems.GroupBy(x => x.Id).Select(g => g.First()).ToList();

            bool isFallback = false;
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
            // BƯỚC 3: GOM LỊCH SỬ CHAT VÀ GỬI CHO AI CÓ TRÍ NHỚ
            // ==========================================
            var promptContext = isFallback
                ? $"Hiện tại shop KHÔNG CÓ sản phẩm khách yêu cầu. Hãy lịch sự xin lỗi và gợi ý các sản phẩm nổi bật sau:\n{productInfo}"
                : $"Đây là các sản phẩm khớp với yêu cầu tìm kiếm của khách:\n{productInfo}";

            // 3.1 Nhét "Luật thép" và Bối cảnh vào System Prompt
            var systemPrompt = $@"Bạn là nhân viên tư vấn nhiệt tình của Shop Hàng Tết.
Luôn xưng 'em' và gọi khách là 'anh/chị'. 
Hãy trả lời bằng tiếng {language} thật tự nhiên và thân thiện. 
Tuyệt đối KHÔNG bịa ra sản phẩm hoặc báo sai giá ngoài danh sách sau.
{promptContext}";

            var conversationHistory = new List<object>
            {
                new { role = "system", content = systemPrompt }
            };

            // 3.2 Đổ toàn bộ tin nhắn cũ từ FE vào và "phiên dịch" sang ngôn ngữ của AI
            foreach (var m in request.Messages)
            {
                // Nếu Sender là BOT hoặc STAFF -> Đóng vai "assistant" (AI)
                // Nếu Sender là GUEST -> Đóng vai "user" (Khách hàng)
                var safeRole = (m.Sender.ToUpper() == "BOT" || m.Sender.ToUpper() == "STAFF") ? "assistant" : "user";

                // Đẩy vào mảng với đúng định dạng role và content mà AI cần
                conversationHistory.Add(new { role = safeRole, content = m.Message });
            }

            // 3.3 Gọi hàm mới, đưa nguyên bộ nhớ cho nó xử lý
            var finalResult = await _aiService.AskWithHistoryAsync(conversationHistory);

            return Ok(new
            {
                response = finalResult,
                debug_keywords = searchKeywords,
                debug_is_fallback_suggestion = isFallback,
                debug_giftbox_found = giftBoxes.Count,
                debug_item_found = individualItems.Count
            });
        }

        // ==========================================
        // DTOs MỚI: NHẬN MẢNG TIN NHẮN THAY VÌ 1 CHUỖI
        // ==========================================


        public class ChatRequest
        {
            // Dùng luôn ChatMessageDto từ ShopHangTet.DTOs
            public List<ChatMessageDto> Messages { get; set; } = new List<ChatMessageDto>();
            public string? Language { get; set; }
        }
    }
}