using System.ComponentModel.DataAnnotations.Schema;

namespace Protekh.Api.Models
{
    public class Product
    {
        public int Id { get; set; }

        public string Name { get; set; } = "";

        [Column("manager_id")]
        public int ManagerId { get; set; }

        public User? Manager { get; set; }
        public ICollection<FirmProduct>? FirmProducts { get; set; }
    }
}
