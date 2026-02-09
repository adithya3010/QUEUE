const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Create email transporter based on environment configuration
 * Supports Gmail, SendGrid, and custom SMTP servers
 */
const createTransporter = () => {
  // For development, use Ethereal (fake SMTP service) or console logging
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
    logger.warn('No email configuration found. Emails will be logged to console only.');
    return null;
  }

  // For testing, disable email sending
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    // Custom SMTP configuration
    const config = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };

    return nodemailer.createTransporter(config);
  } catch (error) {
    logger.error('Failed to create email transporter', { error: error.message });
    return null;
  }
};

const transporter = createTransporter();

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} doctorName - Doctor's name
 * @returns {Promise<boolean>} Success status
 */
const sendPasswordResetEmail = async (email, resetToken, doctorName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Smart Queue',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${doctorName},</p>

            <p>We received a request to reset your password for your Smart Queue account. Click the button below to reset your password:</p>

            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>

            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>

            <p>For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Changing your password regularly</li>
            </ul>

            <p>If you have any questions or concerns, please contact our support team.</p>

            <p>Best regards,<br>The Smart Queue Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Smart Queue. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${doctorName},

We received a request to reset your password for your Smart Queue account.

To reset your password, visit this link:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email. Your password will remain unchanged.

Best regards,
The Smart Queue Team
    `,
  };

  // If no transporter (dev mode without config), log to console
  if (!transporter) {
    logger.info('Password reset email (not sent - no email config):', {
      to: email,
      resetUrl,
      doctorName,
    });
    console.log('\n=====================================');
    console.log('PASSWORD RESET EMAIL (Development Mode)');
    console.log('=====================================');
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('=====================================\n');
    return true; // Return success in dev mode
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent successfully', {
      to: email,
      messageId: info.messageId,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send password reset email', {
      error: error.message,
      to: email,
    });
    return false;
  }
};

/**
 * Send password change confirmation email
 * @param {string} email - Recipient email address
 * @param {string} doctorName - Doctor's name
 * @returns {Promise<boolean>} Success status
 */
const sendPasswordChangeConfirmation = async (email, doctorName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password Changed Successfully - Smart Queue',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .success {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <p>Hello ${doctorName},</p>

            <div class="success">
              <strong>Success!</strong> Your password has been changed successfully.
            </div>

            <p>Your Smart Queue account password was changed on ${new Date().toLocaleString()}.</p>

            <p><strong>If you made this change:</strong><br>
            No further action is needed. You can log in with your new password.</p>

            <p><strong>If you didn't make this change:</strong><br>
            Please contact our support team immediately. Your account security may be compromised.</p>

            <p>Best regards,<br>The Smart Queue Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Smart Queue. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${doctorName},

Your Smart Queue account password was changed successfully on ${new Date().toLocaleString()}.

If you made this change, no further action is needed.

If you didn't make this change, please contact our support team immediately.

Best regards,
The Smart Queue Team
    `,
  };

  // If no transporter (dev mode without config), log to console
  if (!transporter) {
    logger.info('Password change confirmation email (not sent - no email config):', {
      to: email,
      doctorName,
    });
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Password change confirmation email sent successfully', {
      to: email,
      messageId: info.messageId,
    });
    return true;
  } catch (error) {
    logger.error('Failed to send password change confirmation email', {
      error: error.message,
      to: email,
    });
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
};
