import { type Page, type Locator } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly quickStartButton: Locator;
  readonly tutorialButton: Locator;
  readonly playOnlineButton: Locator;
  readonly roomCodeInput: Locator;
  readonly joinRoomButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.quickStartButton = page.getByRole("button", { name: /quick start/i });
    this.tutorialButton = page.getByRole("button", { name: /tutorial/i });
    this.playOnlineButton = page.getByRole("button", { name: /play online/i });
    this.roomCodeInput = page.getByPlaceholder(/room code/i);
    this.joinRoomButton = page.getByRole("button", { name: /join/i });
  }

  async goto() {
    await this.page.goto("/");
  }

  async quickStartVsBots() {
    await this.quickStartButton.click();
    // Wait for room page to load
    await this.page.waitForURL(/\/rooms\/[A-Z0-9]+/);
  }

  async startTutorial() {
    await this.tutorialButton.click();
    await this.page.waitForURL(/\/rooms\/[A-Z0-9]+/);
  }

  async joinRoom(code: string) {
    await this.roomCodeInput.fill(code);
    await this.joinRoomButton.click();
    await this.page.waitForURL(/\/rooms\/[A-Z0-9]+/);
  }
}
