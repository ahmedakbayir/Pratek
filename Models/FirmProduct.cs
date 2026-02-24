using System.ComponentModel.DataAnnotations.Schema;

namespace Protekh.Api.Models
{
    public class FirmProduct
    {
        public int FirmId { get; set; }
        public int ProductId { get; set; }
        public Firm? Firm { get; set; }
        public Product? Product { get; set; }
    }
}
