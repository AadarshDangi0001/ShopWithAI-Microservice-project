import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

import app from '../app.js';
import orderModel from '../models/order.model.js';

const USER_ID = '69aa970204f287662f4fa392';
const OTHER_USER_ID = '69aa970204f287662f4fa393';
const PRODUCT_ID = '69a7dc8ab7a3d02a3e52a11f';

const authCookies = (overrides = {}) => {
  const userId = overrides.userId || USER_ID;
  const role = overrides.role || 'user';
  const token = overrides.token || `test-token-${userId}`;

  return [`token=${token}`, `userId=${userId}`, `role=${role}`];
};

const makeOrderPayload = (overrides = {}) => ({
  user: USER_ID,
  items: [
    {
      product: PRODUCT_ID,
      quantity: 2,
      price: {
        amount: 100,
        currency: 'INR',
      },
    },
  ],
  status: 'pending',
  totalAmont: {
    amount: 250,
    currency: 'INR',
  },
  shippingAddress: {
    street: '221B Baker Street',
    city: 'London',
    state: 'Greater London',
    pincode: 'NW16XE',
    country: 'UK',
  },
  ...overrides,
});

let mongo;

describe('GET /api/orders/me', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'order-get-mine-test' });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (mongo) {
      await mongo.stop();
    }
  });

  beforeEach(async () => {
    await orderModel.deleteMany({});
  });

  it('returns only logged-in user orders', async () => {
    await orderModel.create(makeOrderPayload({ status: 'pending' }));
    await orderModel.create(makeOrderPayload({ status: 'confirmed' }));
    await orderModel.create(makeOrderPayload({ user: OTHER_USER_ID, status: 'pending' }));

    const res = await request(app)
      .get('/api/orders/me')
      .set('Cookie', authCookies());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBe(2);
    expect(res.body.orders.every((order) => String(order.user) === USER_ID)).toBe(true);
  });

  it('returns empty list when user has no orders', async () => {
    await orderModel.create(makeOrderPayload({ user: OTHER_USER_ID }));

    const res = await request(app)
      .get('/api/orders/me')
      .set('Cookie', authCookies());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBe(0);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/orders/me');

    expect(res.status).toBe(401);
  });
});