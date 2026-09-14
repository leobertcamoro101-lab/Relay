import SibApiV3Sdk from "sib-api-v3-sdk";

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendResetPasswordEmail = async (toEmail: string, resetToken: string): Promise<void> => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await apiInstance.sendTransacEmail({
    sender: { email: process.env.GMAIL_USER, name: "Relay" },
    to: [{ email: toEmail }],
    subject: "Reset your Relay password",
    htmlContent: `
      <p>You requested a password reset for your Relay account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};

export default sendResetPasswordEmail;