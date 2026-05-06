import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderRouter from './order';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Order API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed FK chain: headquarters → branch
    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ One']);
    await db.run(
      'INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)',
      [1, 1, 'Main Branch'],
    );

    app = express();
    app.use(express.json());
    app.use('/orders', orderRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  const sampleOrder = () => ({
    branchId: 1,
    orderDate: '2024-01-15',
    name: 'Order #1',
    description: 'Monthly restock',
    status: 'pending',
  });

  it('should create a new order', async () => {
    const response = await request(app).post('/orders').send(sampleOrder());
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Order #1');
    expect(response.body.orderId).toBeDefined();
    expect(response.body.status).toBe('pending');
  });

  it('should get all orders', async () => {
    const response = await request(app).get('/orders');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array when no orders exist', async () => {
    const response = await request(app).get('/orders');
    expect(response.body).toHaveLength(0);
  });

  it('should get an order by ID', async () => {
    const created = await request(app).post('/orders').send(sampleOrder());
    const id = created.body.orderId;

    const response = await request(app).get(`/orders/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.orderId).toBe(id);
    expect(response.body.branchId).toBe(1);
  });

  it('should return 404 for a non-existing order', async () => {
    const response = await request(app).get('/orders/9999');
    expect(response.status).toBe(404);
  });

  it('should update an order status', async () => {
    const created = await request(app).post('/orders').send(sampleOrder());
    const id = created.body.orderId;

    const response = await request(app)
      .put(`/orders/${id}`)
      .send({ status: 'processing' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('processing');
  });

  it('should update an order name', async () => {
    const created = await request(app).post('/orders').send(sampleOrder());
    const id = created.body.orderId;

    const response = await request(app)
      .put(`/orders/${id}`)
      .send({ name: 'Renamed Order' });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Renamed Order');
  });

  it('should return 404 when updating a non-existing order', async () => {
    const response = await request(app)
      .put('/orders/9999')
      .send({ status: 'cancelled' });
    expect(response.status).toBe(404);
  });

  it('should delete an order by ID', async () => {
    const created = await request(app).post('/orders').send(sampleOrder());
    const id = created.body.orderId;

    const response = await request(app).delete(`/orders/${id}`);
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/orders/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing order', async () => {
    const response = await request(app).delete('/orders/9999');
    expect(response.status).toBe(404);
  });

  it('should persist multiple orders and list all of them', async () => {
    await request(app).post('/orders').send({ ...sampleOrder(), name: 'Order A', orderDate: '2024-01-10' });
    await request(app).post('/orders').send({ ...sampleOrder(), name: 'Order B', orderDate: '2024-01-11' });

    const response = await request(app).get('/orders');
    expect(response.body.length).toBe(2);
  });
});
