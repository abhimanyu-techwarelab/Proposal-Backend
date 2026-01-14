import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Proposal Backend API')
    .setDescription(
      'Comprehensive API documentation for the Proposal Backend system. ' +
      'This API provides endpoints for user management, organizations, roles, permissions, ' +
      'proposal generation, templates, and more. All protected endpoints require JWT authentication.'
    )
    .setVersion('1.0')
    .setContact(
      'API Support',
      'https://example.com/support',
      'support@example.com'
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from /auth/login endpoint',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints - Login and token management')
    .addTag('users', 'User management endpoints - CRUD operations for users')
    .addTag('organizations', 'Organization management endpoints - Manage organizations and members')
    .addTag('roles', 'Role management endpoints - Create and manage user roles')
    .addTag('permissions', 'Permission management endpoints - Manage permissions and role-permission mappings')
    .addTag('proposals', 'Proposal generation and management - Generate and manage proposals')
    .addTag('templates', 'Template management - Create and manage proposal templates')
    .addTag('tags', 'Tag management - Organize content with tags')
    .addTag('features', 'Feature management - Manage system features')
    .addTag('plans', 'Plan management - Manage subscription plans')
    .addTag('storage', 'Storage and file management - Get signed URLs for file uploads')
    .addTag('health', 'Health check endpoints - Monitor system health')
    .addTag('seed', 'Database seeding endpoints - Initialize database with default data')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Write JSON file
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  console.log('✅ Swagger JSON file generated: swagger.json');
  
  await app.close();
  process.exit(0);
}

generateSwagger().catch((error) => {
  console.error('Error generating Swagger documentation:', error);
  process.exit(1);
});
