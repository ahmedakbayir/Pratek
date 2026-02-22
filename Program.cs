using Microsoft.EntityFrameworkCore;
using Protekh.Api.Data;

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

// Auto-migrate and seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Ensure new tables exist even if DB was already created
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS product (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL DEFAULT '',
            ManagerId INTEGER NULL,
            FOREIGN KEY (ManagerId) REFERENCES user(Id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS firm_product (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            FirmId INTEGER NOT NULL,
            ProductId INTEGER NOT NULL,
            FOREIGN KEY (FirmId) REFERENCES firm(Id) ON DELETE CASCADE,
            FOREIGN KEY (ProductId) REFERENCES product(Id) ON DELETE CASCADE
        );
    ");

    DbSeeder.Seed(db);
}

// Global exception handler – returns JSON so the frontend can display the real error
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

app.MapControllers();

app.Run();
