const request = require('supertest');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const app = require('../../server');
const Doctor = require('../../models/Doctor');
const { sendPasswordResetEmail, sendPasswordChangeConfirmation } = require('../../utils/emailService');

// Mock the email service
jest.mock('../../utils/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPasswordChangeConfirmation: jest.fn().mockResolvedValue(true)
}));

describe('Password Reset Routes', () => {
  let testDoctor;
  let testEmail;

  beforeEach(async () => {
    // Clear doctors collection
    await Doctor.deleteMany({});

    // Create a test doctor
    testEmail = `test${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash('TestPassword123', 10);
    testDoctor = await Doctor.create({
      name: 'Test Doctor',
      specialization: 'General',
      email: testEmail,
      password: hashedPassword
    });

    // Clear mock calls
    sendPasswordResetEmail.mockClear();
    sendPasswordChangeConfirmation.mockClear();
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body.message).toContain('If an account exists');
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
        'Test Doctor'
      );

      // Verify reset token was saved to database
      const updatedDoctor = await Doctor.findById(testDoctor._id);
      expect(updatedDoctor.resetPasswordToken).toBeDefined();
      expect(updatedDoctor.resetPasswordExpiry).toBeDefined();
      expect(updatedDoctor.resetPasswordExpiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return same message for non-existent email (prevent enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('If an account exists');
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should fail without email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Email is required');
    });

    it('should set reset token expiry to 1 hour', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      const updatedDoctor = await Doctor.findById(testDoctor._id);
      const oneHour = 60 * 60 * 1000;
      const expectedExpiry = Date.now() + oneHour;
      const actualExpiry = updatedDoctor.resetPasswordExpiry.getTime();

      // Allow 5 second tolerance for test execution time
      expect(actualExpiry).toBeGreaterThan(Date.now());
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 5000);
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    let resetToken;
    let hashedToken;

    beforeEach(async () => {
      // Generate a valid reset token
      resetToken = crypto.randomBytes(32).toString('hex');
      hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Set reset token in database
      testDoctor.resetPasswordToken = hashedToken;
      testDoctor.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await testDoctor.save();
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword456';

      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      expect(response.body.message).toContain('reset successfully');

      // Verify password was changed
      const updatedDoctor = await Doctor.findById(testDoctor._id);
      const isMatch = await bcrypt.compare(newPassword, updatedDoctor.password);
      expect(isMatch).toBe(true);

      // Verify reset token was cleared
      expect(updatedDoctor.resetPasswordToken).toBeUndefined();
      expect(updatedDoctor.resetPasswordExpiry).toBeUndefined();

      // Verify confirmation email was sent
      expect(sendPasswordChangeConfirmation).toHaveBeenCalledWith(
        testEmail,
        'Test Doctor'
      );
    });

    it('should fail with invalid token', async () => {
      const invalidToken = crypto.randomBytes(32).toString('hex');

      const response = await request(app)
        .post(`/api/auth/reset-password/${invalidToken}`)
        .send({ password: 'NewPassword456' })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with expired token', async () => {
      // Set token expiry to past
      testDoctor.resetPasswordExpiry = new Date(Date.now() - 1000);
      await testDoctor.save();

      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'NewPassword456' })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'short' })
        .expect(400);

      expect(response.body.message).toContain('at least 8 characters');
    });

    it('should fail without password', async () => {
      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('at least 8 characters');
    });

    it('should not allow reusing the same reset token', async () => {
      const newPassword = 'NewPassword456';

      // First reset - should work
      await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      // Try to reuse token - should fail
      const response = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'AnotherPassword789' })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should old password should not work after reset', async () => {
      const newPassword = 'NewPassword456';
      const oldPassword = 'TestPassword123';

      // Reset password
      await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      // Try to login with old password - should fail
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: oldPassword })
        .expect(401);

      expect(loginResponse.body.message).toBe('Invalid credentials');

      // Login with new password - should work
      await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: newPassword })
        .expect(200);
    });
  });
});
