namespace Pratek.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Mail { get; set; } = "";
        public string Password { get; set; } = "";
        public string Tel { get; set; } = "";
        public int RoleId { get; set; }   // 1: admin, 2: agent, 3: customer
    }
}