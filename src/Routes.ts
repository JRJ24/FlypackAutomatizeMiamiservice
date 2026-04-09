import { Router, Request, Response } from 'express';
import userRouter from './routes/users.routes';
import processRouter from './routes/process.routes';
import authRouter from './routes/auth.routes';
import palletRouter from './routes/pallets.routes';

const router: Router = Router();

router.use('/auth', authRouter)
router.use("/users", userRouter);
router.use("/process", processRouter);
router.use("/pallets", palletRouter);

export default router;