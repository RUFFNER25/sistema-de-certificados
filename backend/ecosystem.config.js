module.exports = {
  apps: [
    {
      name: 'api-certificados',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        // IMPORTANTE: Reemplaza 'usuario_postgres' y 'password_postgres' con tus credenciales reales
        DATABASE_URL: 'postgres://usuario_postgres:password_postgres@localhost:5432/sistema_certificados'
      }
    }
  ]
};

# Admin subdomain
server {
    listen 80;
    server_name admincertificados.jcecoguardians.com;

    client_max_body_size 500M;

    # Redirect from / to /admin
    location = / {
        return 301 http://admin.bnbtingo.online/admin;
    }

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}