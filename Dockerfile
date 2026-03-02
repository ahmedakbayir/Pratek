# 1) Build aşaması
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# React için node
RUN apt-get update && apt-get install -y nodejs npm

# Dosyaları kopyala
COPY ./server ./server
COPY ./client ./client

# React build
WORKDIR /src/client
RUN npm install && npm run build

# ASP.NET publish
WORKDIR /src/server
RUN dotnet publish -c Release -o /app/publish

# React çıktısını wwwroot'a kopyala
RUN mkdir -p /app/publish/wwwroot
RUN cp -r /src/client/build/* /app/publish/wwwroot/

# 2) Runtime aşaması
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# Port
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Pratek.dll"]
