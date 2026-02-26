namespace Pratek.Models
{
    public class TicketEventHistory
    {
        public int Id { get; set; }

        public DateTime? ActionDate { get; set; }

        public int? TicketEventTypeId { get; set; }

        public int? TicketId { get; set; }

        public int? UserId { get; set; }

        public string? Description { get; set; }

        public string? NewValue { get; set; }

        public string? OldValue { get; set; }

        // Navigation
        public Ticket? Ticket { get; set; }
        public TicketEventType? TicketEventType { get; set; }
        public User? User { get; set; }
    }
}
