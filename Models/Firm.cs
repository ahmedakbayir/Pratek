namespace Pratek.Models
{
    public class Firm
    {
        public int Id { get; set; }

        public string? Name { get; set; }

        public int? OrderNo { get; set; }

        public int? ParentId { get; set; }

        // Navigation
        public Firm? Parent { get; set; }
    }
}
