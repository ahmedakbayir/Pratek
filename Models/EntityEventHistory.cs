using System.ComponentModel.DataAnnotations;

namespace Pratek.Models
{
    public class EntityEventHistory
    {
        public int Id { get; set; }

        public DateTime ActionDate { get; set; }

        public int EntityEventTypeId { get; set; }

        public int EntityId { get; set; }

        public int UserId { get; set; }

        public string? Description { get; set; }

        // Navigation
        public Entity? Entity { get; set; }
        public EntityEventType? EntityEventType { get; set; }
        public User? User { get; set; }
    }
}
