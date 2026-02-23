namespace ShopHangTet.Services
{
    public interface IAiService
    {
        Task<string> AskAsync(string message);
    }
}
