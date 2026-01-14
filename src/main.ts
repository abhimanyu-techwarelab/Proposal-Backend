import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger Configuration
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
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
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
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Proposal Backend API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
}
bootstrap();
