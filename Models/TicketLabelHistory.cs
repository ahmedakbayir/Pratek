namespace Pratek.Models
{
    public class TicketLabelHistory
    {
        public int Id { get; set; }

        public bool? ActionType { get; set; }

        public DateTime? ActionDate { get; set; }

        public int? LabelId { get; set; }

        public int? TicketId { get; set; }

        public int? UserId { get; set; }

        // Navigation
        public Label? Label { get; set; }
        public Ticket? Ticket { get; set; }
        public User? User { get; set; }
    }
}
