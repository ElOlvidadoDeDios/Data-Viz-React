import { Router, type IRouter } from "express";
import healthRouter from "./health";
import preventivaRouter from "./preventiva";
import filtrosRouter from "./filtros";
import calendarioRouter from "./calendario";
// 1. Importamos la nueva ruta
import gerenciaRouter from "./gerencia";
import supervisionRouter from "./supervision";
import agenciaRouter from "./agencia";
import asesoresRouter from "./asesores";

const router: IRouter = Router();

router.use(healthRouter);
router.use(preventivaRouter);
router.use(filtrosRouter);
router.use(calendarioRouter);
// 2. Le decimos a Express que la use
router.use(gerenciaRouter);
router.use(supervisionRouter);
router.use(agenciaRouter);
router.use(asesoresRouter);

export default router;