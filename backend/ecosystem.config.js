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
  env: {
      NODE_ENV: 'production',
      PORT: 4000,
      DATABASE_URL: 'postgres://sitech_user:TuContraseñaSegura123@localhost:5432/sistema_certificados'
    }
    }
  ]
};
