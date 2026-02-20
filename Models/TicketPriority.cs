namespace Protekh.Api.Models
{
    public class TicketPriority
    {
        public int Id { get; set; }

        public string Name { get; set; } = null!;

        public int Level { get; set; }
    }
}