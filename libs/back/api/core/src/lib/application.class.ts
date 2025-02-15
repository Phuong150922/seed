import { INestApplication } from '@nestjs/common/interfaces';
import * as expressServer from 'express';
import * as morgan from 'morgan';
import { json } from 'body-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { API_CONFIG, isEnv, LogContext, LogService, LogSeverity } from '@seed/back/api/shared';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ZERO } from '@seed/shared/constants';
import { Environment } from '@seed/shared/types';

/* eslint-disable @typescript-eslint/no-require-imports */
// Mark some deps to be used explicitly. Workaround, because "generatePackageJson" from Nx doesn't detect them automatically.
require('reflect-metadata');
require('swagger-ui-express');
/* eslint-enable @typescript-eslint/no-require-imports */

export class Application {
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  private constructor() {}

  static async run(): Promise<{ nest: INestApplication; express: expressServer.Application }> {
    return new LogService(Application.name).trackSegment(Application.run.name, async logSegment => {
      logSegment.log(`API_CONFIG:`, API_CONFIG);
      const express = expressServer();
      Application.applyFirstMiddlewares(express);
      const nest = await this.configureNest(express);
      Application.applyLastMiddlewares(express, nest);
      await nest.init();
      const DEFAULT_PORT = 8080;
      const port = process.env['port'] || DEFAULT_PORT;
      await nest.listen(port);
      logSegment.log(`Listening at http://${process.env['host'] || 'localhost'}:${port}/${API_CONFIG.apiPrefix}`);
      return { nest, express };
    });
  }

  private static applyFirstMiddlewares(express: expressServer.Application): void {
    Application.configureMorgan(express);
    express.use(json());
  }

  private static configureMorgan(express: expressServer.Application): void {
    express.use(
      morgan(
        (_tokens, req) => {
          const body = !req.body || Object.keys(req.body).length === ZERO ? '' : LogService.inspect(req.body);
          return `${LogService.getIcon(LogSeverity.log, LogContext.startSegment)} ${req.method} ${req.url} ${body}`;
        },
        {
          immediate: true,
        },
      ),
    );
    express.use(
      morgan(`${LogService.getIcon(LogSeverity.log, LogContext.finishSegment)} :method :url :status :response-time ms`),
    );
  }

  private static async configureNest(express: expressServer.Application): Promise<INestApplication> {
    const nest = await NestFactory.create(AppModule, new ExpressAdapter(express));
    nest.setGlobalPrefix(API_CONFIG.apiPrefix);
    nest.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true, // prevents extra properties to be attached to Request Body object that are not defined in DTOs
        /* eslint-disable-next-line @typescript-eslint/unbound-method */
        exceptionFactory: Application.validationExceptionFactory,
      }),
    );
    return nest;
  }

  private static validationExceptionFactory(errors: ValidationError[]): Error {
    return new BadRequestException(
      errors.map(err => {
        const messages: string[] = [];

        for (const constraintKey in err.constraints) {
          if (Object.prototype.hasOwnProperty.call(err.constraints, constraintKey) && constraintKey) {
            messages.push(err.constraints[constraintKey]);
          }
        }
        return { property: err.property, error: messages };
      }),
    );
  }

  private static applyLastMiddlewares(_express: expressServer.Application, nest: INestApplication): void {
    Application.configureSwagger(nest);
  }

  private static configureSwagger(nestApp: INestApplication): void {
    const config = new DocumentBuilder()
      .setTitle(API_CONFIG.projectName)
      .setDescription(API_CONFIG.projectDescription)
      .setVersion(API_CONFIG.projectVersion)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(nestApp, config);
    try {
      SwaggerModule.setup(API_CONFIG.apiPrefix, nestApp, document);
    } catch (error: unknown) {
      if (
        isEnv(Environment.test) &&
        error instanceof Error &&
        error.message.includes('swaggerUi.generateHTML is not a function')
      ) {
        // this error is thrown during unit-tests run for some reason
        return;
      }
      throw error;
    }
  }
}
