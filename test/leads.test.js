const { expect } = require('chai');
const request = require('supertest');

// We test the API routes directly without DB by mocking
// For integration tests requiring DB, set DATABASE_URL env

describe('POST /api/leads - Validation', () => {
  let app;

  before(() => {
    // Load the express app without starting the server
    const mod = require('../src/app');
    app = mod.app;
  });

  it('should return 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({})
      .expect('Content-Type', /json/);

    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error');
    expect(res.body.error).to.include('First name is required');
    expect(res.body.error).to.include('Last name is required');
    expect(res.body.error).to.include('Email is required');
    expect(res.body.error).to.include('Company name is required');
    expect(res.body.error).to.include('Budget is required');
  });

  it('should return 400 when name fields are whitespace only', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        first_name: '   ',
        last_name: '   ',
        email: 'test@test.com',
        company: 'Acme',
        budget: '$10k-$50k',
      });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.include('First name is required');
    expect(res.body.error).to.include('Last name is required');
  });

  it('should return 400 for invalid budget option', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@acme.com',
        company: 'Acme Inc',
        budget: 'Invalid Budget',
      });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.include('Invalid budget option');
  });

  it('should return 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ first_name: 'John' });

    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error');
  });
});

describe('GET /api/health - Health Check', () => {
  let app;

  before(() => {
    const mod = require('../src/app');
    app = mod.app;
  });

  it('should return health status object', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('status', 'ok');
    expect(res.body).to.have.property('timestamp');
    expect(res.body).to.have.property('uptime');
    expect(res.body).to.have.property('db');
  });
});

describe('GET /api/hubspot - HubSpot Status', () => {
  let app;

  before(() => {
    const mod = require('../src/app');
    app = mod.app;
  });

  it('should return hubspot status object', async () => {
    const res = await request(app)
      .get('/api/hubspot')
      .expect('Content-Type', /json/);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('connected');
    expect(res.body).to.have.property('enabled');
    expect(res.body).to.have.property('hasToken');
    expect(res.body).to.have.property('apiBaseUrl');
  });
});

describe('GET / - Frontend Routes', () => {
  let app;

  before(() => {
    const mod = require('../src/app');
    app = mod.app;
  });

  it('should serve the lead form HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.include('text/html');
    expect(res.text).to.include('Lead Portal');
  });

  it('should serve the dashboard HTML', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.include('text/html');
    expect(res.text).to.include('Lead Distribution Dashboard');
  });
});
