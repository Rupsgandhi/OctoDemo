import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderDetailDeliveriesRepository } from './orderDetailDeliveriesRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('OrderDetailDeliveriesRepository', () => {
  let repository: OrderDetailDeliveriesRepository;
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
    repository = new OrderDetailDeliveriesRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all order detail deliveries mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { order_detail_delivery_id: 1, order_detail_id: 2, delivery_id: 3, quantity: 5, notes: 'Partial' },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM order_detail_deliveries ORDER BY order_detail_delivery_id',
      );
      expect(result).toHaveLength(1);
      expect(result[0].orderDetailDeliveryId).toBe(1);
      expect(result[0].orderDetailId).toBe(2);
      expect(result[0].deliveryId).toBe(3);
    });

    it('should return empty array when none exist', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return entry when found', async () => {
      mockDb.get.mockResolvedValue({ order_detail_delivery_id: 1, order_detail_id: 2, delivery_id: 3, quantity: 5, notes: '' });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM order_detail_deliveries WHERE order_detail_delivery_id = ?',
        [1],
      );
      expect(result?.orderDetailDeliveryId).toBe(1);
      expect(result?.quantity).toBe(5);
    });

    it('should return null when not found', async () => {
      mockDb.get.mockResolvedValue(undefined);
      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created entry', async () => {
      const newLink = { orderDetailId: 2, deliveryId: 3, quantity: 5, notes: 'First batch' };
      const dbRow = { order_detail_delivery_id: 10, order_detail_id: 2, delivery_id: 3, quantity: 5, notes: 'First batch' };

      mockDb.run.mockResolvedValue({ lastID: 10, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newLink);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.orderDetailDeliveryId).toBe(10);
      expect(result.quantity).toBe(5);
    });
  });

  describe('update', () => {
    it('should update and return the modified entry', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ order_detail_delivery_id: 1, order_detail_id: 2, delivery_id: 3, quantity: 8, notes: '' });

      const result = await repository.update(1, { quantity: 8 });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.quantity).toBe(8);
    });

    it('should throw NotFoundError when entry does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { quantity: 1 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM order_detail_deliveries WHERE order_detail_delivery_id = ?',
        [1],
      );
    });

    it('should throw NotFoundError when entry does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when entry exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM order_detail_deliveries WHERE order_detail_delivery_id = ?',
        [1],
      );
    });

    it('should return false when entry does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });
      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findByOrderDetailId', () => {
    it('should return entries for a given order detail', async () => {
      mockDb.all.mockResolvedValue([
        { order_detail_delivery_id: 1, order_detail_id: 5, delivery_id: 1, quantity: 3, notes: '' },
        { order_detail_delivery_id: 2, order_detail_id: 5, delivery_id: 2, quantity: 2, notes: '' },
      ]);

      const result = await repository.findByOrderDetailId(5);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM order_detail_deliveries WHERE order_detail_id = ? ORDER BY order_detail_delivery_id',
        [5],
      );
      expect(result).toHaveLength(2);
      expect(result[0].orderDetailId).toBe(5);
    });

    it('should return empty array when order detail has no deliveries', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByOrderDetailId(999)).toEqual([]);
    });
  });

  describe('findByDeliveryId', () => {
    it('should return entries for a given delivery', async () => {
      mockDb.all.mockResolvedValue([
        { order_detail_delivery_id: 1, order_detail_id: 1, delivery_id: 7, quantity: 4, notes: '' },
      ]);

      const result = await repository.findByDeliveryId(7);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM order_detail_deliveries WHERE delivery_id = ? ORDER BY order_detail_delivery_id',
        [7],
      );
      expect(result[0].deliveryId).toBe(7);
    });

    it('should return empty array when delivery has no entries', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByDeliveryId(999)).toEqual([]);
    });
  });

  describe('getTotalQuantityByOrderDetailId', () => {
    it('should return the total quantity delivered for an order detail', async () => {
      mockDb.get.mockResolvedValue({ total: 12 });

      const result = await repository.getTotalQuantityByOrderDetailId(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT SUM(quantity) as total FROM order_detail_deliveries WHERE order_detail_id = ?',
        [1],
      );
      expect(result).toBe(12);
    });

    it('should return 0 when no deliveries exist for the order detail', async () => {
      mockDb.get.mockResolvedValue({ total: null });

      const result = await repository.getTotalQuantityByOrderDetailId(999);

      expect(result).toBe(0);
    });
  });
});
