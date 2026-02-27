namespace Pratek.Models
{
    public class Ticket
    {
        public int Id { get; set; }

        public string? Title { get; set; }

        public string? Content { get; set; }

        public DateTime? DueDate { get; set; }

        public int? AssignedUserId { get; set; }

        public int? CreatedUserId { get; set; }

        public int? FirmId { get; set; }

        public int? PriorityId { get; set; }

        public int? ProductId { get; set; }

        public int? StatusId { get; set; }

        public string? Scope { get; set; }

        // Navigation
        public User? AssignedUser { get; set; }
        public User? CreatedUser { get; set; }
        public Firm? Firm { get; set; }
        public TicketPriority? Priority { get; set; }
        public TicketStatus? Status { get; set; }
        public Product? Product { get; set; }
    }
}
