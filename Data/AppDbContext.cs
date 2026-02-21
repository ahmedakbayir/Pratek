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
        public DbSet<TicketComment> TicketComments { get; set; }
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
            modelBuilder.Entity<TicketComment>().ToTable("ticket_comment");
            modelBuilder.Entity<EventLog>().ToTable("event_log");

            modelBuilder.Entity<EntityTypeLookup>().ToTable("entity_type");
            modelBuilder.Entity<EventType>().ToTable("event_type");
            modelBuilder.Entity<TicketStatus>().ToTable("ticket_status");
            modelBuilder.Entity<TicketPriority>().ToTable("ticket_priority");
            modelBuilder.Entity<Yetki>().ToTable("yetki");

            // ---- TICKET RELATIONS ----

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.AssignedUser)
                .WithMany()
                .HasForeignKey(t => t.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Firm)
                .WithMany()
                .HasForeignKey(t => t.FirmId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Status)
                .WithMany()
                .HasForeignKey(t => t.TicketStatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Priority)
                .WithMany()
                .HasForeignKey(t => t.TicketPriorityId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasMany(t => t.TicketTags)
                .WithOne(tt => tt.Ticket)
                .HasForeignKey(tt => tt.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- TICKET TAG RELATIONS ----

            modelBuilder.Entity<TicketTag>()
                .HasOne(tt => tt.Tag)
                .WithMany()
                .HasForeignKey(tt => tt.TagId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---- COMMENT RELATIONS ----

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
