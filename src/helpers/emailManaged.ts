import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAILUSER,
    pass: process.env.EMAILPASS,
  },
});

export const emailForgotPassword = async (email: string, resetLink: string) => {
  const mailOptions = {
    from: `"Flypack Process" <${process.env.EMAILUSER}>`,
    to: email,
    subject:
      "I don't remember the password, IGNORE THIS EMAIL IF IT WASN'T YOU",
    html: `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; color: #1f2937; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
        .header { background-color: #2563eb; padding: 40px 20px; text-align: center; }
        .content { padding: 40px; text-align: center; }
        .icon-box { background: #eff6ff; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
        h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #111827; }
        p { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px; }
        .button { background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s; }
        .footer { padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #fdfdfd; border-top: 1px solid #f3f4f6; }
        .warning { font-size: 13px; margin-top: 24px; color: #9ca3af; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <div class="icon-box">
             <span style="font-size: 32px; color: #2563eb;">🔒</span>
          </div>
          <h1>Reset your password</h1>
          <p>We received a request to reset the password for your Flypack Process account. Click the button below to choose a new one:</p>
          
          <a href="${resetLink}" class="button">Reset Password</a>
          
          <p class="warning">If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
        </div>
        <div class="footer">
          &copy; 2026 Flypack Process. All rights reserved.<br>
          This is an automated message, please do not reply.
        </div>
      </div>
    </body>
    </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending administration notification:", error);
    throw error;
  }
};
