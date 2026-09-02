import { Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { GameClient } from "../../core/GameClient";
import type { CatVariant } from "../../domain/cats";
import type { FurnitureKind, GameState, PlacedFurniture } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import { DAILY_QUIZ_ID } from "../../domain/study";
import { CanvasButton } from "../components/CanvasButton";
import { HomeMenuButton } from "../components/HomeMenuButton";
import { ToastLayer } from "../components/ToastLayer";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import type { CatAnimationLibrary } from "../entities/CatAnimations";
import { ForestClearingView } from "../forest/ForestClearingView";
import { DailyQuestScene } from "./DailyQuestScene";
import { type FeaturePageKind, FeaturePageModal } from "./FeaturePageModal";
import { GachaScene } from "./GachaScene";
import { ShopScene } from "./ShopScene";
import { StudyModal } from "./StudyModal";

export type HomeIconSources = {
  studyGroup: string;
  shopGroup: string;
  socialGroup: string;
  learning: string;
  dailyQuest: string;
  roomDecor: string;
  gacha: string;
  ownedCollection: string;
  addFriend: string;
  visitGarden: string;
};

export class HomeScene extends Container {
  private state: GameState;
  private readonly gameClient: GameClient;
  private readonly iconSources: HomeIconSources;
  private readonly catAnimations: CatAnimationLibrary;
  private readonly desktopWidget: boolean;
  private readonly clearingViewport = new Container();
  private readonly clearing: ForestClearingView;
  private readonly uiLayer = new Container();
  private readonly pageLayer = new Container();
  private readonly pageBackground = new Graphics();
  private readonly toastLayer = new ToastLayer();
  private readonly profilePanel = new Container();
  private readonly sideMenu = new Container();
  private readonly studyOptions = new Container();
  private readonly shopOptions = new Container();
  private readonly socialOptions = new Container();
  private profilePortrait: Sprite | null = null;
  private studyModal: StudyModal | null = null;
  private shopScene: ShopScene | null = null;
  private dailyQuestScene: DailyQuestScene | null = null;
  private gachaScene: GachaScene | null = null;
  private featurePageModal: FeaturePageModal | null = null;
  private placementPanel: Container | null = null;
  private purchaseChoicePanel: Container | null = null;
  private furnitureEditPanel: Container | null = null;
  private selectedFurniture: FurnitureKind | null = null;
  private placementRotation: 0 | 1 = 0;
  private selectedShopItemId: ShopItemId | undefined;
  private movingInstanceId: string | null = null;
  private screenWidth = BASE_WIDTH;
  private screenHeight = BASE_HEIGHT;

  constructor(
    gameClient: GameClient,
    iconSources: HomeIconSources,
    catAnimations: CatAnimationLibrary,
    options: {
      desktopWidget?: boolean;
      onCatFocusRequest?: () => void;
      onCatInteractionRegionChange?: (region: { x: number; y: number; width: number; height: number }) => void;
    } = {},
  ) {
    super();
    this.gameClient = gameClient;
    this.iconSources = iconSources;
    this.catAnimations = catAnimations;
    this.desktopWidget = options.desktopWidget ?? false;
    this.state = gameClient.getSnapshot();
    this.clearing = new ForestClearingView({
      getFurniture: () => this.state.furniture,
      onPlace: (command) => {
        const result = this.gameClient.placeFurniture(command);
        if (result.ok) {
          queueMicrotask(() => this.stopPlacement());
        }
        return result;
      },
      onSelectFurniture: (item) => this.openFurnitureEditor(item),
      onMove: (instanceId, command) => {
        const result = this.gameClient.moveFurniture(instanceId, command);
        if (result.ok) {
          queueMicrotask(() => this.stopPlacement());
        }
        return result;
      },
      onToast: (message) => this.notify(message),
      getHomeCats: () => this.state.homeCats,
      getActiveCat: () => this.state.activeCat,
      catAnimations,
      desktopWidget: this.desktopWidget,
      onCatFocusRequest: options.onCatFocusRequest ?? (() => {}),
      onCatInteractionRegionChange: options.onCatInteractionRegionChange ?? (() => {}),
    });
    this.clearingViewport.addChild(this.clearing);
    this.pageLayer.visible = false;
    this.pageLayer.addChild(this.pageBackground);
    this.addChild(this.clearingViewport, this.uiLayer, this.pageLayer, this.toastLayer);

    this.buildProfile();
    this.buildSideMenu();
    this.uiLayer.addChild(this.profilePanel, this.sideMenu);
    if (this.desktopWidget) {
      this.uiLayer.visible = false;
      this.pageLayer.visible = false;
      this.toastLayer.visible = false;
    }
    this.gameClient.subscribe((snapshot) => this.syncState(snapshot));
  }

  update(deltaSeconds: number): void {
    if (!this.studyModal && !this.shopScene && !this.dailyQuestScene && !this.gachaScene && !this.featurePageModal) {
      this.clearing.update(deltaSeconds);
    }
  }

  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    const clearingScale = this.desktopWidget
      ? Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)
      : Math.max(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.clearingViewport.scale.set(clearingScale);
    this.clearingViewport.position.set(
      (width - BASE_WIDTH * clearingScale) / 2,
      (height - BASE_HEIGHT * clearingScale) / 2,
    );

    this.profilePanel.position.set(30, 24);
    this.sideMenu.position.set(width - 108, 24);
    this.pageBackground.clear().rect(0, 0, width, height).fill(0xf8e7ca);
    this.studyModal?.layout(width, height);
    this.shopScene?.layout(width, height);
    this.dailyQuestScene?.layout(width, height);
    this.gachaScene?.layout(width, height);
    this.featurePageModal?.layout(width, height);
    this.placementPanel?.position.set(width / 2, height - 92);
    this.purchaseChoicePanel?.position.set(width / 2, height / 2);
    this.furnitureEditPanel?.position.set(width / 2, height - 92);
    this.toastLayer.layout(width);
  }

  notify(message: string): void {
    this.toastLayer.show(message, this.screenWidth);
  }

  /** 홈 HUD에 설치 버튼을 표시하지 않는 현재 구성에서는 PWA 설치 핸들러를 보관하지 않는다. */
  setInstallHandler(_handler: (() => void) | null): void {}

  private buildProfile(): void {
    const card = new Graphics()
      .roundRect(4, 6, 170, 112, 25)
      .fill({ color: 0x68412b, alpha: 0.2 })
      .roundRect(0, 0, 170, 112, 25)
      .fill({ color: 0xfff3d8, alpha: 0.97 })
      .stroke({ color: 0x69432c, width: 4 });
    const activeAnimations = this.catAnimations[this.state.activeCat];
    const portrait = new Sprite(activeAnimations.idle.textures[0]);
    portrait.anchor.set(activeAnimations.idle.anchor.x, activeAnimations.idle.anchor.y);
    portrait.scale.set(0.27);
    portrait.position.set(54, 91);
    this.profilePortrait = portrait;
    const level = new Text({ text: message("home.level", { level: 10 }), style: textStyle(16, 0x3d2b22, "800") });
    level.anchor.set(0.5);
    level.position.set(126, 54);
    this.profilePanel.addChild(card, portrait, level);
    this.profilePanel.hitArea = new Rectangle(0, 0, 174, 118);
    this.profilePanel.eventMode = "static";
    this.profilePanel.cursor = "pointer";
    this.profilePanel.on("pointertap", () => this.openFeaturePage("settings"));
  }

  private buildSideMenu(): void {
    this.studyOptions.visible = false;
    this.shopOptions.visible = false;
    this.socialOptions.visible = false;

    const study = this.createIconButton(this.iconSources.studyGroup, () => this.toggleStudyOptions());
    const shop = this.createIconButton(this.iconSources.shopGroup, () => this.toggleShopOptions());
    const social = this.createIconButton(this.iconSources.socialGroup, () => this.toggleSocialOptions());
    shop.y = 88;
    social.y = 176;

    const learning = this.createIconButton(this.iconSources.learning, () => this.openStudy());
    const dailyQuest = this.createIconButton(this.iconSources.dailyQuest, () => this.openDailyQuest());
    learning.x = -176;
    dailyQuest.x = -88;
    this.studyOptions.addChild(learning, dailyQuest);

    const roomDecor = this.createIconButton(this.iconSources.roomDecor, () => this.openShop());
    const gacha = this.createIconButton(this.iconSources.gacha, () => this.openGacha());
    const ownedCollection = this.createIconButton(this.iconSources.ownedCollection, () =>
      this.openFeaturePage("owned"),
    );
    roomDecor.x = -264;
    gacha.x = -176;
    ownedCollection.x = -88;
    this.shopOptions.y = 88;
    this.shopOptions.addChild(roomDecor, gacha, ownedCollection);

    const addFriend = this.createIconButton(this.iconSources.addFriend, () => this.openFeaturePage("addFriend"));
    const visitGarden = this.createIconButton(this.iconSources.visitGarden, () => this.openFeaturePage("visitGarden"));
    addFriend.x = -176;
    visitGarden.x = -88;
    this.socialOptions.y = 176;
    this.socialOptions.addChild(addFriend, visitGarden);

    this.sideMenu.addChild(study, shop, social, this.studyOptions, this.shopOptions, this.socialOptions);
  }

  private createIconButton(iconSrc: string, onPress: () => void): HomeMenuButton {
    return new HomeMenuButton({ iconSrc, onPress });
  }

  private toggleStudyOptions(): void {
    this.shopOptions.visible = false;
    this.socialOptions.visible = false;
    this.studyOptions.visible = !this.studyOptions.visible;
  }

  private toggleShopOptions(): void {
    this.studyOptions.visible = false;
    this.socialOptions.visible = false;
    this.shopOptions.visible = !this.shopOptions.visible;
  }

  private toggleSocialOptions(): void {
    this.studyOptions.visible = false;
    this.shopOptions.visible = false;
    this.socialOptions.visible = !this.socialOptions.visible;
  }

  private hideMenuOptions(): void {
    this.studyOptions.visible = false;
    this.shopOptions.visible = false;
    this.socialOptions.visible = false;
  }

  private enterPage(): void {
    this.hideMenuOptions();
    this.closeFurnitureEditor();
    this.clearingViewport.visible = false;
    this.uiLayer.visible = false;
    this.pageLayer.visible = true;
  }

  private leavePage(): void {
    this.pageLayer.visible = false;
    this.clearingViewport.visible = true;
    this.uiLayer.visible = true;
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
    this.enterPage();
    this.studyModal = new StudyModal({
      quiz,
      onAnswer: (choiceId) => this.gameClient.answerQuiz(quiz.id, choiceId),
      onClose: () => this.closeStudy(),
    });
    this.pageLayer.addChild(this.studyModal);
    this.studyModal.layout(this.screenWidth, this.screenHeight);
  }

  private closeStudy(): void {
    if (!this.studyModal) {
      return;
    }
    this.pageLayer.removeChild(this.studyModal);
    this.studyModal.destroy({ children: true });
    this.studyModal = null;
    this.leavePage();
  }

  private openShop(): void {
    this.enterPage();
    if (this.shopScene) {
      return;
    }
    this.shopScene = new ShopScene({
      getState: () => this.state,
      onBack: () => this.closeShop(),
      onBuy: (itemId) => this.buyShopItem(itemId),
    });
    this.pageLayer.addChild(this.shopScene);
    this.shopScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeShop(): void {
    if (!this.shopScene) {
      return;
    }
    this.pageLayer.removeChild(this.shopScene);
    this.shopScene.destroy({ children: true });
    this.shopScene = null;
    this.closePurchaseChoice();
    this.leavePage();
  }

  private openDailyQuest(): void {
    this.enterPage();
    if (this.dailyQuestScene) {
      return;
    }
    this.dailyQuestScene = new DailyQuestScene({
      getState: () => this.state,
      onBack: () => this.closeDailyQuest(),
      onQuest: () => this.notify(message("daily.questComingSoon")),
      onClaimAll: () => this.notify(message("daily.claimComingSoon")),
    });
    this.pageLayer.addChild(this.dailyQuestScene);
    this.dailyQuestScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeDailyQuest(): void {
    if (!this.dailyQuestScene) {
      return;
    }
    this.pageLayer.removeChild(this.dailyQuestScene);
    this.dailyQuestScene.destroy({ children: true });
    this.dailyQuestScene = null;
    this.leavePage();
  }

  private openGacha(): void {
    this.enterPage();
    if (this.gachaScene) {
      return;
    }
    this.gachaScene = new GachaScene({
      getState: () => this.state,
      onBack: () => this.closeGacha(),
      onDraw: (count) => this.gameClient.drawGacha(count),
      onSelectCat: (variant) => {
        if (this.gameClient.selectCat(variant).ok) {
          this.closeGacha();
        }
      },
    });
    this.pageLayer.addChild(this.gachaScene);
    this.gachaScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeGacha(): void {
    if (!this.gachaScene) {
      return;
    }
    this.pageLayer.removeChild(this.gachaScene);
    this.gachaScene.destroy({ children: true });
    this.gachaScene = null;
    this.leavePage();
  }

  private openFeaturePage(kind: FeaturePageKind): void {
    this.closeFeaturePage(false);
    this.enterPage();
    this.featurePageModal = new FeaturePageModal({
      kind,
      getState: () => this.state,
      onPlaceOwned: (itemId, furnitureKind) => {
        this.closeFeaturePage();
        this.startPlacement(furnitureKind, 0, itemId);
      },
      onSelectCat: (variant) => this.gameClient.selectCat(variant).ok,
      onSetCatHome: (variant, visible) => this.gameClient.setCatHome(variant, visible).ok,
      catAnimations: this.catAnimations,
      onNavigate: (nextKind) => this.openFeaturePage(nextKind),
      onClose: () => this.closeFeaturePage(),
    });
    this.pageLayer.addChild(this.featurePageModal);
    this.featurePageModal.layout(this.screenWidth, this.screenHeight);
  }

  private closeFeaturePage(returnHome = true): void {
    if (!this.featurePageModal) {
      return;
    }
    this.pageLayer.removeChild(this.featurePageModal);
    this.featurePageModal.destroy({ children: true });
    this.featurePageModal = null;
    if (returnHome) {
      this.leavePage();
    }
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
    this.showPurchaseChoice(result.itemId, result.furnitureKind);
  }

  private showPurchaseChoice(itemId: ShopItemId, kind: FurnitureKind): void {
    this.closePurchaseChoice();
    const panel = new Container();
    const blocker = new Graphics()
      .rect(-this.screenWidth / 2, -this.screenHeight / 2, this.screenWidth, this.screenHeight)
      .fill({ color: 0x2b1b13, alpha: 0.35 });
    blocker.eventMode = "static";
    panel.addChild(
      blocker,
      new Graphics().roundRect(-280, -145, 560, 290, 28).fill(0xfff3dc).stroke({ color: 0x68442f, width: 5 }),
    );
    const title = new Text({ text: message("shop.purchaseChoiceTitle"), style: textStyle(25, 0x3d2b22, "800") });
    title.anchor.set(0.5);
    title.position.set(0, -92);
    const guide = new Text({ text: message("shop.purchaseChoiceGuide"), style: textStyle(17, 0x76533c, "600") });
    guide.anchor.set(0.5);
    guide.position.set(0, -45);
    const place = new CanvasButton({
      label: message("shop.placeNow"),
      width: 190,
      height: 60,
      color: 0x91aa55,
      onPress: () => {
        this.closePurchaseChoice();
        this.closeShop();
        this.startPlacement(kind, 0, itemId);
      },
    });
    place.position.set(-205, 25);
    const store = new CanvasButton({
      label: message("shop.storeNow"),
      width: 190,
      height: 60,
      color: 0xd9ad7d,
      onPress: () => {
        this.closePurchaseChoice();
        this.closeShop();
        this.notify(message("shop.storedAfterPurchase"));
      },
    });
    store.position.set(15, 25);
    panel.addChild(title, guide, place, store);
    panel.position.set(this.screenWidth / 2, this.screenHeight / 2);
    this.purchaseChoicePanel = panel;
    this.pageLayer.addChild(panel);
  }

  private closePurchaseChoice(): void {
    if (!this.purchaseChoicePanel) {
      return;
    }
    this.pageLayer.removeChild(this.purchaseChoicePanel);
    this.purchaseChoicePanel.destroy({ children: true });
    this.purchaseChoicePanel = null;
  }

  private startPlacement(
    kind: FurnitureKind,
    rotation: 0 | 1 = 0,
    shopItemId?: ShopItemId,
    movingInstanceId: string | null = null,
  ): void {
    this.stopPlacement();
    this.selectedFurniture = kind;
    this.placementRotation = rotation;
    this.selectedShopItemId = shopItemId;
    this.movingInstanceId = movingInstanceId;
    this.clearing.setPlacementMode(true, kind, rotation, movingInstanceId, shopItemId);
    const panel = new Container();
    panel.addChild(
      new Graphics().roundRect(-300, -42, 600, 84, 24).fill(0xfff3dc).stroke({ color: 0x68442f, width: 4 }),
    );
    const label = new Text({ text: message("shop.placementGuide"), style: textStyle(17, 0x4b3021, "700") });
    label.anchor.set(0.5);
    label.position.set(-65, 0);
    const rotate = new CanvasButton({
      label: message("shop.rotatePlacement"),
      width: 120,
      height: 48,
      color: 0x91aa82,
      onPress: () => this.rotatePlacement(),
    });
    rotate.position.set(75, -24);
    const cancel = new CanvasButton({
      label: message("shop.cancelPlacement"),
      width: 120,
      height: 48,
      color: 0xd7ad7e,
      onPress: () => this.stopPlacement(),
    });
    cancel.position.set(210, -24);
    panel.addChild(label, rotate, cancel);
    panel.position.set(this.screenWidth / 2, this.screenHeight - 92);
    this.placementPanel = panel;
    this.uiLayer.addChild(panel);
  }

  private stopPlacement(): void {
    this.selectedFurniture = null;
    this.selectedShopItemId = undefined;
    this.movingInstanceId = null;
    this.clearing.setPlacementMode(false, null, 0);
    if (!this.placementPanel) {
      return;
    }
    this.uiLayer.removeChild(this.placementPanel);
    this.placementPanel.destroy({ children: true });
    this.placementPanel = null;
  }

  private rotatePlacement(): void {
    if (!this.selectedFurniture) {
      return;
    }
    this.placementRotation = this.placementRotation === 0 ? 1 : 0;
    this.clearing.setPlacementMode(
      true,
      this.selectedFurniture,
      this.placementRotation,
      this.movingInstanceId,
      this.selectedShopItemId,
    );
    this.notify(message("furniture.rotated"));
  }

  private openFurnitureEditor(item: PlacedFurniture): void {
    this.closeFurnitureEditor();
    const panel = new Container();
    panel.addChild(
      new Graphics().roundRect(-330, -42, 660, 84, 24).fill(0xfff3dc).stroke({ color: 0x68442f, width: 4 }),
    );
    const cancel = new CanvasButton({
      label: "X",
      width: 54,
      height: 48,
      color: 0xc7aa91,
      onPress: () => this.closeFurnitureEditor(),
    });
    cancel.position.set(-315, -24);
    const label = new Text({
      text: message("furniture.editGuide", { item: message(`furniture.${item.kind}`) }),
      style: textStyle(17, 0x4b3021, "700"),
    });
    label.anchor.set(0.5);
    label.position.set(-165, 0);
    const move = new CanvasButton({
      label: message("furniture.move"),
      width: 105,
      height: 48,
      color: 0x91aa82,
      onPress: () => this.editPlacedFurniture(item, item.rotation),
    });
    move.position.set(-35, -24);
    const store = new CanvasButton({
      label: message("furniture.store"),
      width: 105,
      height: 48,
      color: 0xd99278,
      onPress: () => this.storePlacedFurniture(item),
    });
    store.position.set(140, -24);
    panel.addChild(cancel, label, move, store);
    panel.position.set(this.screenWidth / 2, this.screenHeight - 92);
    this.furnitureEditPanel = panel;
    this.uiLayer.addChild(panel);
  }

  private editPlacedFurniture(item: PlacedFurniture, rotation: 0 | 1): void {
    this.closeFurnitureEditor();
    this.startPlacement(item.kind, rotation, item.shopItemId, item.id);
  }

  private storePlacedFurniture(item: PlacedFurniture): void {
    if (this.gameClient.removeFurniture(item.id)) {
      this.notify(message("furniture.stored", { item: message(`furniture.${item.kind}`) }));
    }
    this.closeFurnitureEditor();
  }

  private closeFurnitureEditor(): void {
    if (!this.furnitureEditPanel) {
      return;
    }
    this.uiLayer.removeChild(this.furnitureEditPanel);
    this.furnitureEditPanel.destroy({ children: true });
    this.furnitureEditPanel = null;
  }

  private syncState(snapshot: GameState): void {
    const activeCatChanged = this.state.activeCat !== snapshot.activeCat;
    this.state = snapshot;
    if (activeCatChanged) {
      this.applyActiveCat(snapshot.activeCat);
    }
    this.clearing.syncCats();
    this.clearing.syncFurniture();
    if (this.selectedFurniture && snapshot.inventory[this.selectedFurniture] <= 0) {
      this.stopPlacement();
    }
  }

  private applyActiveCat(variant: CatVariant): void {
    const animations = this.catAnimations[variant];
    if (this.profilePortrait) {
      this.profilePortrait.texture = animations.idle.textures[0];
      this.profilePortrait.anchor.set(animations.idle.anchor.x, animations.idle.anchor.y);
    }
  }
}
