import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderDetailsRepository } from './orderDetailsRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('OrderDetailsRepository', () => {
  let repository: OrderDetailsRepository;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      db: {} as any,
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };
    (getDatabase as any).mockResolvedValue(mockDb);
    repository = new OrderDetailsRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all order details mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { order_detail_id: 1, order_id: 10, product_id: 5, quantity: 3, unit_price: 9.99, notes: 'Urgent' },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM order_details ORDER BY order_detail_id');
      expect(result).toHaveLength(1);
      expect(result[0].orderDetailId).toBe(1);
      expect(result[0].orderId).toBe(10);
      expect(result[0].productId).toBe(5);
      expect(result[0].quantity).toBe(3);
    });

    it('should return empty array when no order details exist', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return order detail when found', async () => {
      mockDb.get.mockResolvedValue({ order_detail_id: 1, order_id: 10, product_id: 5, quantity: 3, unit_price: 9.99, notes: '' });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM order_details WHERE order_detail_id = ?',
        [1],
      );
      expect(result?.orderDetailId).toBe(1);
      expect(result?.quantity).toBe(3);
    });

    it('should return null when order detail not found', async () => {
      mockDb.get.mockResolvedValue(undefined);
      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created order detail', async () => {
      const newDetail = { orderId: 1, productId: 2, quantity: 10, unitPrice: 5.0, notes: 'Bulk order' };
      const dbRow = { order_detail_id: 7, order_id: 1, product_id: 2, quantity: 10, unit_price: 5.0, notes: 'Bulk order' };

      mockDb.run.mockResolvedValue({ lastID: 7, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newDetail);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.orderDetailId).toBe(7);
      expect(result.quantity).toBe(10);
    });
  });

  describe('update', () => {
    it('should update and return the modified order detail', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ order_detail_id: 1, order_id: 1, product_id: 2, quantity: 20, unit_price: 5.0, notes: '' });

      const result = await repository.update(1, { quantity: 20 });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.quantity).toBe(20);
    });

    it('should throw NotFoundError when order detail does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { quantity: 1 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing order detail', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM order_details WHERE order_detail_id = ?',
        [1],
      );
    });

    it('should throw NotFoundError when order detail does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when order detail exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM order_details WHERE order_detail_id = ?',
        [1],
      );
    });

    it('should return false when order detail does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });
      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findByOrderId', () => {
    it('should return order details for a given order', async () => {
      mockDb.all.mockResolvedValue([
        { order_detail_id: 1, order_id: 4, product_id: 1, quantity: 5, unit_price: 10.0, notes: '' },
        { order_detail_id: 2, order_id: 4, product_id: 2, quantity: 2, unit_price: 20.0, notes: '' },
      ]);

      const result = await repository.findByOrderId(4);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM order_details WHERE order_id = ? ORDER BY order_detail_id',
        [4],
      );
      expect(result).toHaveLength(2);
      expect(result[0].orderId).toBe(4);
    });

    it('should return empty array when order has no details', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByOrderId(999)).toEqual([]);
    });
  });

  describe('findByProductId', () => {
    it('should return order details referencing a product', async () => {
      mockDb.all.mockResolvedValue([
        { order_detail_id: 3, order_id: 1, product_id: 9, quantity: 1, unit_price: 50.0, notes: '' },
      ]);

      const result = await repository.findByProductId(9);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM order_details WHERE product_id = ? ORDER BY order_detail_id',
        [9],
      );
      expect(result[0].productId).toBe(9);
    });

    it('should return empty array when product has no order details', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByProductId(999)).toEqual([]);
    });
  });

  describe('getTotalValueByOrderId', () => {
    it('should return the total value of order details for an order', async () => {
      mockDb.get.mockResolvedValue({ total: 150.0 });

      const result = await repository.getTotalValueByOrderId(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT SUM(quantity * unit_price) as total FROM order_details WHERE order_id = ?',
        [1],
      );
      expect(result).toBe(150.0);
    });

    it('should return 0 when order has no details', async () => {
      mockDb.get.mockResolvedValue({ total: null });

      const result = await repository.getTotalValueByOrderId(999);

      expect(result).toBe(0);
    });
  });
});
