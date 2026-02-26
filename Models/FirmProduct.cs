namespace Pratek.Models
{
    public class FirmProduct
    {
        public int FirmId { get; set; }
        public int ProductId { get; set; }

        // Navigation
        public Firm? Firm { get; set; }
        public Product? Product { get; set; }
    }
}
