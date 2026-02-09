const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const authRoutes = require('../../routes/authRoutes');
const queueRoutes = require('../../routes/queueRoutes');
const doctorRoutes = require('../../routes/doctorRoutes');
const Doctor = require('../../models/Doctor');
const Patient = require('../../models/Patient');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser());

// Mock socket.io
global.io = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/queue', queueRoutes);

describe('Queue Routes', () => {
  let authToken;
  let doctorId;

  beforeEach(async () => {
    // Create and login a doctor before each test
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Dr. Queue Test',
        specialization: 'General Medicine',
        email: 'queue.test@example.com',
        password: 'QueueTest123'
      });

    doctorId = signupResponse.body.doctor.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'queue.test@example.com',
        password: 'QueueTest123'
      });

    // Extract token from cookie
    const cookieHeader = loginResponse.headers['set-cookie'][0];
    authToken = cookieHeader.split('token=')[1].split(';')[0];
  });

  describe('POST /api/queue/add', () => {
    it('should add a patient to queue with valid data', async () => {
      const patientData = {
        name: 'John Patient',
        description: 'Fever and headache',
        number: '1234567890'
      };

      const response = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send(patientData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Patient added successfully');
      expect(response.body.patient).toHaveProperty('name', patientData.name);
      expect(response.body.patient).toHaveProperty('tokenNumber', 1);
      expect(response.body.patient).toHaveProperty('uniqueLinkId');
      expect(response.body).toHaveProperty('statusLink');

      // Verify patient was created in database
      const patient = await Patient.findOne({ name: patientData.name });
      expect(patient).toBeTruthy();
      expect(patient.status).toBe('waiting');
    });

    it('should assign incremental token numbers', async () => {
      const patient1 = {
        name: 'Patient One',
        description: 'Checkup',
        number: '1111111111'
      };

      const patient2 = {
        name: 'Patient Two',
        description: 'Follow-up',
        number: '2222222222'
      };

      const response1 = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send(patient1);

      const response2 = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send(patient2);

      expect(response1.body.patient.tokenNumber).toBe(1);
      expect(response2.body.patient.tokenNumber).toBe(2);
    });

    it('should fail without authentication', async () => {
      const patientData = {
        name: 'Unauthorized Patient',
        description: 'Test',
        number: '9999999999'
      };

      const response = await request(app)
        .post('/api/queue/add')
        .send(patientData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail with invalid phone number', async () => {
      const patientData = {
        name: 'Invalid Phone',
        description: 'Test',
        number: '123' // Invalid - too short
      };

      const response = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send(patientData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Patient'
        // Missing description and number
      };

      const response = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('should emit socket event when patient added', async () => {
      const patientData = {
        name: 'Socket Test Patient',
        description: 'Testing socket',
        number: '5555555555'
      };

      await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send(patientData);

      expect(global.io.to).toHaveBeenCalledWith(doctorId.toString());
      expect(global.io.emit).toHaveBeenCalledWith('queueUpdated');
    });
  });

  describe('GET /api/queue/:doctorId', () => {
    beforeEach(async () => {
      // Add some patients to the queue
      const patients = [
        { name: 'Patient 1', description: 'Test 1', number: '1111111111' },
        { name: 'Patient 2', description: 'Test 2', number: '2222222222' },
        { name: 'Patient 3', description: 'Test 3', number: '3333333333' }
      ];

      for (const patient of patients) {
        await request(app)
          .post('/api/queue/add')
          .set('Cookie', [`token=${authToken}`])
          .send(patient);
      }
    });

    it('should get all waiting patients for a doctor', async () => {
      const response = await request(app)
        .get(`/api/queue/${doctorId}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('name', 'Patient 1');
      expect(response.body[0]).toHaveProperty('tokenNumber', 1);
    });

    it('should include wait time calculations', async () => {
      const response = await request(app)
        .get(`/api/queue/${doctorId}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body[0]).toHaveProperty('waitMinutes');
      expect(response.body[0]).toHaveProperty('etaTime');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/queue/${doctorId}`)
        .expect(401);
    });

    it('should return 404 for non-existent doctor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/queue/${fakeId}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Doctor not found');
    });
  });

  describe('GET /api/queue/status/:uniqueLinkId', () => {
    let patient;

    beforeEach(async () => {
      // Add a patient
      const response = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send({
          name: 'Status Test Patient',
          description: 'Testing status',
          number: '7777777777'
        });

      patient = response.body.patient;
    });

    it('should get patient status by unique link (no auth required)', async () => {
      const response = await request(app)
        .get(`/api/queue/status/${patient.uniqueLinkId}`)
        .expect(200);

      expect(response.body).toHaveProperty('myStatus', 'waiting');
      expect(response.body).toHaveProperty('myTokenNumber', 1);
      expect(response.body).toHaveProperty('myPosition', 1);
      expect(response.body).toHaveProperty('avgTime');
      expect(response.body).toHaveProperty('queue');
    });

    it('should return 404 for invalid unique link', async () => {
      const response = await request(app)
        .get('/api/queue/status/invalid-link-id')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Invalid link');
    });

    it('should show completed status', async () => {
      // Complete the patient
      await Patient.findByIdAndUpdate(patient._id, {
        status: 'completed',
        completedAt: new Date()
      });

      const response = await request(app)
        .get(`/api/queue/status/${patient.uniqueLinkId}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('message', 'Thank you for visiting');
    });
  });

  describe('PUT /api/queue/complete/:id', () => {
    let patient;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send({
          name: 'Complete Test',
          description: 'To be completed',
          number: '8888888888'
        });

      patient = response.body.patient;
    });

    it('should mark patient as completed', async () => {
      const response = await request(app)
        .put(`/api/queue/complete/${patient._id}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('completedAt');

      // Verify in database
      const updatedPatient = await Patient.findById(patient._id);
      expect(updatedPatient.status).toBe('completed');
      expect(updatedPatient.completedAt).toBeTruthy();
    });

    it('should emit socket events on completion', async () => {
      // Clear previous calls
      global.io.to.mockClear();
      global.io.emit.mockClear();

      await request(app)
        .put(`/api/queue/complete/${patient._id}`)
        .set('Cookie', [`token=${authToken}`]);

      expect(global.io.to).toHaveBeenCalledWith(doctorId.toString());
      expect(global.io.to).toHaveBeenCalledWith(patient.uniqueLinkId);
      expect(global.io.emit).toHaveBeenCalledWith('queueUpdated');
      expect(global.io.emit).toHaveBeenCalledWith('visitCompleted', expect.any(Object));
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/queue/complete/${patient._id}`)
        .expect(401);
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/queue/complete/${fakeId}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Patient not found');
    });
  });

  describe('PUT /api/queue/cancel/:id', () => {
    let patient;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/queue/add')
        .set('Cookie', [`token=${authToken}`])
        .send({
          name: 'Cancel Test',
          description: 'To be cancelled',
          number: '9999999999'
        });

      patient = response.body.patient;
    });

    it('should mark patient as cancelled', async () => {
      const response = await request(app)
        .put(`/api/queue/cancel/${patient._id}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('status', 'cancelled');

      // Verify in database
      const updatedPatient = await Patient.findById(patient._id);
      expect(updatedPatient.status).toBe('cancelled');
    });

    it('should emit socket events on cancellation', async () => {
      global.io.to.mockClear();
      global.io.emit.mockClear();

      await request(app)
        .put(`/api/queue/cancel/${patient._id}`)
        .set('Cookie', [`token=${authToken}`]);

      expect(global.io.emit).toHaveBeenCalledWith('queueUpdated');
      expect(global.io.emit).toHaveBeenCalledWith('visitCancelled', expect.any(Object));
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/queue/cancel/${patient._id}`)
        .expect(401);
    });
  });

  describe('GET /api/queue/history/', () => {
    beforeEach(async () => {
      // Add and complete some patients
      for (let i = 1; i <= 3; i++) {
        const response = await request(app)
          .post('/api/queue/add')
          .set('Cookie', [`token=${authToken}`])
          .send({
            name: `History Patient ${i}`,
            description: `Test ${i}`,
            number: `${i}${i}${i}${i}${i}${i}${i}${i}${i}${i}`
          });

        await Patient.findByIdAndUpdate(response.body.patient._id, {
          status: i % 2 === 0 ? 'completed' : 'cancelled',
          completedAt: new Date()
        });
      }
    });

    it('should get completed and cancelled patients', async () => {
      const response = await request(app)
        .get('/api/queue/history/')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/queue/history/?status=completed')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.every(p => p.status === 'completed')).toBe(true);
    });

    it('should filter by name search', async () => {
      const response = await request(app)
        .get('/api/queue/history/?search=Patient 1')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.some(p => p.name.includes('Patient 1'))).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/queue/history/')
        .expect(401);
    });
  });
});
