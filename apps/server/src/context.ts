import type { Config } from './config';
import { createMailer, type Mailer } from './services/mail';
import { createPaymentProvider, type PaymentProvider } from './services/payments';
import { createTokenService, type TokenService } from './services/tokens';

export interface AppContext {
  config: Config;
  tokens: TokenService;
  payments: PaymentProvider;
  mailer: Mailer;
}

export function createContext(config: Config): AppContext {
  return {
    config,
    tokens: createTokenService(config.jwt.secret, config.jwt.expiresIn),
    payments: createPaymentProvider(config.payments),
    mailer: createMailer(config.mail),
  };
}
