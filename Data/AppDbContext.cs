using Microsoft.EntityFrameworkCore;
using Protekh.Api.Models;

namespace Protekh.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // ---- TABLES ----

        public DbSet<User> Users { get; set; }
        public DbSet<Firm> Firms { get; set; }
        public DbSet<Tag> Tags { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<TicketTag> TicketTags { get; set; }
        public DbSet<EventLog> EventLogs { get; set; }

        public DbSet<EntityTypeLookup> EntityTypes { get; set; }
        public DbSet<EventType> EventTypes { get; set; }
        public DbSet<TicketStatus> TicketStatuses { get; set; }
        public DbSet<TicketPriority> TicketPriorities { get; set; }
        public DbSet<Yetki> Yetkiler { get; set; }

        // ---- MAPPING ----

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // TABLE NAME MAPPING
            modelBuilder.Entity<User>().ToTable("user");
            modelBuilder.Entity<Firm>().ToTable("firm");
            modelBuilder.Entity<Tag>().ToTable("tag");
            modelBuilder.Entity<Ticket>().ToTable("ticket");
            modelBuilder.Entity<TicketTag>().ToTable("ticket_tag");
            modelBuilder.Entity<EventLog>().ToTable("event_log");

            modelBuilder.Entity<EntityTypeLookup>().ToTable("entity_type");
            modelBuilder.Entity<EventType>().ToTable("event_type");
            modelBuilder.Entity<TicketStatus>().ToTable("ticket_status");
            modelBuilder.Entity<TicketPriority>().ToTable("ticket_priority");
            modelBuilder.Entity<Yetki>().ToTable("yetki");

            // ---- RELATIONS ----

            modelBuilder.Entity<Ticket>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(t => t.AssignedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne<Firm>()
                .WithMany()
                .HasForeignKey(t => t.FirmId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TicketTag>()
                .HasOne<Ticket>()
                .WithMany()
                .HasForeignKey(tt => tt.TicketId);

            modelBuilder.Entity<TicketTag>()
                .HasOne<Tag>()
                .WithMany()
                .HasForeignKey(tt => tt.TagId);

            // ---- EVENT LOG RELATIONS ----

            modelBuilder.Entity<EventLog>()
                .HasOne(e => e.EntityType)
                .WithMany()
                .HasForeignKey(e => e.EntityTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EventLog>()
                .HasOne(e => e.EventType)
                .WithMany()
                .HasForeignKey(e => e.EventTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EventLog>()
                .HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}