using Microsoft.EntityFrameworkCore;
using Pratek.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// Auto-create database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    string[] migrations = new[]
    {
        "ALTER TABLE Ticket ADD COLUMN Scope TEXT",
        "ALTER TABLE TicketPriority ADD COLUMN ColorHex TEXT",
        "ALTER TABLE TicketStatus ADD COLUMN ColorHex TEXT",
        "ALTER TABLE Privilege ADD COLUMN ColorHex TEXT",
        "ALTER TABLE Firm ADD COLUMN AvatarUrl TEXT",
        "ALTER TABLE Product ADD COLUMN AvatarUrl TEXT",
    };
    foreach (var sql in migrations)
    {
        try { db.Database.ExecuteSqlRaw(sql); }
        catch { /* Column already exists */ }
    }

    // Seed TicketEventTypes
    var eventTypes = new Dictionary<int, string>
    {
        { 1, "TicketCreated" },
        { 2, "TicketUpdated" },
        { 3, "TicketAssigned" },
        { 4, "TicketClosed" },
        { 5, "TicketStatusChanged" },
        { 6, "TicketPriorityChanged" },
        { 7, "TicketLabelAdded" },
        { 8, "TicketLabelRemoved" },
        { 9, "TicketCommentAdded" },
        { 10, "TicketCommentRemoved" },
        { 11, "TicketUnassigned" },
        { 12, "TicketReopened" },
        { 13, "TicketDeleted" },
    };
    foreach (var (etId, etName) in eventTypes)
    {
        var exists = db.TicketEventTypes.Find(etId);
        if (exists == null)
        {
            db.TicketEventTypes.Add(new Pratek.Models.TicketEventType { Id = etId, Name = etName });
        }
        else if (exists.Name != etName)
        {
            exists.Name = etName;
        }
    }
    db.SaveChanges();
}

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "Uploads");
Directory.CreateDirectory(uploadsPath);

app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var inner = ex.InnerException?.Message;
        await context.Response.WriteAsJsonAsync(new
        {
            error = ex.Message,
            detail = inner
        });
    }
});

app.UseCors("AllowFrontend");

app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "Uploads")),
    RequestPath = "/uploads"
});

app.MapControllers();

app.MapPost("/api/upload", async (HttpContext context) =>
{
    var file = context.Request.Form.Files.FirstOrDefault();
    if (file == null || file.Length == 0)
        return Results.BadRequest(new { error = "Dosya seçilmedi" });

    var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "Uploads");
    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var filePath = Path.Combine(uploadsDir, fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    return Results.Ok(new
    {
        url = $"/uploads/{fileName}",
        name = file.FileName,
        size = file.Length,
        contentType = file.ContentType
    });
}).DisableAntiforgery();

app.Run();