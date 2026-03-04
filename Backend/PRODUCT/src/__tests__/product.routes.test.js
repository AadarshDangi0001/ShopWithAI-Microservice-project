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
    .set('x-test-user-id', sellerId)
    .field('title', title)
    .field('description', description)
    .field('priceAmount', priceAmount)
    .field('priceCurrency', priceCurrency)
    .field('seller', sellerId);

  return { req, sellerId };
};

describe('POST /api/products', () => {
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
});

describe('GET /api/products', () => {
  const baseSeller = new mongoose.Types.ObjectId();

  const createProducts = async products => {
    return Product.create(
      products.map(product => ({
        title: `Product ${Math.random().toString(36).slice(2)}`,
        description: 'Test description',
        price: { amount: 999, currency: 'INR' },
        seller: baseSeller,
        images: [],
        ...product,
        price: {
          amount: product?.price?.amount ?? product?.priceAmount ?? 999,
          currency: product?.price?.currency ?? product?.priceCurrency ?? 'INR',
        },
        seller: product?.seller || baseSeller,
      })),
    );
  };

  it('returns products with default pagination', async () => {
    await createProducts([
      { title: 'Budget Phone', price: { amount: 999, currency: 'INR' } },
      { title: 'Gaming Laptop', price: { amount: 4999, currency: 'INR' } },
    ]);

    const res = await request(app).get('/api/products').expect(200);

    expect(res.body.message).toBe('Products fetched successfully');
    expect(res.body.data).toHaveLength(2);
    const titles = res.body.data.map(product => product.title);
    expect(titles).toEqual(expect.arrayContaining(['Budget Phone', 'Gaming Laptop']));
  });

  it('filters products by price range', async () => {
    await createProducts([
      { title: 'Budget Phone', price: { amount: 999 } },
      { title: 'Midrange Phone', price: { amount: 1999 } },
      { title: 'Premium Phone', price: { amount: 4999 } },
    ]);

    const res = await request(app)
      .get('/api/products')
      .query({ minprice: 1500, maxprice: 2500 })
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Midrange Phone');
  });

  it('applies skip and limit parameters', async () => {
    await createProducts([
      { title: 'First Product' },
      { title: 'Second Product' },
      { title: 'Third Product' },
    ]);

    const res = await request(app)
      .get('/api/products')
      .query({ skip: 1, limit: 1 })
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Second Product');
  });
});
