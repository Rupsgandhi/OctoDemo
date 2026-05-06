import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import deliveryRouter from './delivery';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Delivery API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required FK: supplier
    const db = await getDatabase();
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Delivery Supplier']);

    app = express();
    app.use(express.json());
    app.use('/deliveries', deliveryRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  const sampleDelivery = () => ({
    supplierId: 1,
    deliveryDate: '2024-02-10',
    name: 'Delivery #1',
    description: 'First delivery batch',
    status: 'pending',
  });

  it('should create a new delivery', async () => {
    const response = await request(app).post('/deliveries').send(sampleDelivery());
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Delivery #1');
    expect(response.body.deliveryId).toBeDefined();
    expect(response.body.status).toBe('pending');
  });

  it('should get all deliveries', async () => {
    const response = await request(app).get('/deliveries');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array when no deliveries exist', async () => {
    const response = await request(app).get('/deliveries');
    expect(response.body).toHaveLength(0);
  });

  it('should get a delivery by ID', async () => {
    const created = await request(app).post('/deliveries').send(sampleDelivery());
    const id = created.body.deliveryId;

    const response = await request(app).get(`/deliveries/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.deliveryId).toBe(id);
    expect(response.body.supplierId).toBe(1);
  });

  it('should return 404 for a non-existing delivery', async () => {
    const response = await request(app).get('/deliveries/9999');
    expect(response.status).toBe(404);
  });

  it('should update a delivery by ID', async () => {
    const created = await request(app).post('/deliveries').send(sampleDelivery());
    const id = created.body.deliveryId;

    const response = await request(app)
      .put(`/deliveries/${id}`)
      .send({ name: 'Updated Delivery' });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Delivery');
  });

  it('should return 404 when updating a non-existing delivery', async () => {
    const response = await request(app)
      .put('/deliveries/9999')
      .send({ name: 'Ghost' });
    expect(response.status).toBe(404);
  });

  it('should update delivery status via status endpoint', async () => {
    const created = await request(app).post('/deliveries').send(sampleDelivery());
    const id = created.body.deliveryId;

    const response = await request(app)
      .put(`/deliveries/${id}/status`)
      .send({ status: 'in-transit' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('in-transit');
  });

  it('should return 404 when updating status of a non-existing delivery', async () => {
    const response = await request(app)
      .put('/deliveries/9999/status')
      .send({ status: 'delivered' });
    expect(response.status).toBe(404);
  });

  it('should delete a delivery by ID', async () => {
    const created = await request(app).post('/deliveries').send(sampleDelivery());
    const id = created.body.deliveryId;

    const response = await request(app).delete(`/deliveries/${id}`);
    expect(response.status).toBe(204);

    const getResponse = await request(app).get(`/deliveries/${id}`);
    expect(getResponse.status).toBe(404);
  });

  it('should return 404 when deleting a non-existing delivery', async () => {
    const response = await request(app).delete('/deliveries/9999');
    expect(response.status).toBe(404);
  });

  it('should persist multiple deliveries and list them', async () => {
    await request(app).post('/deliveries').send({ ...sampleDelivery(), name: 'Delivery A', deliveryDate: '2024-02-01' });
    await request(app).post('/deliveries').send({ ...sampleDelivery(), name: 'Delivery B', deliveryDate: '2024-02-02' });

    const response = await request(app).get('/deliveries');
    expect(response.body.length).toBe(2);
  });
});
