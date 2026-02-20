namespace Protekh.Api.Models
{
    public class TicketStatus
    {
        public int Id { get; set; }

        public string Name { get; set; } = null!;

        public bool IsClosed { get; set; }

        public int OrderNo { get; set; }
    }
}