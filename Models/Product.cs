using System.ComponentModel.DataAnnotations.Schema;

namespace Pratek.Models
{
    public class Product
    {
        public int Id { get; set; }

        public string Name { get; set; } = "";
        public int ManagerId { get; set; }

        public User? Manager { get; set; }
        public ICollection<FirmProduct>? FirmProducts { get; set; }
    }
}
