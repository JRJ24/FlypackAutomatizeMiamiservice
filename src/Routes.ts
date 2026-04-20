import { Router, Request, Response } from "express";
import userRouter from "./routes/users.routes";
import processRouter from "./routes/process.routes";
import authRouter from "./routes/auth.routes";
import palletRouter from "./routes/pallets.routes";
import priceRouter from "./routes/price.routes";
import inventoryRouter from "./routes/inventory.routes";
import maintenanceRouter from "./routes/maintenances.routes";

const router: Router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/process", processRouter);
router.use("/pallets", palletRouter);
router.use("/price", priceRouter);
router.use("/inventory", inventoryRouter);
router.use("/maintenance", maintenanceRouter);

export default router;
