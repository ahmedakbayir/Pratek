namespace Protekh.Api.Models
{
    public class TicketTag
    {
        public int Id { get; set; }

        public int TicketId { get; set; }
        public int TagId { get; set; }

        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }

        public Ticket Ticket { get; set; }
        public Tag Tag { get; set; }
    }
}