/**
 * Mock implementations for Payment Service
 */

// Stripe Mock
export const mockStripe = {
  paymentIntents: {
    create: jest.fn(() => ({
      id: 'pi_mock_id',
      status: 'succeeded',
      amount: 1000,
      currency: 'usd',
    })),
    retrieve: jest.fn(),
    confirm: jest.fn(),
  },
  paymentMethods: {
    create: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    list: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
};

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

export function resetAllMocks(): void {
  jest.clearAllMocks();
}

beforeEach(() => {
  resetAllMocks();
});
