using Microsoft.EntityFrameworkCore;
using Pratek.Models;

namespace Pratek.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // ---- TABLES ----

        public DbSet<Entity> Entities { get; set; }
        public DbSet<EntityEventHistory> EntityEventHistories { get; set; }
        public DbSet<EntityEventType> EntityEventTypes { get; set; }
        public DbSet<Firm> Firms { get; set; }
        public DbSet<FirmProduct> FirmProducts { get; set; }
        public DbSet<Label> Labels { get; set; }
        public DbSet<Privilege> Privileges { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<TicketComment> TicketComments { get; set; }
        public DbSet<TicketEventHistory> TicketEventHistories { get; set; }
        public DbSet<TicketEventType> TicketEventTypes { get; set; }
        public DbSet<TicketLabelHistory> TicketLabelHistories { get; set; }
        public DbSet<TicketPriority> TicketPriorities { get; set; }
        public DbSet<TicketStatus> TicketStatuses { get; set; }
        public DbSet<User> Users { get; set; }

        // ---- MAPPING ----

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // TABLE NAME MAPPING
            modelBuilder.Entity<Entity>().ToTable("Entity");
            modelBuilder.Entity<EntityEventHistory>().ToTable("EntityEventHistory");
            modelBuilder.Entity<EntityEventType>().ToTable("EntityEventType");
            modelBuilder.Entity<Firm>().ToTable("Firm");
            modelBuilder.Entity<FirmProduct>().ToTable("Firm_Product");
            modelBuilder.Entity<Label>().ToTable("Label");
            modelBuilder.Entity<Privilege>().ToTable("Privilege");
            modelBuilder.Entity<Product>().ToTable("Product");
            modelBuilder.Entity<Ticket>().ToTable("Ticket");
            modelBuilder.Entity<TicketComment>().ToTable("TicketComments");
            modelBuilder.Entity<TicketEventHistory>().ToTable("TicketEventHistory");
            modelBuilder.Entity<TicketEventType>().ToTable("TicketEventType");
            modelBuilder.Entity<TicketLabelHistory>().ToTable("TicketLabelHistory");
            modelBuilder.Entity<TicketPriority>().ToTable("TicketPriority");
            modelBuilder.Entity<TicketStatus>().ToTable("TicketStatus");
            modelBuilder.Entity<User>().ToTable("User");

            // ---- COMPOSITE KEYS ----

            modelBuilder.Entity<FirmProduct>()
                .HasKey(fp => new { fp.FirmId, fp.ProductId });

            // ---- ENTITY EVENT HISTORY RELATIONS ----

            modelBuilder.Entity<EntityEventHistory>()
                .HasOne(e => e.Entity)
                .WithMany()
                .HasForeignKey(e => e.EntityId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EntityEventHistory>()
                .HasOne(e => e.EntityEventType)
                .WithMany()
                .HasForeignKey(e => e.EntityEventTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EntityEventHistory>()
                .HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- FIRM RELATIONS ----

            modelBuilder.Entity<Firm>()
                .HasOne(f => f.Parent)
                .WithMany()
                .HasForeignKey(f => f.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- FIRM_PRODUCT RELATIONS ----

            modelBuilder.Entity<FirmProduct>()
                .HasOne(fp => fp.Firm)
                .WithMany()
                .HasForeignKey(fp => fp.FirmId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FirmProduct>()
                .HasOne(fp => fp.Product)
                .WithMany(p => p.FirmProducts)
                .HasForeignKey(fp => fp.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- PRODUCT RELATIONS ----

            modelBuilder.Entity<Product>()
                .HasOne(p => p.Manager)
                .WithMany()
                .HasForeignKey(p => p.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- TICKET RELATIONS ----

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.AssignedUser)
                .WithMany()
                .HasForeignKey(t => t.AssignedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.CreatedUser)
                .WithMany()
                .HasForeignKey(t => t.CreatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Firm)
                .WithMany()
                .HasForeignKey(t => t.FirmId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Priority)
                .WithMany()
                .HasForeignKey(t => t.PriorityId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Status)
                .WithMany()
                .HasForeignKey(t => t.StatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Product)
                .WithMany()
                .HasForeignKey(t => t.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- TICKET COMMENTS RELATIONS ----

            modelBuilder.Entity<TicketComment>()
                .HasOne(c => c.Ticket)
                .WithMany()
                .HasForeignKey(c => c.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TicketComment>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- TICKET EVENT HISTORY RELATIONS ----

            modelBuilder.Entity<TicketEventHistory>()
                .HasOne(e => e.Ticket)
                .WithMany()
                .HasForeignKey(e => e.TicketId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TicketEventHistory>()
                .HasOne(e => e.TicketEventType)
                .WithMany()
                .HasForeignKey(e => e.TicketEventTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TicketEventHistory>()
                .HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- TICKET LABEL HISTORY RELATIONS ----

            modelBuilder.Entity<TicketLabelHistory>()
                .HasOne(tlh => tlh.Label)
                .WithMany()
                .HasForeignKey(tlh => tlh.LabelId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TicketLabelHistory>()
                .HasOne(tlh => tlh.Ticket)
                .WithMany()
                .HasForeignKey(tlh => tlh.TicketId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TicketLabelHistory>()
                .HasOne(tlh => tlh.User)
                .WithMany()
                .HasForeignKey(tlh => tlh.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---- USER RELATIONS ----

            modelBuilder.Entity<User>()
                .HasOne(u => u.Firm)
                .WithMany()
                .HasForeignKey(u => u.FirmId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.Privilege)
                .WithMany()
                .HasForeignKey(u => u.PrivilegeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
