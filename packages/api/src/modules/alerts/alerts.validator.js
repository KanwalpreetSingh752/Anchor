import { z } from 'zod';

const emailChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required.').max(200),
  type: z.literal('EMAIL'),
  config: z.object({
    address: z.string().email('Valid email address is required.'),
  }),
  isActive: z.boolean().optional().default(true),
});

const webhookChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required.').max(200),
  type: z.literal('WEBHOOK'),
  config: z.object({
    url: z.string().url('Valid webhook URL is required.'),
    secret: z.string().optional(),
  }),
  isActive: z.boolean().optional().default(true),
});

const slackChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required.').max(200),
  type: z.literal('SLACK'),
  config: z.object({
    webhookUrl: z.string().url('Valid Slack webhook URL is required.'),
    channel: z.string().optional(),
  }),
  isActive: z.boolean().optional().default(true),
});

export const createAlertChannelSchema = z.discriminatedUnion('type', [
  emailChannelSchema,
  webhookChannelSchema,
  slackChannelSchema,
]);

export const updateAlertChannelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.any()).optional(),
});
