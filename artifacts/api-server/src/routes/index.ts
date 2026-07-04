import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./products.js";
import promotionsRouter from "./promotions.js";
import templatesRouter from "./templates.js";
import generatedImagesRouter from "./generatedImages.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(promotionsRouter);
router.use(templatesRouter);
router.use(generatedImagesRouter);

export default router;
