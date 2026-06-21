import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tleRouter from "./tle";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tleRouter);

export default router;
