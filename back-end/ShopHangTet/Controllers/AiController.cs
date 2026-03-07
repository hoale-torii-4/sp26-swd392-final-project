using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;

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
            // FORCE AI TO EXTRACT KEYWORDS (JSON)
            // ==========================================
            var extractPrompt = $@"
Bạn là trợ lý hệ thống. Hãy đọc câu hỏi của người dùng và trích xuất từ khóa để tìm kiếm hộp quà Tết.
Câu hỏi: '{request.Message}'
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau, không giải thích, không thêm dấu markdown:
{{ ""keyword"": ""tên hộp quà hoặc để rỗng nếu không rõ"" }}";

            var jsonResult = await _aiService.AskAsync(extractPrompt);

            // Cleans markdown
            jsonResult = jsonResult.Replace("```json", "").Replace("```", "").Trim();

            string? searchKeyword = null;
            try
            {
                using var doc = JsonDocument.Parse(jsonResult);
                searchKeyword = doc.RootElement.GetProperty("keyword").GetString();
                if (searchKeyword == "") searchKeyword = null;
            }
            catch
            {
                // If AI returns invalid JSON, we can choose to log this incident and proceed with a null keyword (which means no filter)
            }

            // ==========================================
            // C# QUERY DATABASE (NOT AI)
            // ==========================================
            var products = await _productService.GetGiftBoxesAsync(searchKeyword);

            // Shorten product info for AI to read (only top 5)
            var productInfo = string.Join("\n", products.Take(5).Select(p =>
                $"- Tên: {p.Name} | Giá: {p.Price:N0} VND | Mô tả: {p.Description}"));

            if (string.IsNullOrEmpty(productInfo))
            {
                productInfo = "Không tìm thấy hộp quà nào phù hợp với yêu cầu.";
            }

            // ==========================================
            // AI ANSWER BASED ON REAL DATA (NO FABRICATION)
            // ==========================================
            var finalPrompt = $@"
Bạn là nhân viên tư vấn nhiệt tình và lịch sự của Shop Hàng Tết.
Khách hàng vừa hỏi: '{request.Message}'

Đây là danh sách sản phẩm mà hệ thống tìm được dưới kho (Dữ liệu thật 100%):
{productInfo}

Hãy dựa vào danh sách trên để trả lời khách hàng bằng tiếng {language}. 
Tuyệt đối KHÔNG ĐƯỢC bịa ra sản phẩm hoặc tự ý báo sai giá ngoài danh sách trên.";

            var finalResult = await _aiService.AskAsync(finalPrompt);

            return Ok(new
            {
                // Return the AI's final answer to the frontend
                response = finalResult,
                // (Optional) Send debug info back to frontend for development purposes
                debug_keyword = searchKeyword,
                debug_data_found = products.Take(5).Count()
            });
        }

        public class ChatRequest
        {
            public string Message { get; set; } = string.Empty;
            public string? Language { get; set; }
        }
    }
}