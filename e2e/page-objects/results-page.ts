import { type Page, type Locator } from "@playwright/test";

export class ResultsPage {
  readonly page: Page;
  readonly code: string;

  readonly winnerName: Locator;
  readonly potAmount: Locator;
  readonly playAnotherButton: Locator;
  readonly playAgainButton: Locator;
  readonly returnToRoomListButton: Locator;
  readonly lobbyButton: Locator;
  readonly mainMenuButton: Locator;
  readonly playerResults: Locator;

  constructor(page: Page, code: string) {
    this.page = page;
    this.code = code;
    this.winnerName = page.locator('[data-testid="winner-name"]');
    this.potAmount = page.locator('[data-testid="pot-amount"]');
    this.playAnotherButton = page.getByRole("button", { name: /play another/i });
    this.playAgainButton = page.locator('[data-testid="play-again-button"]');
    this.returnToRoomListButton = page.getByRole("button", {
      name: /return to room list/i,
    });
    this.lobbyButton = page.locator('[data-testid="lobby-button"]');
    this.mainMenuButton = page.getByRole("button", { name: /main menu/i });
    this.playerResults = page.locator('[data-testid="player-result"]');
  }

  async goto() {
    await this.page.goto(`/results/${this.code}`);
  }

  async waitForLoaded() {
    await this.page.waitForURL(`/results/${this.code}`);
    await this.page.waitForSelector('[data-testid="results-content"]', {
      timeout: 15_000,
    });
  }

  async getWinnerName(): Promise<string> {
    return (await this.winnerName.textContent()) ?? "";
  }

  async getPotAmount(): Promise<string> {
    return (await this.potAmount.textContent()) ?? "";
  }

  async getPlayerResultCount(): Promise<number> {
    return this.playerResults.count();
  }

  async getPlayerResult(index: number): Promise<{
    name: string;
    word: string;
    score: string;
  }> {
    const resultCard = this.playerResults.nth(index);
    return {
      name:
        (await resultCard.locator('[data-testid="player-name"]').textContent()) ??
        "",
      word:
        (await resultCard.locator('[data-testid="player-word"]').textContent()) ??
        "",
      score:
        (await resultCard.locator('[data-testid="player-score"]').textContent()) ??
        "",
    };
  }

  async clickPlayAnother() {
    await this.playAnotherButton.click();
    await this.page.waitForURL(/\/rooms\/[A-Z0-9]+/);
  }

  async clickPlayAgain() {
    await this.playAgainButton.click();
    await this.page.waitForURL(/\/rooms\/[A-Z0-9]+/);
  }

  async clickReturnToRoomList() {
    await this.returnToRoomListButton.click();
    await this.page.waitForURL(/\?view=online/);
  }

  async clickLobby() {
    await this.lobbyButton.click();
    await this.page.waitForURL(/\?view=online/);
  }

  async clickMainMenu() {
    await this.mainMenuButton.click();
    await this.page.waitForURL("/");
  }

  async isPlayAnotherVisible(): Promise<boolean> {
    return this.playAnotherButton.isVisible();
  }
}
