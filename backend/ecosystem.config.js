module.exports = {
  apps: [
    {
      name: 'api-certificados',
      script: './server.js',
      instances: 1, // O 'max' para usar todos los núcleos del CPU
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
        // Aquí puedes agregar otras variables si no usas archivo .env
        // O mejor aún, PM2 leerá tu archivo .env si existe en el directorio
      }
    }
  ]
};
