import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { authHeaderForUser, clearDB, createUser, createNestAppInstance } from '../test.helper';

describe('library apps controller', () => {
  let app: INestApplication;

  beforeEach(async () => {
    await clearDB();
  });

  beforeAll(async () => {
    app = await createNestAppInstance();
  });

  describe('POST /api/library_apps', () => {
    it('should be able to create app if user has app create permission', async () => {
      const adminUserData = await createUser(app, {
        email: 'admin@tooljet.io',
        groups: ['all_users', 'admin'],
      });
      const organization = adminUserData.organization;
      const nonAdminUserData = await createUser(app, {
        email: 'developer@tooljet.io',
        groups: ['all_users'],
        organization,
      });

      let response = await request(app.getHttpServer())
        .post('/api/library_apps')
        .send({ identifier: 'github-contributors' })
        .set('Authorization', authHeaderForUser(nonAdminUserData.user));

      expect(response.statusCode).toBe(403);

      response = await request(app.getHttpServer())
        .post('/api/library_apps')
        .send({ identifier: 'github-contributors' })
        .set('Authorization', authHeaderForUser(adminUserData.user));

      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe('GitHub Contributor Leaderboard');
    });

    it('should return error if template identifier is not found', async () => {
      const adminUserData = await createUser(app, {
        email: 'admin@tooljet.io',
        groups: ['all_users', 'admin'],
      });

      const response = await request(app.getHttpServer())
        .post('/api/library_apps')
        .send({ identifier: 'non-existent-template' })
        .set('Authorization', authHeaderForUser(adminUserData.user));

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: 'App definition not found',
        statusCode: 400,
      });
    });
  });

  describe('GET /api/library_apps', () => {
    it('should be get app manifests', async () => {
      const adminUserData = await createUser(app, {
        email: 'admin@tooljet.io',
        groups: ['all_users', 'admin'],
      });

      const response = await request(app.getHttpServer())
        .get('/api/library_apps')
        .set('Authorization', authHeaderForUser(adminUserData.user));

      expect(response.statusCode).toBe(200);

      const templateAppIds = response.body['template_app_manifests'].map((manifest) => manifest.id);

      expect(new Set(templateAppIds)).toEqual(new Set(['github-contributors', 'customer-dashboard']));
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
