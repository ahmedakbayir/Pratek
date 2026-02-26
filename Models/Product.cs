namespace Pratek.Models
{
    public class Product
    {
        public int Id { get; set; }

        public string? Name { get; set; }

        public int? ManagerId { get; set; }

        public int? OrderNo { get; set; }

        // Navigation
        public User? Manager { get; set; }
        public ICollection<FirmProduct>? FirmProducts { get; set; }
    }
}
