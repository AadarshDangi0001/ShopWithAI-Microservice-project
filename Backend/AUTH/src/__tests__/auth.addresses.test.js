import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/user.model.js';

jest.setTimeout(60000);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'testsecret';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(uri, { dbName: 'auth-test' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

const createUserAndToken = async ({ addresses = [] } = {}) => {
  const user = await User.create({
    username: 'address_user',
    email: 'address_user@example.com',
    password: 'hashed-password',
    fullName: { firstName: 'Address', lastName: 'User' },
    addresses,
  });

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  return { user, token };
};

describe('/api/auth/users/me/addresses', () => {
  it('returns all saved addresses for the authenticated user', async () => {
    const addresses = [
      {
        street: '221B Baker Street',
        city: 'London',
        state: 'LDN',
        zipCode: 'NW16XE',
        country: 'UK',
      },
      {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62704',
        country: 'USA',
      },
    ];
    const { token } = await createUserAndToken({ addresses });

    const res = await request(app)
      .get('/api/auth/users/me/addresses')
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.message).toBe('Addresses fetched successfully');
    expect(Array.isArray(res.body.addresses)).toBe(true);
    expect(res.body.addresses).toHaveLength(addresses.length);
    expect(res.body.addresses[0]).toMatchObject(addresses[0]);
  });

  it('rejects GET requests without authentication', async () => {
    const res = await request(app).get('/api/auth/users/me/addresses').expect(401);

    expect(res.body.error).toBe('Authentication required');
  });

  it('adds a new address for the authenticated user', async () => {
    const { user, token } = await createUserAndToken();
    const payload = {
      street: '1600 Amphitheatre Parkway',
      city: 'Mountain View',
      state: 'CA',
      zipCode: '94043',
      country: 'USA',
    };

    const res = await request(app)
      .post('/api/auth/users/me/addresses')
      .set('Cookie', [`token=${token}`])
      .send(payload)
      .expect(201);

    expect(res.body.message).toBe('Address added successfully');
    expect(res.body.addresses).toHaveLength(1);
    expect(res.body.addresses[0]).toMatchObject(payload);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.addresses).toHaveLength(1);
    expect(updatedUser.addresses[0].street).toBe('1600 Amphitheatre Parkway');
  });

  it('rejects POST requests missing required fields', async () => {
    const { token } = await createUserAndToken();

    const res = await request(app)
      .post('/api/auth/users/me/addresses')
      .set('Cookie', [`token=${token}`])
      .send({ city: 'Nowhere' })
      .expect(400);

    expect(res.body.error).toBe('Invalid address payload');
  });

  it('rejects POST requests without authentication', async () => {
    await request(app)
      .post('/api/auth/users/me/addresses')
      .send({ street: '123', city: 'X', state: 'Y', zipCode: 'Z', country: 'Q' })
      .expect(401);
  });

  it('deletes an address that belongs to the authenticated user', async () => {
    const existingAddresses = [
      {
        street: 'Ocean Drive',
        city: 'Miami',
        state: 'FL',
        zipCode: '33139',
        country: 'USA',
      },
      {
        street: 'Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90028',
        country: 'USA',
      },
    ];
    const { user, token } = await createUserAndToken({ addresses: existingAddresses });
    const addressId = user.addresses[0]._id.toString();

    const res = await request(app)
      .delete(`/api/auth/users/me/addresses/${addressId}`)
      .set('Cookie', [`token=${token}`])
      .expect(200);

    expect(res.body.message).toBe('Address deleted successfully');
    expect(res.body.addresses).toHaveLength(existingAddresses.length - 1);
    expect(res.body.addresses.find((addr) => addr.id === addressId)).toBeUndefined();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.addresses).toHaveLength(existingAddresses.length - 1);
  });

  it('returns 404 when attempting to delete a non-existent address', async () => {
    const { token } = await createUserAndToken({ addresses: [] });
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/auth/users/me/addresses/${fakeId}`)
      .set('Cookie', [`token=${token}`])
      .expect(404);

    expect(res.body.error).toBe('Address not found');
  });
});
