import { z } from 'zod';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const createMonitorSchema = z.object({
  name: z.string().min(1, 'Monitor name is required.').max(200),
  url: z.string().url('Must be a valid URL (include http:// or https://).'),
  method: z.enum(HTTP_METHODS).default('GET'),
  headers: z.record(z.string()).optional().default({}),
  body: z.string().optional(),
  interval: z
    .number({ invalid_type_error: 'Interval must be a number.' })
    .min(30, 'Minimum check interval is 30 seconds.')
    .default(60),
  timeout: z
    .number()
    .min(1000, 'Timeout must be at least 1000 ms.')
    .max(30000, 'Timeout must be at most 30000 ms.')
    .default(10000),
  expectedStatus: z
    .number()
    .min(100)
    .max(599)
    .default(200),
  expectedBodyContains: z.string().optional(),
  checkSSL: z.boolean().default(true),
  sslExpiryThreshold: z.number().min(1).default(14),
  alertChannels: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

export const updateMonitorSchema = createMonitorSchema.partial();
