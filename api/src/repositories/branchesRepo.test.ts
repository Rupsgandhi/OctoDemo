import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BranchesRepository } from './branchesRepo';
import { NotFoundError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from '../db/sqlite';

describe('BranchesRepository', () => {
  let repository: BranchesRepository;
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
    repository = new BranchesRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all branches mapped to camelCase', async () => {
      mockDb.all.mockResolvedValue([
        { branch_id: 1, headquarters_id: 10, name: 'East Branch', description: 'East side', address: '1 East St', contact_person: 'Alice', email: 'alice@east.com', phone: '555-0001' },
      ]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM branches ORDER BY branch_id');
      expect(result).toHaveLength(1);
      expect(result[0].branchId).toBe(1);
      expect(result[0].headquartersId).toBe(10);
      expect(result[0].name).toBe('East Branch');
    });

    it('should return empty array when no branches exist', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return branch when found', async () => {
      mockDb.get.mockResolvedValue({ branch_id: 1, headquarters_id: 10, name: 'East Branch', description: '', address: '', contact_person: '', email: '', phone: '' });

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM branches WHERE branch_id = ?', [1]);
      expect(result?.branchId).toBe(1);
      expect(result?.name).toBe('East Branch');
    });

    it('should return null when branch not found', async () => {
      mockDb.get.mockResolvedValue(undefined);
      expect(await repository.findById(999)).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the created branch', async () => {
      const newBranch = { headquartersId: 1, name: 'North Branch', description: 'North', address: '1 North Ave', contactPerson: 'Bob', email: 'bob@north.com', phone: '555-0002' };
      const dbRow = { branch_id: 2, headquarters_id: 1, name: 'North Branch', description: 'North', address: '1 North Ave', contact_person: 'Bob', email: 'bob@north.com', phone: '555-0002' };

      mockDb.run.mockResolvedValue({ lastID: 2, changes: 1 });
      mockDb.get.mockResolvedValue(dbRow);

      const result = await repository.create(newBranch);

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.branchId).toBe(2);
      expect(result.name).toBe('North Branch');
    });
  });

  describe('update', () => {
    it('should update and return the modified branch', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ branch_id: 1, headquarters_id: 1, name: 'Updated Branch', description: '', address: '', contact_person: '', email: '', phone: '' });

      const result = await repository.update(1, { name: 'Updated Branch' });

      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Updated Branch');
    });

    it('should throw NotFoundError when branch does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.update(999, { name: 'Ghost' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing branch', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM branches WHERE branch_id = ?', [1]);
    });

    it('should throw NotFoundError when branch does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('should return true when branch exists', async () => {
      mockDb.get.mockResolvedValue({ count: 1 });

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM branches WHERE branch_id = ?',
        [1],
      );
    });

    it('should return false when branch does not exist', async () => {
      mockDb.get.mockResolvedValue({ count: 0 });
      expect(await repository.exists(999)).toBe(false);
    });
  });

  describe('findByHeadquartersId', () => {
    it('should return branches belonging to a headquarters', async () => {
      mockDb.all.mockResolvedValue([
        { branch_id: 1, headquarters_id: 7, name: 'Branch A', description: '', address: '', contact_person: '', email: '', phone: '' },
        { branch_id: 2, headquarters_id: 7, name: 'Branch B', description: '', address: '', contact_person: '', email: '', phone: '' },
      ]);

      const result = await repository.findByHeadquartersId(7);

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM branches WHERE headquarters_id = ? ORDER BY name',
        [7],
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when HQ has no branches', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByHeadquartersId(999)).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should return branches matching name pattern', async () => {
      mockDb.all.mockResolvedValue([
        { branch_id: 1, headquarters_id: 1, name: 'West Side Branch', description: '', address: '', contact_person: '', email: '', phone: '' },
      ]);

      const result = await repository.findByName('West');

      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM branches WHERE name LIKE ? ORDER BY name',
        ['%West%'],
      );
      expect(result[0].name).toBe('West Side Branch');
    });

    it('should return empty array when no name matches', async () => {
      mockDb.all.mockResolvedValue([]);
      expect(await repository.findByName('Nonexistent')).toEqual([]);
    });
  });
});
