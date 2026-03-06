import Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application Environment
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Server Configuration
  PORT: Joi.number().default(3002),
  HOST: Joi.string().default('0.0.0.0'),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose', 'silly')
    .default('debug'),

  // CORS Configuration
  CORS_ENABLED: Joi.boolean().default(true),
  CORS_ORIGIN: Joi.string().default('*'),

  // API Configuration
  API_PREFIX: Joi.string().default('/api'),
  API_VERSION: Joi.string().default('v1'),

  // API Key Configuration
  API_KEY_ENABLED: Joi.boolean().default(false),
  API_KEY: Joi.string().default('your-development-secret-key-change-in-production'),

  // Feature Flags
  ENABLE_SWAGGER: Joi.boolean().default(true),
  ENABLE_HEALTH_CHECK: Joi.boolean().default(true),

  // Application Information
  APP_NAME: Joi.string().default('transaction-processing-service'),
  APP_DESCRIPTION: Joi.string().default('Payment transaction processing microservice'),

  // DB Domain Service — persistence is delegated via HTTP (see ADR-001)
  DB_DOMAIN_SERVICE_URL: Joi.string().required(),
  DB_DOMAIN_SERVICE_API_KEY: Joi.string().required(),

  // Payment Provider
  PAYMENT_PROVIDER_ENVIRONMENT: Joi.string()
    .valid('sandbox', 'production')
    .default('sandbox'),
  PAYMENT_PROVIDER_SANDBOX_URL: Joi.string().default('https://sandbox.wompi.co/v1'),
  PAYMENT_PROVIDER_PRODUCTION_URL: Joi.string().default('https://production.wompi.co/v1'),
  PAYMENT_PROVIDER_PUBLIC_KEY: Joi.string().required(),
  PAYMENT_PROVIDER_PRIVATE_KEY: Joi.string().required(),
  PAYMENT_PROVIDER_EVENTS_KEY: Joi.string().required(),
  PAYMENT_PROVIDER_INTEGRITY_KEY: Joi.string().required(),
}).unknown(true);
