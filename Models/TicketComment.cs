namespace Pratek.Models
{
    public class TicketComment
    {
        public int Id { get; set; }

        public int TicketId { get; set; }

        public int UserId { get; set; }

        public string Content { get; set; } = "";

        public DateTime ActionDate { get; set; }

        public bool? Inactive { get; set; }

        // Navigation
        public Ticket? Ticket { get; set; }
        public User? User { get; set; }
    }
}
