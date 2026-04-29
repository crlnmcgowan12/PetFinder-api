require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const authRoutes = require('./src/routes/auth.routes');
const shelterRoutes = require('./src/routes/shelter.routes');
const petRoutes = require('./src/routes/pet.routes');
const applicationRoutes = require('./src/routes/application.routes');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// api
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📄 Swagger docs available at /api/docs');
} catch (err) {
  console.warn('⚠️  Could not load OpenAPI spec:', err.message);
}

// routes
app.use('/api/auth', authRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/applications', applicationRoutes);

// health
app.get('/', (req, res) => {
  res.json({
    message: '🐾 Pet Finder API is running',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// global error handler 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
