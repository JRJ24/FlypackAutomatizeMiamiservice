import { Router, Request, Response } from 'express';
import userRouter from './routes/users.routes';
import processRouter from './routes/process.routes';
const router: Router = Router();

router.use("/users", userRouter);
router.use("/process", processRouter);

export default router;