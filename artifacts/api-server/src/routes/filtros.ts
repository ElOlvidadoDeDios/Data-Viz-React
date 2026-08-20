import { Router, Request, Response } from "express";
import sql from "mssql/msnodesqlv8.js";

const router = Router();

const dbConfig = {
  server: process.env.DB_DWH_SERVER || "DESKTOP-K6HIFFS",
  database: process.env.DB_DWH_NAME || "DWH_Gestion_Cartera",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
  },
};

// En lugar de "/api/filtros", usamos un arreglo para atrapar ambas posibilidades:
router.get(["/filtros", "/api/filtros"], async (_req: Request, res: Response) => {
  // ... tu código de conexión a SQL Server queda igual ...
  try {
    const pool = await sql.connect(dbConfig);
    
    const periodos = await pool.request().query(`
      SELECT DISTINCT [Periodo] 
      FROM [dm_productividad].[dbo].[dim_calendario] 
      WHERE [Periodo] IS NOT NULL
      ORDER BY [Periodo] DESC
    `);

    const asesores = await pool.request().query(`
      SELECT DISTINCT [Periodo], [IdSAgencia], [Asesor] 
      FROM [DWH_Gestion_Cartera].[dbo].[dim_asesor]
      WHERE [Asesor] IS NOT NULL
    `);

    res.json({
      periodos: periodos.recordset.map(p => p.Periodo),
      asesores: asesores.recordset
    });
  } catch (error) {
    console.error("Error obteniendo filtros:", error);
    res.status(500).json({ error: "Error obteniendo filtros" });
  }
});

export default router;