import { type Page, type Locator } from "@playwright/test";

export class RoomPage {
  readonly page: Page;
  readonly code: string;

  // Phase indicators
  readonly readyButton: Locator;
  readonly bettingControls: Locator;
  readonly wordBuilder: Locator;

  // Betting controls
  readonly checkButton: Locator;
  readonly callButton: Locator;
  readonly raiseButton: Locator;
  readonly foldButton: Locator;
  readonly raiseSlider: Locator;

  // Word builder controls
  readonly submitWordButton: Locator;
  readonly shuffleTilesButton: Locator;
  readonly showdownTimer: Locator;

  // Game state indicators
  readonly communityTiles: Locator;
  readonly playerHand: Locator;
  readonly potDisplay: Locator;
  readonly currentTurnIndicator: Locator;
  readonly actionMessage: Locator;

  constructor(page: Page, code: string) {
    this.page = page;
    this.code = code;
    this.readyButton = page.getByRole("button", { name: /ready/i });
    this.bettingControls = page.locator('[data-testid="betting-controls"]');
    this.wordBuilder = page.locator('[data-testid="word-builder"]');
    this.checkButton = page.getByRole("button", { name: /check/i });
    this.callButton = page.getByRole("button", { name: /call/i });
    this.raiseButton = page.getByRole("button", { name: /raise/i });
    this.foldButton = page.getByRole("button", { name: /fold/i });
    this.raiseSlider = page.locator('[data-testid="raise-slider"]');
    this.submitWordButton = page.getByRole("button", { name: /submit word/i });
    this.shuffleTilesButton = page.getByRole("button", { name: /shuffle/i });
    this.showdownTimer = page.locator('[data-testid="showdown-timer"]');
    this.communityTiles = page.locator('[data-testid="community-tiles"]');
    this.playerHand = page.locator('[data-testid="player-hand"]');
    this.potDisplay = page.locator('[data-testid="pot-display"]');
    this.currentTurnIndicator = page.locator(
      '[data-testid="current-turn"]',
    );
    this.actionMessage = page.locator('[data-testid="action-message"]');
  }

  async goto() {
    await this.page.goto(`/rooms/${this.code}`);
  }

  async waitForLoaded() {
    // Wait for the room page to render (poker table or lobby)
    await this.page.waitForURL(`/rooms/${this.code}`);
    await this.page.waitForSelector('[data-testid="room-content"]', {
      timeout: 15_000,
    });
  }

  async clickReady() {
    await this.readyButton.click();
  }

  async clickCheck() {
    await this.checkButton.click();
  }

  async clickCall() {
    await this.callButton.click();
  }

  async clickRaise() {
    await this.raiseButton.click();
  }

  async clickFold() {
    await this.foldButton.click();
  }

  async setRaiseAmount(amount: number) {
    // Adjust raise slider to the specified amount
    const slider = this.raiseSlider;
    await slider.click();
    // Use keyboard arrows or direct input if available
    await this.page.keyboard.press(`ArrowRight`);
  }

  async submitWord() {
    await this.submitWordButton.click();
  }

  async shuffleTiles() {
    await this.shuffleTilesButton.click();
  }

  async dragTileToWord(tileIndex: number, position: number) {
    // Drag a tile from the rack to the word builder area
    const tiles = this.page.locator('[data-testid="rack-tile"]');
    const wordArea = this.page.locator('[data-testid="word-area"]');
    await tiles.nth(tileIndex).dragTo(wordArea);
  }

  async toggleTile(tileIndex: number) {
    const tiles = this.page.locator('[data-testid="rack-tile"]');
    await tiles.nth(tileIndex).click();
  }

  async selectChoiceLetter(choiceIndex: number, letter: string) {
    // Click a choice tile to select a letter
    const choiceTiles = this.page.locator('[data-testid="choice-tile"]');
    await choiceTiles.nth(choiceIndex).click();
    await this.page.getByRole("button", { name: letter }).click();
  }

  async waitForBettingControls() {
    await this.checkButton.or(this.callButton).waitFor({ timeout: 15_000 });
  }

  async waitForWordBuilder() {
    await this.wordBuilder.waitFor({ timeout: 15_000 });
  }

  async waitForShowdownTimer() {
    await this.showdownTimer.waitFor({ timeout: 15_000 });
  }

  async waitForCommunityTiles(count: number) {
    await this.page
      .locator('[data-testid="community-tile"]')
      .first()
      .waitFor({ timeout: 15_000 });
  }

  async getPotAmount(): Promise<number> {
    const text = await this.potDisplay.textContent();
    return parseInt(text?.replace(/\D/g, "") ?? "0", 10);
  }

  async getShowdownTimeRemaining(): Promise<number> {
    const text = await this.showdownTimer.textContent();
    return parseInt(text?.replace(/\D/g, "") ?? "0", 10);
  }

  async isCheckVisible(): Promise<boolean> {
    return this.checkButton.isVisible();
  }

  async isCallVisible(): Promise<boolean> {
    return this.callButton.isVisible();
  }

  async isRaiseVisible(): Promise<boolean> {
    return this.raiseButton.isVisible();
  }

  async isFoldVisible(): Promise<boolean> {
    return this.foldButton.isVisible();
  }

  async isWordBuilderVisible(): Promise<boolean> {
    return this.wordBuilder.isVisible();
  }

  async isShowdownSubmissionOpen(): Promise<boolean> {
    return this.submitWordButton.isEnabled();
  }
}
