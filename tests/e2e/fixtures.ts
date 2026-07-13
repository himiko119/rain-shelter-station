import { expect, test as base } from "@playwright/test";

interface RuntimeFixtures {
  readonly runtimeGuard: void;
}

export const test = base.extend<RuntimeFixtures>({
  runtimeGuard: [
    async ({ page }, use) => {
      const failures: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          const location = message.location();
          failures.push(
            `console.error: ${message.text()}${location.url ? ` (${location.url}:${location.lineNumber ?? 0})` : ""}`,
          );
        }
      });
      page.on("pageerror", (error) => {
        failures.push(`pageerror: ${error.stack ?? error.message}`);
      });
      page.on("requestfailed", (request) => {
        failures.push(
          `requestfailed: ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "unknown error"}`,
        );
      });
      page.on("response", (response) => {
        if (response.status() >= 400) {
          failures.push(`http ${response.status()}: ${response.request().method()} ${response.url()}`);
        }
      });

      await use();

      expect(failures, "The game emitted browser, page, or request failures.").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
