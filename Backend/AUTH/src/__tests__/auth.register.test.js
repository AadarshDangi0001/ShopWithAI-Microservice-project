import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/user.model.js';

jest.setTimeout(60000);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.MONGO_URI = uri;
  
  await mongoose.connect(uri, { dbName: 'auth-test' });

  process.env.JWT_SECRET = 'testsecret';
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('/api/auth/register', () => {
  it('creates a user with valid payload', async () => {
    const payload = {
      username: 'john_doe',
      email: 'john@example.com',
      password: 'Password123!',
      fullName: { firstName: 'John', lastName: 'Doe' },
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(payload)
      .expect(201);

    expect(res.body.message).toBe('User registered successfully');
    expect(res.body.user).toBeDefined();
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.username).toBe('john_doe');
    expect(res.body.user.email).toBe('john@example.com');
    expect(res.body.user.fullName).toEqual({ firstName: 'John', lastName: 'Doe' });

    const user = await User.findOne({ email: 'john@example.com' });
    expect(user).not.toBeNull();
    expect(user.password).not.toBe('Password123!');
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'jane' })
      .expect(400);

    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects duplicate email or username', async () => {
    const payload = {
      username: 'john_doe',
      email: 'john@example.com',
      password: 'Password123!',
      fullName: { firstName: 'John', lastName: 'Doe' },
    };
    await request(app).post('/api/auth/register').send(payload).expect(201);

    const dupUsername = { ...payload, email: 'john2@example.com' };
    const dupEmail = { ...payload, username: 'john_doe_2' };

    const r1 = await request(app).post('/api/auth/register').send(dupUsername).expect(409);
    const r2 = await request(app).post('/api/auth/register').send(dupEmail).expect(409);

    expect(r1.body.error).toBe('Email or Username already in use');
    expect(r2.body.error).toBe('Email or Username already in use');
  });
});


