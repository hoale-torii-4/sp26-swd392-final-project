using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using ShopHangTet.Services;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System;

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
            if (request.Messages == null || !request.Messages.Any())
                return BadRequest("Messages list cannot be empty.");

            var lastUserMessage = request.Messages.LastOrDefault(m => m.Sender.ToUpper() == "GUEST")?.Message;

            if (string.IsNullOrWhiteSpace(lastUserMessage))
                return BadRequest("User message is required.");

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

            //Analyzing promt
            var extractPrompt = $@"
Bạn là hệ thống phân tích ý định khách hàng của Shop Hàng Tết.
Hãy đọc câu hỏi của khách và phân loại chính xác các yêu cầu.

Câu hỏi: '{lastUserMessage}'

Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau:
{{
  ""keywords"": [""macca"", ""hạt điều""], // CHỈ lấy tên sản phẩm cụ thể. NẾU KHÔNG CÓ tên cụ thể, để mảng rỗng []. KHÔNG đưa từ chung chung như 'hộp quà', 'rẻ nhất' vào đây.
  ""wants_giftbox"": true, // Khách có ý định tìm mua/hỏi về hộp quà Tết không? (true/false)
  ""wants_item"": true, // Khách có ý định tìm mua/hỏi về sản phẩm lẻ như hạt, mứt không? (true/false)
  ""sort_price"": ""asc"" // Nếu khách muốn rẻ nhất -> ""asc"". Đắt nhất -> ""desc"". Không quan tâm giá -> ""none""
}}";

            var jsonResult = await _aiService.AskAsync(extractPrompt);
            jsonResult = jsonResult.Replace("```json", "").Replace("```", "").Trim();

            var searchKeywords = new List<string>();
            bool wantsGiftbox = true;
            bool wantsItem = true;
            string sortPrice = "none";

            try
            {
                using var doc = JsonDocument.Parse(jsonResult);
                var root = doc.RootElement;

                if (root.TryGetProperty("keywords", out var kwElement))
                {
                    foreach (var element in kwElement.EnumerateArray())
                    {
                        var kw = element.GetString();
                        if (!string.IsNullOrWhiteSpace(kw)) searchKeywords.Add(kw.Trim());
                    }
                }

                if (root.TryGetProperty("wants_giftbox", out var wgElement)) wantsGiftbox = wgElement.GetBoolean();
                if (root.TryGetProperty("wants_item", out var wiElement)) wantsItem = wiElement.GetBoolean();
                if (root.TryGetProperty("sort_price", out var spElement)) sortPrice = spElement.GetString()?.ToLower() ?? "none";

                if (!wantsGiftbox && !wantsItem)
                {
                    wantsGiftbox = true;
                    wantsItem = true;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AI Parse Error]: {ex.Message} - Raw JSON: {jsonResult}");
            }

            //Search products in db based on extracted info
            var giftBoxes = new List<GiftBoxListDto>();
            var individualItems = new List<Item>();

            if (searchKeywords.Count > 0)
            {
                foreach (var kw in searchKeywords)
                {
                    if (wantsGiftbox) giftBoxes.AddRange(await _productService.GetGiftBoxesAsync(kw));
                    if (wantsItem) individualItems.AddRange(await _productService.GetItemsAsync(kw));
                }
            }

            if (wantsGiftbox && giftBoxes.Count == 0)
            {
                giftBoxes.AddRange(await _productService.GetGiftBoxesAsync(null));
            }

            if (wantsItem && individualItems.Count == 0)
            {
                individualItems.AddRange(await _productService.GetItemsAsync(null));
            }

            giftBoxes = giftBoxes.GroupBy(x => x.Id).Select(g => g.First()).ToList();
            individualItems = individualItems.GroupBy(x => x.Id).Select(g => g.First()).ToList();

            if (sortPrice == "asc")
            {
                giftBoxes = giftBoxes.OrderBy(x => x.Price).ToList();
                individualItems = individualItems.OrderBy(x => x.Price).ToList();
            }
            else if (sortPrice == "desc")
            {
                giftBoxes = giftBoxes.OrderByDescending(x => x.Price).ToList();
                individualItems = individualItems.OrderByDescending(x => x.Price).ToList();
            }

            //Fallback if there isnt any products
            bool isFallback = false;
            if (!giftBoxes.Any() && !individualItems.Any())
            {
                isFallback = true;
                giftBoxes = await _productService.GetGiftBoxesAsync(null);
                individualItems = await _productService.GetItemsAsync(null);
            }

            var productInfoList = new List<string>();
            foreach (var gb in giftBoxes.Take(4))
                productInfoList.Add($"- [Hộp quà] {gb.Name} | Giá: {gb.Price:N0} VND | Mô tả: {gb.Description}");
            foreach (var item in individualItems.Take(6))
                productInfoList.Add($"- [Sản phẩm lẻ] {item.Name} | Giá: {item.Price:N0} VND");

            var productInfo = string.Join("\n", productInfoList);


            //Chat history
            var promptContext = isFallback
                ? $"Hiện tại shop KHÔNG CÓ sản phẩm khách yêu cầu. Hãy lịch sự xin lỗi và gợi ý các sản phẩm nổi bật sau:\n{productInfo}"
                : $"Đây là các sản phẩm khớp với yêu cầu tìm kiếm của khách:\n{productInfo}";

            var systemPrompt = $@"Bạn là nhân viên tư vấn nhiệt tình của Shop Hàng Tết.
Luôn xưng 'em' và gọi khách là 'anh/chị'. 
Hãy trả lời bằng tiếng {language} thật tự nhiên và thân thiện. 
Tuyệt đối KHÔNG bịa ra sản phẩm hoặc báo sai giá ngoài danh sách sau.
{promptContext}";

            var conversationHistory = new List<object>
            {
                new { role = "system", content = systemPrompt }
            };

            foreach (var m in request.Messages)
            {
                var safeRole = (m.Sender.ToUpper() == "BOT" || m.Sender.ToUpper() == "STAFF") ? "assistant" : "user";
                conversationHistory.Add(new { role = safeRole, content = m.Message });
            }

            var finalResult = await _aiService.AskWithHistoryAsync(conversationHistory);

            return Ok(new
            {
                response = finalResult,
                debug_keywords = searchKeywords,
                debug_is_fallback_suggestion = isFallback,
                debug_giftbox_found = giftBoxes.Count,
                debug_item_found = individualItems.Count,
                debug_sort = sortPrice
            });
        }

        public class ChatRequest
        {
            public List<ChatMessageDto> Messages { get; set; } = new List<ChatMessageDto>();
            public string? Language { get; set; }
        }
    }
}