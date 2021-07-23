import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { App } from 'src/entities/app.entity';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { AppUser } from 'src/entities/app_user.entity';

@Injectable()
export class AppsService {

  constructor(
    @InjectRepository(App)
    private appsRepository: Repository<App>,

    @InjectRepository(AppUser)
    private appUsersRepository: Repository<AppUser>,
  ) { }

  async find(id: string): Promise<App> {
    return this.appsRepository.findOne(id, {
      relations: ['dataQueries']
    });
  }

  async create(user: User): Promise<App> {
    const app = await this.appsRepository.save(this.appsRepository.create({
        name: 'Untitled app',
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId: user.organization.id,
        user: user
    }));

    await this.appUsersRepository.save(this.appUsersRepository.create({
      userId: user.id, 
      appId: app.id, 
      role: 'admin',
      createdAt: new Date(), 
      updatedAt: new Date()
    }));

    return app;
  }

  async count(user: User) {
    return await this.appsRepository.count({ 
        where: {
            organizationId: user.organizationId,
        },
     });
  }

  async all(user: User, page: number): Promise<App[]> {

    return await this.appsRepository.find({
        relations: ['user'],
        where: {
            organizationId: user.organizationId,
        },
        take: 10,
        skip: 10 * ( page || 0 ),
        order: {
            createdAt: 'DESC'
        }
    });
  }

  async update(user: User, appId: string, params: any) {

    const currentVersionId = params['current_version_id'];
    const isPublic = params['is_public'];
    const { name, slug } = params;

    const updateableParams = {
      name,
      slug,
      isPublic,
      currentVersionId
    }

    // removing keys with undefined values
    Object.keys(updateableParams).forEach(key => updateableParams[key] === undefined ? delete updateableParams[key] : {});

    return await this.appsRepository.update(appId, updateableParams);
  }

  async fetchUsers(user: any, appId: string): Promise<AppUser[]> {

    const appUsers = await this.appUsersRepository.find({
      where: { appId },
      relations: ['user']
    });

    // serialize 
    const serializedUsers = []
    for(const appUser of appUsers) {
      serializedUsers.push({
        email: appUser.user.email,
        firstName: appUser.user.firstName,
        lastName: appUser.user.lastName,
        name: `${appUser.user.firstName} ${appUser.user.lastName}`,
        id: appUser.id,
        role: appUser.role,
      });
    }

    return serializedUsers;
  }
}