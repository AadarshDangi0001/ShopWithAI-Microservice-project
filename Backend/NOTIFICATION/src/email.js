require('dotenv').config();
const nodemailer = require('nodemailer');

const hasAppPassword = Boolean(process.env.EMAIL_PASS);
const hasOAuthConfig =
  Boolean(process.env.CLIENT_ID) &&
  Boolean(process.env.CLIENT_SECRET) &&
  Boolean(process.env.REFRESH_TOKEN);

const useAppPassword = hasAppPassword;

const authConfig = useAppPassword
  ? {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  : hasOAuthConfig
  ? {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    }
  : null;

if (!authConfig) {
  console.error(
    'Email configuration is invalid. Set EMAIL_PASS (recommended) or provide CLIENT_ID, CLIENT_SECRET and REFRESH_TOKEN for OAuth2.'
  );
}

const transporter = authConfig
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: authConfig,
    })
  : null;

// Verify the connection configuration
if (transporter) {
  transporter.verify((error) => {
    if (error) {
      const mode = useAppPassword ? 'app-password' : 'oauth2';
      if (!useAppPassword && error.code === 'EAUTH') {
        console.error(
          'Error connecting to email server (oauth2). Refresh token is invalid or revoked. Add EMAIL_PASS (Gmail app password) to .env for immediate fix, or regenerate OAuth refresh token.'
        );
      } else {
        console.error(`Error connecting to email server (${mode}):`, error);
      }
    } else {
      console.log(
        `Email server is ready to send messages (${useAppPassword ? 'app-password' : 'oauth2'})`
      );
    }
  });
}

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  if (!transporter) {
    console.error('Email send skipped due to invalid email configuration.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Your Name" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendEmail;