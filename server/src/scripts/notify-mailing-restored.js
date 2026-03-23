import { connectDatabase } from "../config/database.js";
import { User } from "../models/user.model.js";
import { sendMailingRestoredEmail } from "../services/mail.service.js";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  await connectDatabase();

  const users = await User.find({
    email: { $exists: true, $ne: null },
  })
    .select("name email")
    .sort({ createdAt: 1 })
    .lean();

  console.log(`Found ${users.length} users to notify.`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await sendMailingRestoredEmail({
        to: user.email,
        name: user.name,
      });
      sent += 1;
      console.log(`Sent ${sent}/${users.length}: ${user.email}`);
      await pause(200);
    } catch (error) {
      failed += 1;
      console.error(`Failed for ${user.email}: ${error?.message || error}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        total: users.length,
        sent,
        failed,
      },
      null,
      2,
    ),
  );

  process.exit(0);
};

main().catch((error) => {
  console.error("Failed to send mailing-restored broadcast");
  console.error(error);
  process.exit(1);
});
