import { dbConnection } from "../config/database";
import processRouterSeeder from "../seeders/process";
import priceSeeder from "../seeders/prices";
import { MaintenanceCostSeeders } from "../seeders/maintenanceCost";
import seedUsers from "../seeders/userClients";
import MaintenanceBanks from "../seeders/banksAccounts";
import seedFutureCounters from "../seeders/counterYear";

const runSeeders = async () => {
  await dbConnection();
  await processRouterSeeder();
  await priceSeeder();
  await MaintenanceCostSeeders();
  await seedUsers();
  await MaintenanceBanks();
  await seedFutureCounters();
};

runSeeders()
  .then(() => {
    console.log("Seeders completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeders failed", error);
    process.exit(1);
  });
