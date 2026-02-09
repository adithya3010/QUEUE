const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Queue API',
      version: '1.0.0',
      description: 'API documentation for Smart Queue - A smart hospital queue management system',
      contact: {
        name: 'Smart Queue Team',
        email: 'support@smartqueue.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.smartqueue.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in httpOnly cookie'
        }
      },
      schemas: {
        Doctor: {
          type: 'object',
          required: ['name', 'specialization', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'Doctor ID',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Doctor full name',
              example: 'Dr. John Smith'
            },
            specialization: {
              type: 'string',
              description: 'Medical specialization',
              example: 'Cardiology'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Doctor email address',
              example: 'doctor@hospital.com'
            },
            status: {
              type: 'string',
              enum: ['Available', 'Not Available', 'Break'],
              description: 'Current availability status',
              example: 'Available'
            },
            avgConsultationTime: {
              type: 'number',
              description: 'Average consultation time in minutes',
              example: 8
            }
          }
        },
        Patient: {
          type: 'object',
          required: ['name', 'age', 'phoneNumber', 'doctorId'],
          properties: {
            id: {
              type: 'string',
              description: 'Patient record ID',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              description: 'Patient full name',
              example: 'Jane Doe'
            },
            age: {
              type: 'number',
              minimum: 0,
              maximum: 150,
              description: 'Patient age',
              example: 35
            },
            phoneNumber: {
              type: 'string',
              pattern: '^[0-9]{10}$',
              description: '10-digit phone number',
              example: '9876543210'
            },
            tokenNumber: {
              type: 'number',
              description: 'Queue token number',
              example: 1
            },
            status: {
              type: 'string',
              enum: ['waiting', 'completed', 'cancelled'],
              description: 'Visit status',
              example: 'waiting'
            },
            doctorId: {
              type: 'string',
              description: 'Associated doctor ID',
              example: '507f1f77bcf86cd799439011'
            },
            uniqueLinkId: {
              type: 'string',
              description: 'Unique link for patient status tracking',
              example: 'abc123def456'
            },
            arrivalTime: {
              type: 'string',
              format: 'date-time',
              description: 'Patient arrival timestamp',
              example: '2024-01-15T10:30:00Z'
            },
            completionTime: {
              type: 'string',
              format: 'date-time',
              description: 'Visit completion timestamp',
              example: '2024-01-15T10:45:00Z'
            },
            estimatedWaitTime: {
              type: 'number',
              description: 'Estimated wait time in minutes',
              example: 24
            },
            waitingAhead: {
              type: 'number',
              description: 'Number of patients ahead in queue',
              example: 3
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid credentials'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email format'
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Doctor authentication endpoints'
      },
      {
        name: 'Queue Management',
        description: 'Patient queue operations'
      },
      {
        name: 'Doctors',
        description: 'Doctor profile management'
      }
    ]
  },
  apis: ['./routes/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
