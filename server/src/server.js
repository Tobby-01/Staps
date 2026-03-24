import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import {
  formatMailErrorForLog,
  getMailConfigWarnings,
  getMailDiagnosticContext,
  verifyMailTransport,
} from "./services/mail.service.js";

const bootstrap = async () => {
  await connectDatabase();

  try {
    const mailStatus = await verifyMailTransport();
    console.log(
      `SMTP ready on ${mailStatus.host}:${mailStatus.port} as ${mailStatus.user}`,
    );

    const mailWarnings = getMailConfigWarnings();
    mailWarnings.forEach((warning) => {
      console.warn(`Mail configuration warning: ${warning}`);
    });
  } catch (error) {
    console.error("SMTP verification failed. Email notifications will not send.");
    console.error("Mail transport context:", getMailDiagnosticContext());
    console.error("Mail transport error details:", formatMailErrorForLog(error));
    console.error(
      "Tip: set SMTP_DEBUG=true in server/.env to print Nodemailer SMTP handshake logs.",
    );
  }

  app.listen(env.port, () => {
    console.log(`STAPS API running on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server");
  console.error(
    "Check that MongoDB is running and that server/.env points to a valid MONGODB_URI.",
  );
  console.error(error);
  process.exit(1);
});
