import { z } from 'zod';

// Zod speeds up object parsing with new Function() where it can. The site's
// Content-Security-Policy forbids that, so tell it not to try. This module is
// imported first, before any schema is created.
z.config({ jitless: true });
