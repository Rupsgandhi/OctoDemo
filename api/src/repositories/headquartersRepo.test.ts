import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HeadquartersRepository } from './headquartersRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('HeadquartersRepository', () => {
  let repository: HeadquartersRepository;
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
    repository = new HeadquartersRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all headquarters mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { headquarters_id: 1, name: 'Global HQ', description: 'Main', address: '1 Corp Blvd', contact_person: 'CEO', email: 'ceo@corp.com', phone: '555-0001' },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM headquarters ORDER BY headquarters_id');
      expect(result).toHaveLength(1);
      expect(result[0].headquartersId).toBe(1);
      expect(result[0].name).toBe('Global HQ');
    });

    it('should return empty array when no headquarters exist', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return headquarters when found', async () => {
      mockDb.get.mockResolvedValue({ headquarters_id: 1, name: 'Global HQ', description: '', address: '', contact_person: '', email: '', phone: '' });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM headquarters WHERE headquarters_id = ?',
        [1],
      );
      expect(result?.headquartersId).toBe(1);
      expect(result?.name).toBe('Global HQ');
    });

    it('should return null when headquarters not found', async () => {
      mockDb.get.mockResolvedValue(undefined);
      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created headquarters', async () => {
      const newHQ = { name: 'New HQ', description: 'Brand new', address: '2 New Blvd', contactPerson: 'CFO', email: 'cfo@corp.com', phone: '555-0002' };
      const dbRow = { headquarters_id: 2, name: 'New HQ', description: 'Brand new', address: '2 New Blvd', contact_person: 'CFO', email: 'cfo@corp.com', phone: '555-0002' };

      mockDb.run.mockResolvedValue({ lastID: 2, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newHQ);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.headquartersId).toBe(2);
      expect(result.name).toBe('New HQ');
    });
  });

  describe('update', () => {
    it('should update and return the modified headquarters', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ headquarters_id: 1, name: 'Renamed HQ', description: '', address: '', contact_person: '', email: '', phone: '' });

      const result = await repository.update(1, { name: 'Renamed HQ' });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Renamed HQ');
    });

    it('should throw NotFoundError when headquarters does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { name: 'Ghost HQ' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing headquarters', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM headquarters WHERE headquarters_id = ?',
        [1],
      );
    });

    it('should throw NotFoundError when headquarters does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when headquarters exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM headquarters WHERE headquarters_id = ?',
        [1],
      );
    });

    it('should return false when headquarters does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });
      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findByName', () => {
    it('should return headquarters matching name pattern', async () => {
      mockDb.all.mockResolvedValue([
        { headquarters_id: 1, name: 'Northern HQ', description: '', address: '', contact_person: '', email: '', phone: '' },
      ]);

      const result = await repository.findByName('Northern');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM headquarters WHERE name LIKE ? ORDER BY name',
        ['%Northern%'],
      );
      expect(result[0].name).toBe('Northern HQ');
    });

    it('should return empty array when no name matches', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByName('Nonexistent')).toEqual([]);
    });
  });
});
