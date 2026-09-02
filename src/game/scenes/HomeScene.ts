import { Container, Graphics, Sprite, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { GameClient } from "../../core/GameClient";
import type { FurnitureKind, GameState } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import { DAILY_QUIZ_ID } from "../../domain/study";
import { CanvasButton } from "../components/CanvasButton";
import { HomeMenuButton, type HomeMenuIcon } from "../components/HomeMenuButton";
import { ToastLayer } from "../components/ToastLayer";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import type { CatAnimationSet } from "../entities/CatAnimations";
import { ForestClearingView } from "../forest/ForestClearingView";
import { DailyQuestScene } from "./DailyQuestScene";
import { GachaScene } from "./GachaScene";
import { RankingScene } from "./RankingScene";
import { ShopScene } from "./ShopScene";
import { StudyModal } from "./StudyModal";

export class HomeScene extends Container {
  private state: GameState;
  private readonly gameClient: GameClient;
  private readonly catAnimations: CatAnimationSet;
  private readonly clearingViewport = new Container();
  private readonly clearing: ForestClearingView;
  private readonly uiLayer = new Container();
  private readonly modalLayer = new Container();
  private readonly toastLayer = new ToastLayer();
  private readonly profilePanel = new Container();
  private readonly currencyPanel = new Container();
  private readonly leftMenu = new Container();
  private readonly rightMenu = new Container();
  private readonly coinText: Text;
  private readonly gemText: Text;
  private readonly vignette = new Graphics();
  private installButton: CanvasButton | null = null;
  private studyModal: StudyModal | null = null;
  private shopScene: ShopScene | null = null;
  private dailyQuestScene: DailyQuestScene | null = null;
  private gachaScene: GachaScene | null = null;
  private rankingScene: RankingScene | null = null;
  private placementPanel: Container | null = null;
  private selectedFurniture: FurnitureKind | null = null;
  private screenWidth = BASE_WIDTH;
  private screenHeight = BASE_HEIGHT;

  constructor(gameClient: GameClient, catAnimations: CatAnimationSet) {
    super();
    this.gameClient = gameClient;
    this.catAnimations = catAnimations;
    this.state = gameClient.getSnapshot();
    this.clearing = new ForestClearingView({
      getFurniture: () => this.state.furniture,
      onPlace: (command) => this.gameClient.placeFurniture(command),
      onRemove: (instanceId) => this.gameClient.removeFurniture(instanceId),
      onToast: (message) => this.notify(message),
      catAnimations,
    });
    this.clearingViewport.addChild(this.clearing);
    this.addChild(this.clearingViewport, this.vignette, this.uiLayer, this.modalLayer, this.toastLayer);

    this.buildProfile();
    const currencyTexts = this.buildCurrency();
    this.coinText = currencyTexts.coins;
    this.gemText = currencyTexts.gems;
    this.buildHomeMenus();
    this.uiLayer.addChild(this.profilePanel, this.currencyPanel, this.leftMenu, this.rightMenu);
    this.gameClient.subscribe((snapshot) => this.syncState(snapshot));
  }

  update(deltaSeconds: number): void {
    if (!this.studyModal && !this.shopScene && !this.dailyQuestScene && !this.gachaScene && !this.rankingScene) {
      this.clearing.update(deltaSeconds);
    }
  }

  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.vignette
      .clear()
      .rect(0, 0, width, height)
      .fill({ color: 0xfff0d0, alpha: 0.08 })
      .roundRect(12, 12, width - 24, height - 24, 34)
      .stroke({ color: 0x8a5a38, width: 3, alpha: 0.32 });
    const clearingScale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.clearingViewport.scale.set(clearingScale);
    this.clearingViewport.position.set(
      (width - BASE_WIDTH * clearingScale) / 2,
      (height - BASE_HEIGHT * clearingScale) / 2,
    );

    this.profilePanel.position.set(30, 24);
    this.currencyPanel.position.set(width - 420, 24);
    this.leftMenu.position.set(22, 164);
    this.rightMenu.position.set(width - 126, 112);
    this.installButton?.position.set(-72, 464);
    this.studyModal?.layout(width, height);
    this.shopScene?.layout(width, height);
    this.dailyQuestScene?.layout(width, height);
    this.gachaScene?.layout(width, height);
    this.rankingScene?.layout(width, height);
    this.placementPanel?.position.set(width / 2, height - 92);
    this.toastLayer.layout(width);
  }

  notify(message: string): void {
    this.toastLayer.show(message, this.screenWidth);
  }

  setInstallHandler(handler: (() => void) | null): void {
    if (this.installButton) {
      this.rightMenu.removeChild(this.installButton);
      this.installButton.destroy({ children: true });
      this.installButton = null;
    }
    if (!handler) {
      return;
    }
    this.installButton = new CanvasButton({
      label: message("home.install"),
      width: 178,
      height: 52,
      color: 0x89a8a0,
      onPress: handler,
    });
    this.installButton.position.set(-72, 464);
    this.rightMenu.addChild(this.installButton);
  }

  private buildProfile(): void {
    this.profilePanel.addChild(
      new Graphics()
        .roundRect(0, 0, 154, 116, 25)
        .fill({ color: 0xfff4db, alpha: 0.96 })
        .stroke({ color: 0x69432c, width: 5 }),
    );
    const portrait = new Sprite(this.catAnimations.idle.textures[0]);
    portrait.anchor.set(this.catAnimations.idle.anchor.x, this.catAnimations.idle.anchor.y);
    portrait.scale.set(0.29);
    portrait.position.set(49, 89);
    this.profilePanel.addChild(portrait);
    const level = new Text({ text: message("home.level", { level: 10 }), style: textStyle(17, 0x3d2b22, "700") });
    level.anchor.set(0.5);
    level.position.set(111, 51);
    const paw = new Graphics()
      .circle(126, 48, 13)
      .fill(0xefad62)
      .circle(111, 34, 6)
      .circle(124, 27, 6)
      .circle(138, 34, 6)
      .fill(0xefad62);
    this.profilePanel.addChild(level, paw);
  }

  private buildCurrency(): { coins: Text; gems: Text } {
    this.currencyPanel.addChild(
      new Graphics()
        .roundRect(4, 5, 390, 58, 24)
        .fill({ color: 0x68412b, alpha: 0.18 })
        .roundRect(0, 0, 390, 58, 24)
        .fill({ color: 0xfff3d5, alpha: 0.96 })
        .stroke({ color: 0x69432c, width: 4 }),
      new Graphics().circle(34, 29, 20).fill(0xf3ba36).stroke({ color: 0x9f5f1f, width: 4 }),
    );
    const mark = new Text({ text: message("home.coinMark"), style: textStyle(19, 0x8c541b, "800") });
    mark.anchor.set(0.5);
    mark.position.set(34, 29);
    this.currencyPanel.addChild(mark);

    const coins = new Text({ text: this.state.coins.toLocaleString(), style: textStyle(20, 0x3d2b22, "700") });
    coins.anchor.set(1, 0.5);
    coins.position.set(188, 29);
    this.currencyPanel.addChild(coins);

    this.currencyPanel.addChild(this.drawBanknoteIcon());
    const gems = new Text({ text: String(this.state.gems), style: textStyle(20, 0x3d2b22, "700") });
    gems.anchor.set(1, 0.5);
    gems.position.set(360, 29);
    this.currencyPanel.addChild(gems);
    return { coins, gems };
  }

  private drawBanknoteIcon(): Graphics {
    return new Graphics()
      .roundRect(205, 11, 48, 36, 7)
      .fill(0x6fa63f)
      .stroke({ color: 0x365c2c, width: 3 })
      .roundRect(211, 16, 36, 26, 5)
      .stroke({ color: 0xb9d66d, width: 2 })
      .circle(229, 29, 8)
      .fill(0xd6e88b)
      .stroke({ color: 0x4f7c34, width: 2 })
      .moveTo(207, 19)
      .lineTo(214, 12)
      .moveTo(245, 46)
      .lineTo(252, 39)
      .stroke({ color: 0x365c2c, width: 3 });
  }

  private buildHomeMenus(): void {
    const addMenuButton = (
      menu: Container,
      index: number,
      icon: HomeMenuIcon,
      labelId:
        | "home.settings"
        | "home.friends"
        | "home.ranking"
        | "home.study"
        | "home.dailyQuest"
        | "home.gacha"
        | "home.shop",
      onPress: () => void,
    ) => {
      const button = new HomeMenuButton({ icon, label: message(labelId), onPress });
      button.y = index * 128;
      menu.addChild(button);
    };
    addMenuButton(this.leftMenu, 0, "settings", "home.settings", () => this.notify(message("home.settingsComingSoon")));
    addMenuButton(this.leftMenu, 1, "friends", "home.friends", () => this.notify(message("home.friendsComingSoon")));
    addMenuButton(this.leftMenu, 2, "ranking", "home.ranking", () => this.openRanking());
    addMenuButton(this.rightMenu, 0, "study", "home.study", () => this.openStudy());
    addMenuButton(this.rightMenu, 1, "quest", "home.dailyQuest", () => this.openDailyQuest());
    addMenuButton(this.rightMenu, 2, "gacha", "home.gacha", () => this.openGacha());
    addMenuButton(this.rightMenu, 3, "shop", "home.shop", () => this.openShop());
  }

  private openGacha(): void {
    if (this.gachaScene) {
      return;
    }
    this.gachaScene = new GachaScene({
      getState: () => this.state,
      onBack: () => this.closeGacha(),
      onDraw: () => this.notify(message("gacha.drawComingSoon")),
    });
    this.modalLayer.addChild(this.gachaScene);
    this.gachaScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeGacha(): void {
    if (!this.gachaScene) {
      return;
    }
    this.modalLayer.removeChild(this.gachaScene);
    this.gachaScene.destroy({ children: true });
    this.gachaScene = null;
  }

  private openRanking(): void {
    if (this.rankingScene) {
      return;
    }
    this.rankingScene = new RankingScene({
      getState: () => this.state,
      onBack: () => this.closeRanking(),
      onRefresh: () => this.notify(message("ranking.refreshDone")),
    });
    this.modalLayer.addChild(this.rankingScene);
    this.rankingScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeRanking(): void {
    if (!this.rankingScene) {
      return;
    }
    this.modalLayer.removeChild(this.rankingScene);
    this.rankingScene.destroy({ children: true });
    this.rankingScene = null;
  }

  private openShop(): void {
    if (this.shopScene) {
      return;
    }
    this.shopScene = new ShopScene({
      getState: () => this.state,
      onBack: () => this.closeShop(),
      onBuy: (itemId) => this.buyShopItem(itemId),
    });
    this.modalLayer.addChild(this.shopScene);
    this.shopScene.layout(this.screenWidth, this.screenHeight);
  }

  private openDailyQuest(): void {
    if (this.dailyQuestScene) {
      return;
    }
    this.dailyQuestScene = new DailyQuestScene({
      getState: () => this.state,
      onBack: () => this.closeDailyQuest(),
      onQuest: () => this.notify(message("daily.questComingSoon")),
      onClaimAll: () => this.notify(message("daily.claimComingSoon")),
    });
    this.modalLayer.addChild(this.dailyQuestScene);
    this.dailyQuestScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeDailyQuest(): void {
    if (!this.dailyQuestScene) {
      return;
    }
    this.modalLayer.removeChild(this.dailyQuestScene);
    this.dailyQuestScene.destroy({ children: true });
    this.dailyQuestScene = null;
  }

  private closeShop(): void {
    if (!this.shopScene) {
      return;
    }
    this.modalLayer.removeChild(this.shopScene);
    this.shopScene.destroy({ children: true });
    this.shopScene = null;
  }

  private buyShopItem(itemId: ShopItemId | null): void {
    if (!itemId) {
      this.notify(message("shop.itemNotPlaceable"));
      return;
    }
    const result = this.gameClient.buyShopItem(itemId);
    if (!result.ok) {
      const messageId = result.reason === "insufficient-gems" ? "shop.insufficientGems" : "shop.insufficientCoins";
      this.notify(message(messageId));
      return;
    }
    this.closeShop();
    this.startPlacement(result.furnitureKind);
    this.notify(message("shop.purchaseComplete"));
  }

  private startPlacement(kind: FurnitureKind): void {
    this.stopPlacement();
    this.selectedFurniture = kind;
    this.clearing.setPlacementMode(true, kind, 0);
    const panel = new Container();
    panel.addChild(
      new Graphics().roundRect(-300, -42, 600, 84, 24).fill(0xfff3dc).stroke({ color: 0x68442f, width: 4 }),
    );
    const label = new Text({ text: message("shop.placementGuide"), style: textStyle(17, 0x4b3021, "700") });
    label.anchor.set(0.5);
    label.position.set(-65, 0);
    const cancel = new CanvasButton({
      label: message("shop.cancelPlacement"),
      width: 135,
      height: 48,
      color: 0xd7ad7e,
      onPress: () => this.stopPlacement(),
    });
    cancel.position.set(145, -24);
    panel.addChild(label, cancel);
    panel.position.set(this.screenWidth / 2, this.screenHeight - 92);
    this.placementPanel = panel;
    this.uiLayer.addChild(panel);
  }

  private stopPlacement(): void {
    this.selectedFurniture = null;
    this.clearing.setPlacementMode(false, null, 0);
    if (!this.placementPanel) {
      return;
    }
    this.uiLayer.removeChild(this.placementPanel);
    this.placementPanel.destroy({ children: true });
    this.placementPanel = null;
  }

  private openStudy(): void {
    if (this.studyModal) {
      return;
    }
    const quiz = this.gameClient.getQuiz(DAILY_QUIZ_ID);
    if (!quiz) {
      this.notify(message("home.quizUnavailable"));
      return;
    }
    this.studyModal = new StudyModal({
      quiz,
      onAnswer: (choiceId) => this.gameClient.answerQuiz(quiz.id, choiceId),
      onClose: () => this.closeStudy(),
    });
    this.modalLayer.addChild(this.studyModal);
    this.studyModal.layout(this.screenWidth, this.screenHeight);
  }

  private closeStudy(): void {
    if (!this.studyModal) {
      return;
    }
    this.modalLayer.removeChild(this.studyModal);
    this.studyModal.destroy({ children: true });
    this.studyModal = null;
  }

  private syncState(snapshot: GameState): void {
    this.state = snapshot;
    this.coinText.text = snapshot.coins.toLocaleString();
    this.gemText.text = String(snapshot.gems);
    this.clearing.syncFurniture();
    if (this.selectedFurniture && snapshot.inventory[this.selectedFurniture] <= 0) {
      this.stopPlacement();
    }
  }
}
