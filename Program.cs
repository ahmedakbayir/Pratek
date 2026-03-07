using Microsoft.EntityFrameworkCore;
using Pratek.Data;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 1. JSON Ayarları: Tüm C# property'leri Frontend için otomatik camelCase'e dönüştürülür.
builder.Services.AddControllers()
    .AddJsonOptions(options => 
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. CORS Ayarları
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// 3. Veritabanı Bağlantısı (SQLite)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// 4. Veritabanı Otomatik Migration (Eski, ilkel SQL sorguları silindi)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate(); // Tabloları ve Seed (tohum) verilerini oluşturur veya günceller
}

// 5. Dosya Yükleme Klasörü Kontrolü
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "Uploads");
Directory.CreateDirectory(uploadsPath);

// 6. Global Hata Yakalama (Middleware)
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

// 7. Dosya Yükleme API'si
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