import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import promotionsRouter from "./promotions.js";
import templatesRouter from "./templates.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(promotionsRouter);
router.use(templatesRouter);

export default router;
