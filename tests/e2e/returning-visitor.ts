import { test as base } from '@playwright/test';

// Existing gameplay and story tests begin on the landing page of a returning visitor.
export function markOpeningEntered() {
  sessionStorage.setItem('indoghost.opening.v1', 'entered');
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(markOpeningEntered);
    await use(context);
  },
});
