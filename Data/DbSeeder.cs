using Pratek.Models;

namespace Pratek.Data
{
    public static class DbSeeder
    {
        public static void Seed(AppDbContext db)
        {
            bool changed = false;

            // ---- TICKET STATUS ----
            if (!db.TicketStatuses.Any())
            {
                db.TicketStatuses.AddRange(
                    new TicketStatus { Id = 1, Name = "Açık", IsClosed = false, OrderNo = 1 },
                    new TicketStatus { Id = 2, Name = "Devam Ediyor", IsClosed = false, OrderNo = 2 },
                    new TicketStatus { Id = 3, Name = "Çözümlendi", IsClosed = true, OrderNo = 3 },
                    new TicketStatus { Id = 4, Name = "Kapalı", IsClosed = true, OrderNo = 4 }
                );
                changed = true;
            }

            // ---- TICKET PRIORITY ----
            if (!db.TicketPriorities.Any())
            {
                db.TicketPriorities.AddRange(
                    new TicketPriority { Id = 1, Name = "Kritik", OrderNo = 1 },
                    new TicketPriority { Id = 2, Name = "Yüksek", OrderNo = 2 },
                    new TicketPriority { Id = 3, Name = "Normal", OrderNo = 3 },
                    new TicketPriority { Id = 4, Name = "Düşük", OrderNo = 4 }
                );
                changed = true;
            }

            // ---- ENTITY ----
            if (!db.Entities.Any())
            {
                db.Entities.AddRange(
                    new Entity { Id = 1, Name = "User" },
                    new Entity { Id = 2, Name = "Ticket" },
                    new Entity { Id = 3, Name = "Firm" },
                    new Entity { Id = 4, Name = "Label" }
                );
                changed = true;
            }

            // ---- ENTITY EVENT TYPE ----
            if (!db.EntityEventTypes.Any())
            {
                db.EntityEventTypes.AddRange(
                    new EntityEventType { Id = 1, Name = "Created" },
                    new EntityEventType { Id = 2, Name = "Updated" },
                    new EntityEventType { Id = 3, Name = "Assigned" },
                    new EntityEventType { Id = 4, Name = "Deleted" }
                );
                changed = true;
            }

            // ---- TICKET EVENT TYPE ----
            if (!db.TicketEventTypes.Any())
            {
                db.TicketEventTypes.AddRange(
                    new TicketEventType { Id = 1, Name = "Created" },
                    new TicketEventType { Id = 2, Name = "Updated" },
                    new TicketEventType { Id = 3, Name = "StatusChanged" },
                    new TicketEventType { Id = 4, Name = "Assigned" },
                    new TicketEventType { Id = 5, Name = "Deleted" }
                );
                changed = true;
            }

            // ---- PRIVILEGE ----
            if (!db.Privileges.Any())
            {
                db.Privileges.AddRange(
                    new Privilege { Id = 1, Name = "Admin", OrderNo = 1 },
                    new Privilege { Id = 2, Name = "Agent", OrderNo = 2 },
                    new Privilege { Id = 3, Name = "Müşteri", OrderNo = 3 }
                );
                changed = true;
            }

            if (changed)
                db.SaveChanges();
        }
    }
}
