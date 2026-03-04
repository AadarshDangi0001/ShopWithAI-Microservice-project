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

const baseSeller = new mongoose.Types.ObjectId();

const seedProducts = async (products = []) => {
  return Product.create(
    products.map(product => ({
      title: product.title || `Product ${Math.random().toString(36).slice(2)}`,
      description: product.description || 'Test description',
      price: product.price || { amount: 999, currency: 'INR' },
      seller: product.seller || baseSeller,
      images: product.images || [],
    })),
  );
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
  it('returns products with default pagination', async () => {
    await seedProducts([
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
    await seedProducts([
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
    await seedProducts([
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

describe('GET /api/products/:id', () => {
  it('returns a product when the id exists', async () => {
    const [product] = await seedProducts([
      { title: 'Detail Product', price: { amount: 1299 } },
    ]);

    const res = await request(app).get(`/api/products/${product._id}`).expect(200);

    expect(res.body.message).toBe('Product fetched successfully');
    expect(res.body.data._id).toBe(String(product._id));
    expect(res.body.data.title).toBe('Detail Product');
  });

  it('returns 400 for invalid product id', async () => {
    const res = await request(app).get('/api/products/not-a-valid-id').expect(400);

    expect(res.body.error).toBe('Invalid product id');
  });

  it('returns 404 when the product is not found', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/products/${missingId}`).expect(404);

    expect(res.body.error).toBe('Product not found');
  });
});

describe('PATCH /api/products/:id (seller)', () => {
  const patchProduct = ({ id, userId, role = 'seller', body }) =>
    request(app)
      .patch(`/api/products/${id}`)
      .set('x-test-user-id', userId)
      .set('x-test-user-role', role)
      .send(body);

  it('allows the owning seller to update mutable fields', async () => {
    const sellerId = new mongoose.Types.ObjectId().toString();
    const [product] = await seedProducts([
      {
        title: 'Old Title',
        description: 'Original description',
        price: { amount: 1500, currency: 'INR' },
        seller: sellerId,
      },
    ]);

    const updatePayload = {
      title: 'Updated Title',
      description: 'Updated description',
      price: { amount: 2499, currency: 'USD' },
    };

    const res = await patchProduct({
      id: product._id,
      userId: sellerId,
      body: updatePayload,
    }).expect(200);

    expect(res.body.message).toMatch(/updated/i);
    expect(res.body.data.title).toBe('Updated Title');
    expect(res.body.data.description).toBe('Updated description');
    expect(res.body.data.price.amount).toBe(2499);
    expect(res.body.data.price.currency).toBe('USD');

    const stored = await Product.findById(product._id);
    expect(stored.title).toBe('Updated Title');
    expect(stored.description).toBe('Updated description');
    expect(stored.price.amount).toBe(2499);
    expect(stored.price.currency).toBe('USD');
  });

  it('rejects sellers attempting to update products they do not own', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const intruderId = new mongoose.Types.ObjectId().toString();
    const [product] = await seedProducts([
      { title: 'Owner Product', seller: ownerId },
    ]);

    const res = await patchProduct({
      id: product._id,
      userId: intruderId,
      body: { title: 'Hacked' },
    }).expect(403);

    expect(res.body.error).toMatch(/forbidden/i);

    const stored = await Product.findById(product._id);
    expect(stored.title).toBe('Owner Product');
  });

  it('blocks non-seller roles even when they own the product', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const [product] = await seedProducts([
      { title: 'Role Locked Product', seller: ownerId },
    ]);

    const res = await patchProduct({
      id: product._id,
      userId: ownerId,
      role: 'user',
      body: { title: 'Should Fail' },
    }).expect(403);

    expect(res.body.error).toMatch(/insufficient|forbidden/i);
  });

  it('returns 404 when updating a non-existent product', async () => {
    const sellerId = new mongoose.Types.ObjectId().toString();
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await patchProduct({
      id: missingId,
      userId: sellerId,
      body: { title: 'Missing Product Update' },
    }).expect(404);

    expect(res.body.error).toMatch(/not found/i);
  });
});
