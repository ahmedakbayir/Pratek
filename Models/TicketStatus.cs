namespace Pratek.Models
{
    public class TicketStatus
    {
        public int Id { get; set; }

        public string? Name { get; set; }

        public bool? IsClosed { get; set; }

        public int? OrderNo { get; set; }

        public string? ColorHex { get; set; }
    }
}
