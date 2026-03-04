import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import Product from '../model/product.model.js';

jest.setTimeout(60000);

let mongo;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'product-test' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Product.deleteMany({});
});

const createRequest = (overrides = {}) => {
  const sellerId = overrides.seller || new mongoose.Types.ObjectId().toString();
  const title = overrides.title || 'Sample Product';
  const description = overrides.description || 'A sample product for testing uploads';
  const priceAmount = overrides.priceAmount || '1999';
  const priceCurrency = overrides.priceCurrency || 'INR';

  const req = request(app)
    .post('/api/products')
    .field('title', title)
    .field('description', description)
    .field('priceAmount', priceAmount)
    .field('priceCurrency', priceCurrency)
    .field('seller', sellerId);

  return { req, sellerId };
};

describe('/api/products', () => {
  it('creates a product with uploaded images', async () => {
    const { req, sellerId } = createRequest();

    const res = await req
      .attach('images', Buffer.from('fake-image'), 'sample.jpg')
      .expect(201);

    expect(res.body.message).toBe('Product created successfully');
    expect(res.body.product).toBeDefined();
    expect(res.body.product.images).toHaveLength(1);
    expect(res.body.product.seller).toBe(sellerId);

    const products = await Product.find();
    expect(products).toHaveLength(1);
    expect(products[0].images).toHaveLength(1);
  });

  it('rejects requests missing required fields', async () => {
    await request(app)
      .post('/api/products')
      .field('description', 'Missing title and seller')
      .attach('images', Buffer.from('fake-image'), 'sample.jpg')
      .expect(400);
  });

  it('rejects requests without images', async () => {
    const { req } = createRequest();

    await req.expect(400);
  });

  it('lists products in reverse chronological order', async () => {
    const first = createRequest();
    await first.req.attach('images', Buffer.from('image-one'), 'one.jpg').expect(201);

    const second = createRequest({ title: 'Second Product' });
    await second.req.attach('images', Buffer.from('image-two'), 'two.jpg').expect(201);

    const res = await request(app).get('/api/products').expect(200);

    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBe(2);
    expect(res.body.products[0].title).toBe('Second Product');
  });
});
