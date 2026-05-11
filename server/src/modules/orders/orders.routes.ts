import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { authorize } from "../../middlewares/rbac";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getMyOrders,
} from "./orders.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders (ADMIN/STAFF only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 *       403:
 *         description: Forbidden
 */
router.get("/", authenticate, authorize(["ADMIN", "STAFF"]), getOrders);

/**
 * @swagger
 * /orders/mine:
 *   get:
 *     summary: Get current customer's own orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of current user's orders
 *       401:
 *         description: Not authenticated
 */
router.get("/mine", authenticate, authorize(["CUSTOMER"]), getMyOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID (ADMIN/STAFF see any; CUSTOMER sees own only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order data
 *       403:
 *         description: Forbidden (CUSTOMER trying to access another user's order)
 *       404:
 *         description: Order not found
 */
router.get(
  "/:id",
  authenticate,
  authorize(["ADMIN", "STAFF", "CUSTOMER"]),
  getOrderById
);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order (CUSTOMER only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - book_id
 *                     - quantity
 *                     - price
 *                   properties:
 *                     book_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Bad request (e.g. insufficient stock)
 *       404:
 *         description: Book not found
 */
router.post("/", authenticate, authorize(["CUSTOMER"]), createOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   put:
 *     summary: Update order status (ADMIN/STAFF only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PAID, CANCELLED]
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status value
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.put(
  "/:id/status",
  authenticate,
  authorize(["ADMIN", "STAFF"]),
  updateOrderStatus
);

export default router;
