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

const validAddressPayload = {
  shippingAddress: {
    street: '42 Wallaby Way',
    city: 'Sydney',
    state: 'NSW',
    pincode: '2000',
    country: 'Australia',
  },
};

let mongo;

describe('PATCH /api/orders/:id/address', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'order-update-address-test' });
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

  it('updates shipping address for pending order and returns 200', async () => {
    const order = await orderModel.create(makeOrderPayload({ status: 'pending' }));

    const res = await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set('Cookie', authCookies())
      .send(validAddressPayload);

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.shippingAddress).toEqual(
      expect.objectContaining(validAddressPayload.shippingAddress),
    );
  });

  it('returns 400 for invalid address payload', async () => {
    const order = await orderModel.create(makeOrderPayload());

    const res = await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set('Cookie', authCookies())
      .send({ shippingAddress: { city: 'Only City' } });

    expect(res.status).toBe(400);
  });

  it('returns 409 when order is already shipped', async () => {
    const order = await orderModel.create(makeOrderPayload({ status: 'shipped' }));

    const res = await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set('Cookie', authCookies())
      .send(validAddressPayload);

    expect(res.status).toBe(409);
  });

  it('returns 403 when user tries to update another user order address', async () => {
    const order = await orderModel.create(makeOrderPayload({ user: OTHER_USER_ID }));

    const res = await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .set('Cookie', authCookies())
      .send(validAddressPayload);

    expect(res.status).toBe(403);
  });

  it('returns 404 when order id is not found', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .patch(`/api/orders/${missingId}/address`)
      .set('Cookie', authCookies())
      .send(validAddressPayload);

    expect(res.status).toBe(404);
  });

  it('returns 401 when request is unauthenticated', async () => {
    const order = await orderModel.create(makeOrderPayload());

    const res = await request(app)
      .patch(`/api/orders/${order._id}/address`)
      .send(validAddressPayload);

    expect(res.status).toBe(401);
  });
});