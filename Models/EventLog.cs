using Pratek.Models;

public class EventLog
{
    public int Id { get; set; }

    public int EntityTypeId { get; set; }   // FK
    public int EventTypeId { get; set; }    // FK

    public int EntityId { get; set; }

    public string? Description { get; set; }

    public int? UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public EntityTypeLookup? EntityType { get; set; }
    public EventType? EventType { get; set; }
    public User? User { get; set; }
}