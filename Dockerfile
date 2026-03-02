# 1) Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# React için node
RUN apt-get update && apt-get install -y nodejs npm

# Projeyi kopyala
COPY . .

# React (frontend) build
WORKDIR /src/frontend
RUN npm install
RUN npm run build

# ASP.NET publish
WORKDIR /src
RUN dotnet publish Pratek.csproj -c Release -o /app/publish

# React build çıktısını ASP.NET içinde wwwroot'a kopyala
RUN mkdir -p /app/publish/wwwroot
RUN cp -r /src/frontend/build/* /app/publish/wwwroot/

# 2) Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

CMD ["dotnet", "Pratek.dll"]