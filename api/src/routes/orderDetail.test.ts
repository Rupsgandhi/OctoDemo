import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderDetailRouter from './orderDetail';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('OrderDetail API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed full FK chain: hq → branch → supplier → product → order
    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ']);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [1, 1, 'Branch 1']);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier 1']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 1, 'Product 1', 10.0, 'SKU-1', 'unit'],
    );
    await db.run(
      'INSERT INTO orders (order_id, branch_id, order_date, name, status) VALUES (?, ?, ?, ?, ?)',
      [1, 1, '2024-03-01', 'Order 1', 'pending'],
    );

    app = express();
    app.use(express.json());
    app.use('/order-details', orderDetailRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  const sampleOrderDetail = () => ({
    orderId: 1,
    productId: 1,
    quantity: 5,
    unitPrice: 10.0,
    notes: 'Fragile items',
  });

  it('should create a new order detail', async () => {
    const response = await request(app).post('/order-details').send(sampleOrderDetail());
    expect(response.status).toBe(201);
    expect(response.body.orderDetailId).toBeDefined();
    expect(response.body.quantity).toBe(5);
    expect(response.body.unitPrice).toBe(10.0);
  });

  it('should get all order details', async () => {
    const response = await request(app).get('/order-details');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array when no order details exist', async () => {
    const response = await request(app).get('/order-details');
    expect(response.body).toHaveLength(0);
  });

  it('should get an order detail by ID', async () => {
    const created = await request(app).post('/order-details').send(sampleOrderDetail());
    const id = created.body.orderDetailId;

    const response = await request(app).get(`/order-details/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.orderDetailId).toBe(id);
    expect(response.body.orderId).toBe(1);
    expect(response.body.productId).toBe(1);
  });

  it('should return 404 for a non-existing order detail', async () => {
    const response = await request(app).get('/order-details/9999');
    expect(response.status).toBe(404);
  });

  it('should update an order detail quantity', async () => {
    const created = await request(app).post('/order-details').send(sampleOrderDetail());
    const id = created.body.orderDetailId;

    const response = await request(app)
      .put(`/order-details/${id}`)
      .send({ quantity: 20 });
    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(20);
  });

  it('should update order detail notes', async () => {
    const created = await request(app).post('/order-details').send(sampleOrderDetail());
    const id = created.body.orderDetailId;

    const response = await request(app)
      .put(`/order-details/${id}`)
      .send({ notes: 'Handle with care' });
    expect(response.status).toBe(200);
    expect(response.body.notes).toBe('Handle with care');
  });

  it('should return 404 when updating a non-existing order detail', async () => {
    const response = await request(app)
      .put('/order-details/9999')
      .send({ quantity: 1 });
    expect(response.status).toBe(404);
  });

  it('should delete an order detail by ID', async () => {
    const created = await request(app).post('/order-details').send(sampleOrderDetail());
    const id = created.body.orderDetailId;

    const response = await request(app).delete(`/order-details/${id}`);
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/order-details/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing order detail', async () => {
    const response = await request(app).delete('/order-details/9999');
    expect(response.status).toBe(404);
  });

  it('should persist multiple order details and list them', async () => {
    await request(app).post('/order-details').send({ ...sampleOrderDetail(), quantity: 3 });
    await request(app).post('/order-details').send({ ...sampleOrderDetail(), quantity: 7 });

    const response = await request(app).get('/order-details');
    expect(response.body.length).toBe(2);
  });
});
