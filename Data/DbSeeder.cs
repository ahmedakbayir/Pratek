using Protekh.Api.Models;

namespace Protekh.Api.Data
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
                    new TicketPriority { Id = 1, Name = "Kritik", Level = 1 },
                    new TicketPriority { Id = 2, Name = "Yüksek", Level = 2 },
                    new TicketPriority { Id = 3, Name = "Normal", Level = 3 },
                    new TicketPriority { Id = 4, Name = "Düşük", Level = 4 }
                );
                changed = true;
            }

            // ---- ENTITY TYPES ----
            if (!db.EntityTypes.Any())
            {
                db.EntityTypes.AddRange(
                    new EntityTypeLookup { Id = 1, Name = "User" },
                    new EntityTypeLookup { Id = 2, Name = "Ticket" },
                    new EntityTypeLookup { Id = 3, Name = "Firm" },
                    new EntityTypeLookup { Id = 4, Name = "Tag" }
                );
                changed = true;
            }

            // ---- EVENT TYPES ----
            if (!db.EventTypes.Any())
            {
                db.EventTypes.AddRange(
                    new EventType { Id = 1, Name = "Created" },
                    new EventType { Id = 2, Name = "Updated" },
                    new EventType { Id = 3, Name = "Assigned" },
                    new EventType { Id = 4, Name = "Deleted" }
                );
                changed = true;
            }

            // ---- YETKI (ROLES) ----
            if (!db.Yetkiler.Any())
            {
                db.Yetkiler.AddRange(
                    new Yetki { Id = 1, Name = "Admin" },
                    new Yetki { Id = 2, Name = "Agent" },
                    new Yetki { Id = 3, Name = "Müşteri" }
                );
                changed = true;
            }

            if (changed)
                db.SaveChanges();
        }
    }
}
