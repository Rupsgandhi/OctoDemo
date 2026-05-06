import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveriesRepository } from './deliveriesRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('DeliveriesRepository', () => {
  let repository: DeliveriesRepository;
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
    repository = new DeliveriesRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all deliveries mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { delivery_id: 1, supplier_id: 2, delivery_date: '2024-03-01', name: 'Batch 1', description: '', status: 'pending' },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM deliveries ORDER BY delivery_id');
      expect(result).toHaveLength(1);
      expect(result[0].deliveryId).toBe(1);
      expect(result[0].supplierId).toBe(2);
    });

    it('should return empty array when no deliveries exist', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return delivery when found', async () => {
      mockDb.get.mockResolvedValue({ delivery_id: 1, supplier_id: 2, delivery_date: '2024-03-01', name: 'Batch 1', description: '', status: 'pending' });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM deliveries WHERE delivery_id = ?', [1]);
      expect(result?.deliveryId).toBe(1);
    });

    it('should return null when delivery not found', async () => {
      mockDb.get.mockResolvedValue(undefined);
      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created delivery', async () => {
      const newDelivery = { supplierId: 1, deliveryDate: '2024-03-10', name: 'New Batch', description: 'First', status: 'pending' };
      const dbRow = { delivery_id: 4, supplier_id: 1, delivery_date: '2024-03-10', name: 'New Batch', description: 'First', status: 'pending' };

      mockDb.run.mockResolvedValue({ lastID: 4, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newDelivery);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.deliveryId).toBe(4);
      expect(result.name).toBe('New Batch');
    });
  });

  describe('update', () => {
    it('should update and return the modified delivery', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ delivery_id: 1, supplier_id: 1, delivery_date: '2024-03-01', name: 'Updated Batch', description: '', status: 'in-transit' });

      const result = await repository.update(1, { status: 'in-transit' });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('in-transit');
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { status: 'delivered' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing delivery', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM deliveries WHERE delivery_id = ?', [1]);
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when delivery exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM deliveries WHERE delivery_id = ?',
        [1],
      );
    });

    it('should return false when delivery does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });
      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findBySupplierId', () => {
    it('should return deliveries for a given supplier', async () => {
      mockDb.all.mockResolvedValue([
        { delivery_id: 1, supplier_id: 3, delivery_date: '2024-02-01', name: 'D1', description: '', status: 'pending' },
      ]);

      const result = await repository.findBySupplierId(3);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE supplier_id = ? ORDER BY delivery_date DESC',
        [3],
      );
      expect(result[0].supplierId).toBe(3);
    });

    it('should return empty array when supplier has no deliveries', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findBySupplierId(999)).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should return deliveries matching a status', async () => {
      mockDb.all.mockResolvedValue([
        { delivery_id: 2, supplier_id: 1, delivery_date: '2024-02-10', name: 'D2', description: '', status: 'delivered' },
      ]);

      const result = await repository.findByStatus('delivered');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE status = ? ORDER BY delivery_date DESC',
        ['delivered'],
      );
      expect(result[0].status).toBe('delivered');
    });

    it('should return empty array when no deliveries match status', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByStatus('failed')).toEqual([]);
    });
  });

  describe('findByDateRange', () => {
    it('should return deliveries within a date range', async () => {
      mockDb.all.mockResolvedValue([
        { delivery_id: 1, supplier_id: 1, delivery_date: '2024-03-15', name: 'D1', description: '', status: 'pending' },
      ]);

      const result = await repository.findByDateRange('2024-03-01', '2024-03-31');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM deliveries WHERE delivery_date >= ? AND delivery_date <= ? ORDER BY delivery_date DESC',
        ['2024-03-01', '2024-03-31'],
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no deliveries in range', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByDateRange('2030-01-01', '2030-12-31')).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should delegate to update and return modified delivery', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ delivery_id: 1, supplier_id: 1, delivery_date: '2024-03-01', name: 'D1', description: '', status: 'delivered' });

      const result = await repository.updateStatus(1, 'delivered');

      expect(result.status).toBe('delivered');
    });

    it('should throw NotFoundError when delivery does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.updateStatus(999, 'delivered')).rejects.toThrow(NotFoundError);
    });
  });
});
