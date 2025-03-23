import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { LoggerOptions } from 'pino';

import { SENSITIVE_FIELDS } from '@/common/constants/sensitive-fields.constants';
import { Environment } from '@/config/env/env.interface';

/**
 * Header paths that contain sensitive information
 */
export const SENSITIVE_HEADERS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-token"]',
  'res.headers["set-cookie"]',
];

/**
 * Logger configuration service
 * Configures Pino logger based on environment settings
 */
@Injectable()
export class LoggerConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Creates the logger configuration
   * @returns Pino logger configuration
   */
  createLoggerOptions(): Params {
    const nodeEnv = this.configService.get<Environment>('NODE_ENV');
    const logLevel = this.configService.get<string>('LOG_LEVEL');
    const logFormat = this.configService.get<string>('LOG_FORMAT');

    // Base logger options
    const loggerOptions: LoggerOptions = {
      level: logLevel || 'info',
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
      redact: {
        paths: [
          // Authentication related
          ...SENSITIVE_HEADERS,

          // Common credential patterns
          ...SENSITIVE_FIELDS,

          // Nested credentials with wildcards
          ...SENSITIVE_FIELDS.map((field) => `*.${field}`),

          // Request body may contain sensitive information
          ...SENSITIVE_FIELDS.map((field) => `req.body.${field}`),
        ],
        // Use censor method instead of remove
        censor: '[REDACTED]',
      },
    };

    // Dev-specific configuration with pretty printing
    if (nodeEnv !== Environment.Production && logFormat === 'dev') {
      return {
        pinoHttp: {
          ...loggerOptions,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              levelFirst: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              singleLine: false,
              messageFormat: '{correlationId} {req.method} {req.url} {msg}',
              errorLikeObjectKeys: ['err', 'error'],
              ignore: 'pid,hostname',
            },
          },
        },
      };
    }

    // Production-specific configuration with JSON formatting and log rotation
    if (nodeEnv === Environment.Production) {
      const logDir = this.configService.get<string>('LOG_DIR', 'logs');
      const logFilePrefix = this.configService.get<string>('LOG_FILE_PREFIX', 'app');

      return {
        pinoHttp: {
          ...loggerOptions,
          transport: {
            target: 'pino-roll',
            options: {
              // Log file path and naming pattern
              file: `${logDir}/${logFilePrefix}-%Y-%m-%d-%H-%M.log`,

              // Size-based rotation (when file reaches 10 MB)
              size: '10m',

              // Keep 7 days of logs
              maxFiles: 7,

              // Use gzip compression for rotated logs
              compress: 'gzip',

              // Create the log directory if it doesn't exist
              mkdir: true,
            },
          },
        },
      };
    }

    // Default configuration with JSON formatting (no rotation)
    return {
      pinoHttp: {
        ...loggerOptions,
        // No transport configuration - outputs plain JSON
      },
    };
  }
}
