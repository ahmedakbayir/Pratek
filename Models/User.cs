namespace Pratek.Models
{
    public class User
    {
        public int Id { get; set; }

        public string? Name { get; set; }

        public string? Mail { get; set; }

        public string? Password { get; set; }

        public string? Gsm { get; set; }

        public int? FirmId { get; set; }

        public int? OrderNo { get; set; }

        public int? PrivilegeId { get; set; }

        public string? AvatarUrl { get; set; }

        // Navigation
        public Firm? Firm { get; set; }
        public Privilege? Privilege { get; set; }
    }
}
