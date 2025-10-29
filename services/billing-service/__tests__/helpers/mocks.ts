/**
 * Mock implementations for Billing Service
 */

// ============================================================================
// Kafka Mock
// ============================================================================

export const mockKafkaProducer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
};

export const mockKafka = {
  producer: jest.fn(() => mockKafkaProducer),
  consumer: jest.fn(),
};

// ============================================================================
// Stripe Mock
// ============================================================================

export const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
    pay: jest.fn(),
    void: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
  },
};

// ============================================================================
// Redis Mock
// ============================================================================

export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
};

// ============================================================================
// Logger Mock
// ============================================================================

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// ============================================================================
// Mock Reset Helper
// ============================================================================

export function resetAllMocks(): void {
  jest.clearAllMocks();
}

beforeEach(() => {
  resetAllMocks();
});
