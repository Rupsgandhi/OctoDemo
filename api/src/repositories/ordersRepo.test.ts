import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersRepository } from './ordersRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('OrdersRepository', () => {
  let repository: OrdersRepository;
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
    repository = new OrdersRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all orders mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { order_id: 1, branch_id: 2, order_date: '2024-01-01', name: 'Order A', description: '', status: 'pending' },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM orders ORDER BY order_id');
      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe(1);
      expect(result[0].branchId).toBe(2);
      expect(result[0].status).toBe('pending');
    });

    it('should return empty array when no orders exist', async () => {
      mockDb.all.mockResolvedValue([]);
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      mockDb.get.mockResolvedValue({ order_id: 1, branch_id: 2, order_date: '2024-01-01', name: 'Order A', description: '', status: 'pending' });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM orders WHERE order_id = ?', [1]);
      expect(result?.orderId).toBe(1);
    });

    it('should return null when order not found', async () => {
      mockDb.get.mockResolvedValue(undefined);
      const result = await repository.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created order', async () => {
      const newOrder = { branchId: 1, orderDate: '2024-02-01', name: 'New Order', description: '', status: 'pending' };
      const dbRow = { order_id: 5, branch_id: 1, order_date: '2024-02-01', name: 'New Order', description: '', status: 'pending' };

      mockDb.run.mockResolvedValue({ lastID: 5, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newOrder);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.orderId).toBe(5);
      expect(result.name).toBe('New Order');
    });
  });

  describe('update', () => {
    it('should update and return the modified order', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ order_id: 1, branch_id: 1, order_date: '2024-01-01', name: 'Order A', description: '', status: 'shipped' });

      const result = await repository.update(1, { status: 'shipped' });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('shipped');
    });

    it('should throw NotFoundError when order does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { status: 'cancelled' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing order', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM orders WHERE order_id = ?', [1]);
    });

    it('should throw NotFoundError when order does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when order exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM orders WHERE order_id = ?',
        [1],
      );
    });

    it('should return false when order does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });
      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findByBranchId', () => {
    it('should return orders for a given branch', async () => {
      mockDb.all.mockResolvedValue([
        { order_id: 1, branch_id: 3, order_date: '2024-01-01', name: 'O1', description: '', status: 'pending' },
        { order_id: 2, branch_id: 3, order_date: '2024-01-02', name: 'O2', description: '', status: 'processing' },
      ]);

      const result = await repository.findByBranchId(3);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE branch_id = ? ORDER BY order_date DESC',
        [3],
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no orders for branch', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByBranchId(999)).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return orders matching a status', async () => {
      mockDb.all.mockResolvedValue([
        { order_id: 1, branch_id: 1, order_date: '2024-01-01', name: 'O1', description: '', status: 'shipped' },
      ]);

      const result = await repository.findByStatus('shipped');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE status = ? ORDER BY order_date DESC',
        ['shipped'],
      );
      expect(result[0].status).toBe('shipped');
    });

    it('should return empty array when no orders match status', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByStatus('delivered')).toEqual([]);
    });
  });

  describe('findByDateRange', () => {
    it('should return orders within a date range', async () => {
      mockDb.all.mockResolvedValue([
        { order_id: 1, branch_id: 1, order_date: '2024-01-15', name: 'O1', description: '', status: 'pending' },
      ]);

      const result = await repository.findByDateRange('2024-01-01', '2024-01-31');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE order_date >= ? AND order_date <= ? ORDER BY order_date DESC',
        ['2024-01-01', '2024-01-31'],
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no orders in date range', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByDateRange('2030-01-01', '2030-12-31')).toEqual([]);
    });
  });
});
