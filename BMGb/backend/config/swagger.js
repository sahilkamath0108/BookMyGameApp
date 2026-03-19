const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BookMyGame API Documentation',
      version: '1.0.0',
      description: 'API documentation for BookMyGame tournament management platform',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: [
    path.join(__dirname, '../docs/swagger/*.yaml'), // Load YAML files from docs/swagger directory
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec; 