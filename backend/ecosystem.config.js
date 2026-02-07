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