namespace ShopHangTet.Services
{
    public interface IAiService
    {
        public Task<string> AskAsync(string message);
    }
}
