import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const bootstrap = async () => {
  await connectDatabase();

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
