import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

const optionalChildEmailSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized ? normalized.toLowerCase() : null;
  },
  z.string().email('Enter a valid child email address').nullable().optional()
);

const optionalChildPasswordSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value);
    return normalized.length ? normalized : null;
  },
  z.string().min(8, 'Child password must be at least 8 characters.').max(100).nullable().optional()
);

export const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: emailSchema,
  password: z.string().min(8).max(100)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const childCreateSchema = z.object({
  name: z.string().min(1).max(80),
  dateOfBirth: z.string().date(),
  email: optionalChildEmailSchema,
  password: optionalChildPasswordSchema,
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits').nullable().optional()
}).superRefine((value, ctx) => {
  const hasEmail = Boolean(value.email);
  const hasPassword = Boolean(value.password);
  if (hasEmail !== hasPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Child email and password must be provided together',
      path: ['email']
    });
  }
});

export const childLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const childPinLoginSchema = z.object({
  parentEmail: emailSchema,
  childName: z.string().min(1).max(80),
  pin: z.string().regex(/^\d{4}$/)
});

export const childSessionLoginSchema = z.object({
  childId: z.string().uuid()
});

export const taskCreateSchema = z.object({
  childId: z.string().uuid(),
  title: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  points: z.number().int().min(5).max(50),
  gpPoints: z.number().int().min(0).max(1000).default(0),
  dueDate: z.string().datetime(),
  category: z.enum(['school', 'chores', 'activities', 'health', 'other']).default('other'),
  recurrenceDays: z.string().max(50).nullable().optional()
});

export const taskScheduleUpdateSchema = z.object({
  recurrenceDays: z.string().max(50).nullable().optional()
});

// Evidence is stored as base64 in SQLite. Cap at ~10 MB (base64 ≈ 13.3 MB on wire).
// This accommodates a high-quality mobile photo while preventing DB bloat.
// Videos are intentionally capped at the same limit — encourage short clips.
const EVIDENCE_MAX_BYTES = 10_000_000;

export const taskCompleteSchema = z.object({
  taskId: z.string().uuid(),
  evidenceData: z.string().max(EVIDENCE_MAX_BYTES, 'Evidence file is too large. Maximum size is 10 MB.'),
  evidenceMime: z.string().max(80),
  evidenceType: z.enum(['Photo', 'Video']),
  evidenceNote: z.string().max(200).nullable().optional()
});

export const taskDecisionSchema = z.object({
  taskId: z.string().uuid(),
  note: z.string().max(200).nullable().optional()
});

export const taskDisputeSchema = z.object({
  taskId: z.string().uuid(),
  note: z.string().min(1).max(200)
});

export const taskRequestCreateSchema = z.object({
  title: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  requestedPoints: z.number().int().min(5).max(50).default(10)
});

export const taskRequestDecisionSchema = z.object({
  note: z.string().max(200).nullable().optional(),
  dueDate: z.string().datetime().optional(),
  points: z.number().int().min(5).max(50).optional(),
  gpPoints: z.number().int().min(0).max(1000).optional()
});

export const pointsAdjustSchema = z.object({
  childId: z.string().uuid(),
  points: z.number().int().min(-1000).max(1000).refine((v) => v !== 0),
  note: z.string().min(1).max(100)
});

export const rewardCreateSchema = z.object({
  title: z.string().min(1).max(50),
  pointsCost: z.number().int().min(5).max(1000),
  pointsType: z.enum(['RP', 'GP']).default('RP'),
  quantityLimit: z.number().int().min(1).max(1000).nullable().optional(),
  active: z.boolean().default(true)
});

export const giftcardCatalogQuerySchema = z.object({
  brand: z.string().max(80).optional(),
  pageNumber: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const giftcardSkuParamsSchema = z.object({
  giftcardId: z.string().min(1).max(120)
});

export const giftcardPurchaseSchema = z.object({
  merchantOrderRequestId: z.string().min(6).max(100).optional(),
  giftcardId: z.string().min(1).max(120),
  giftcardName: z.string().max(120).optional(),
  skuId: z.string().min(1).max(120),
  skuName: z.string().max(120).optional(),
  quantity: z.coerce.number().int().min(1).max(50),
  currency: z.string().min(3).max(10).default('INR').transform((value) => value.toUpperCase()),
  fulfilmentType: z.enum(['VOUCHER', 'TOPUP']).default('VOUCHER'),
  finalPrice: z.union([z.string().min(1).max(40), z.number().positive()]).optional(),
  customerDetails: z.record(z.any()).optional(),
  deliveryDetails: z.record(z.any()).optional(),
  customerDistributionChannels: z.array(z.enum(['EMAIL', 'WHATSAPP', 'SMS'])).max(3).optional()
});

export const giftcardManualInventorySchema = z.object({
  merchantOrderRequestId: z.string().min(6).max(100).optional(),
  store: z.string().min(1).max(80).default('Amazon'),
  purchaseReference: z.string().max(120).optional(),
  giftcardId: z.string().min(1).max(120).optional(),
  giftcardName: z.string().min(1).max(120),
  skuId: z.string().min(1).max(120).optional(),
  skuName: z.string().min(1).max(120),
  currency: z.string().min(3).max(10).default('SGD').transform((value) => value.toUpperCase()),
  purchaseAmount: z.union([z.string().min(1).max(40), z.number().positive()]).optional(),
  note: z.string().max(200).optional(),
  codes: z.array(
    z.object({
      code: z.string().min(1).max(200),
      pin: z.string().max(50).optional(),
      expiryDate: z.string().max(32).optional()
    })
  ).min(1).max(500)
});

export const giftcardInventorySyncParamsSchema = z.object({
  batchId: z.string().uuid()
});

export const giftcardCreateRewardSchema = z.object({
  batchId: z.string().uuid(),
  title: z.string().min(1).max(50).optional(),
  pointsCost: z.coerce.number().int().min(5).max(1000),
  quantityLimit: z.coerce.number().int().min(1).max(1000).optional(),
  active: z.boolean().default(true)
});

export const giftcardRedemptionDetailsParamsSchema = z.object({
  redemptionId: z.string().uuid()
});

export const giftcardGpPurchaseSchema = z.object({
  gpPoints: z.coerce.number().int().min(1).max(100000),
  moneyAmount: z.union([z.string().min(1).max(40), z.number().positive()]).optional(),
  currency: z.string().min(3).max(10).default('SGD').transform((value) => value.toUpperCase()),
  note: z.string().max(200).optional()
});

export const giftcardGpTransactionsQuerySchema = z.object({
  childId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100)
});

export const redeemSchema = z.object({
  rewardId: z.string().uuid()
});

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1)
});

function normalizePlatform(value) {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();
  if (!lower) return raw;
  const map = {
    ios: 'iOS',
    android: 'Android',
    windows: 'Windows',
    macos: 'macOS',
    web: 'Web',
    console: 'Console',
    unknown: 'Unknown',
    other: 'Other'
  };
  return map[lower] || raw;
}

const gamingPlatformEnum = z.enum(['iOS', 'Android', 'Windows', 'macOS', 'Web', 'Console', 'Unknown', 'Other']);
const gamingPlatformSchema = z.preprocess((value) => normalizePlatform(value), gamingPlatformEnum);
const gamingStatusEnum = z.enum(['Blocked', 'Allowed']);

export const gamingSettingsUpdateSchema = z
  .object({
    pointsUnit: z.number().int().min(1).max(200).optional(),
    minutesUnit: z.number().int().min(1).max(240).optional(),
    dailyCapMinutes: z.number().int().min(15).max(1440).optional(),
    weeklyCapMinutes: z.number().int().min(60).max(10080).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one gaming setting must be provided'
  });

export const gamingGameCreateSchema = z.object({
  name: z.string().min(1).max(80),
  platform: gamingPlatformSchema,
  status: gamingStatusEnum.optional(),
  externalId: z.string().max(120).nullable().optional(),
  source: z.string().max(20).optional()
});

export const gamingGameUpdateSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    platform: gamingPlatformSchema.optional(),
    status: gamingStatusEnum.optional(),
    externalId: z.string().max(120).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one game field must be provided'
  });

export const gamingSyncDetectedSchema = z.object({
  platform: gamingPlatformSchema.optional(),
  games: z.array(
    z.object({
      name: z.string().min(1).max(80),
      platform: gamingPlatformSchema.optional(),
      externalId: z.string().max(120).nullable().optional()
    })
  ).min(1).max(500)
});

export const gamingSessionStartSchema = z
  .object({
    childId: z.string().uuid().optional(),
    gameId: z.string().uuid().optional(),
    gameName: z.string().min(1).max(80).optional(),
    platform: gamingPlatformSchema.optional(),
    requestedMinutes: z.number().int().min(1).max(240).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.gameId && !value.gameName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide gameId or gameName',
        path: ['gameName']
      });
    }
    if (!value.gameId && !value.platform) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Platform is required when starting by game name',
        path: ['platform']
      });
    }
  });

export const gamingSessionEndSchema = z.object({
  childId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  actualMinutes: z.number().int().min(1).max(600)
});

export const gamingSessionsQuerySchema = z.object({
  childId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const gamingAuditQuerySchema = z.object({
  childId: z.string().uuid().optional(),
  status: z.enum(['Started', 'Completed', 'Denied']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(80)
});

export const gamingSessionImportSchema = z.object({
  childId: z.string().uuid(),
  entries: z.array(
    z.object({
      gameName: z.string().min(1).max(80),
      platform: gamingPlatformSchema,
      startedAt: z.string().datetime(),
      durationMinutes: z.number().int().min(1).max(600)
    })
  ).min(1).max(1000)
});

export const gamingWeeklyReportQuerySchema = z.object({
  childId: z.string().uuid().optional(),
  weekStart: z.string().datetime().optional()
});

export const stripeCheckoutSchema = z.object({
  amountSgd: z.number().int().min(1).max(500)
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
});
