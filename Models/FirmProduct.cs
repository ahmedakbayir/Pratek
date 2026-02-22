using System.ComponentModel.DataAnnotations.Schema;

namespace Protekh.Api.Models
{
    public class FirmProduct
    {
        [Column("firm_id")]
        public int FirmId { get; set; }

        [Column("product_id")]
        public int ProductId { get; set; }

        public Firm? Firm { get; set; }
        public Product? Product { get; set; }
    }
}
