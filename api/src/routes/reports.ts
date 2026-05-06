/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: API endpoints for supply chain reports
 */

/**
 * @swagger
 * /api/reports/low-stock:
 *   get:
 *     summary: Get all low-stock products
 *     tags: [Reports]
 *     description: Returns all products where current stock level is below their reorder level.
 *     responses:
 *       200:
 *         description: List of low-stock products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   productId:
 *                     type: integer
 *                     description: The unique identifier for the product
 *                   name:
 *                     type: string
 *                     description: The name of the product
 *                   stockLevel:
 *                     type: integer
 *                     description: Current stock level of the product
 *                   reorderLevel:
 *                     type: integer
 *                     description: Minimum stock level before reorder is needed
 */

import express from 'express';
import { getProductsRepository } from '../repositories/productsRepo';

const router = express.Router();

// Get all low-stock products
router.get('/low-stock', async (req, res, next) => {
  try {
    const repo = await getProductsRepository();
    const lowStockProducts = await repo.findLowStock();
    res.json(lowStockProducts);
  } catch (error) {
    next(error);
  }
});

export default router;
