using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Pratek.Models
{
    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        // -------------------------
        // BASIC
        // -------------------------
        [Required]
        public string Title { get; set; }

        public string? Description { get; set; }

        // -------------------------
        // FK FIELDS
        // -------------------------
        public int? FirmId { get; set; }
        public int? AssignedUserId { get; set; }

        public int TicketStatusId { get; set; }
        public int TicketPriorityId { get; set; }

        // -------------------------
        // AUDIT
        // -------------------------
        public DateTime CreatedAt { get; set; }
        public int? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }

        // -------------------------
        // NAVIGATION PROPERTIES
        // -------------------------
        public Firm? Firm { get; set; }
        public User? AssignedUser { get; set; }

        public TicketStatus? Status { get; set; }
        public TicketPriority? Priority { get; set; }

        public ICollection<TicketTag>? TicketTags { get; set; }
    }
}