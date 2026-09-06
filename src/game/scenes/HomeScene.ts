import { Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { GameClient } from "../../core/GameClient";
import type { CatVariant } from "../../domain/cats";
import type { FurnitureKind, GameState, PlacedFurniture } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import { CanvasButton } from "../components/CanvasButton";
import { HomeMenuButton } from "../components/HomeMenuButton";
import { PLACEMENT_TRAY_HEIGHT, PLACEMENT_TRAY_WIDTH, PlacementTray } from "../components/PlacementTray";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import { ToastLayer } from "../components/ToastLayer";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import type { CatAnimationLibrary } from "../entities/CatAnimations";
import type { BackgroundArtCollection, ForestArt, FurnitureArtCollection } from "../forest/ForestArt";
import { ForestClearingView } from "../forest/ForestClearingView";
import type { CodeEditorOverlayFactory } from "../ports/CodeEditorOverlay";
import { getOwnedFurnitureEntries } from "../presentation/ownedFurniture";
import { AttendanceModal } from "./AttendanceModal";
import { DailyQuestScene } from "./DailyQuestScene";
import { type FeaturePageKind, FeaturePageModal } from "./FeaturePageModal";
import { GachaScene } from "./GachaScene";
import { ShopScene } from "./ShopScene";
import { StudyModal } from "./StudyModal";

export type HomeIconSources = {
  profile: string;
  study: string;
  dailyQuest: string;
  gacha: string;
  home: string;
  settings: string;
  back: string;
  coin: string;
  shopShowcase: string;
  gachaBackdrop: string;
  gachaMachine: string;
};

export class HomeScene extends Container {
  private state: GameState;
  private readonly gameClient: GameClient;
  private readonly iconSources: HomeIconSources;
  private readonly catAnimations: CatAnimationLibrary;
  private readonly furnitureArt: FurnitureArtCollection;
  private readonly backgroundArt: BackgroundArtCollection;
  private readonly consumableArt: ForestArt["consumables"];
  private readonly codeEditorFactory: CodeEditorOverlayFactory;
  private readonly clearingViewport = new Container();
  private readonly clearing: ForestClearingView;
  private readonly uiLayer = new Container();
  private readonly pageLayer = new Container();
  private readonly pageBackground = new Graphics();
  private readonly toastLayer = new ToastLayer();
  private readonly profilePanel = new Container();
  private readonly sideMenu = new Container();
  private readonly settingsMenu = new Container();
  private readonly shopOptions = new Container();
  private profilePortrait: Sprite | null = null;
  private attendanceModal: AttendanceModal | null = null;
  private studyModal: StudyModal | null = null;
  private shopScene: ShopScene | null = null;
  private dailyQuestScene: DailyQuestScene | null = null;
  private gachaScene: GachaScene | null = null;
  private featurePageModal: FeaturePageModal | null = null;
  private placementPanel: Container | null = null;
  private roomEditPanel: PlacementTray | null = null;
  private purchaseChoicePanel: Container | null = null;
  private furnitureEditPanel: Container | null = null;
  private roomEditMode = false;
  private roomEditPage = 0;
  private selectedFurniture: FurnitureKind | null = null;
  private placementRotation: 0 | 1 = 0;
  private selectedShopItemId: ShopItemId | undefined;
  private movingInstanceId: string | null = null;
  private screenWidth = BASE_WIDTH;
  private screenHeight = BASE_HEIGHT;
  private readonly onLogout: (() => Promise<boolean>) | null;

  constructor(
    gameClient: GameClient,
    iconSources: HomeIconSources,
    catAnimations: CatAnimationLibrary,
    forestArt: ForestArt,
    codeEditorFactory: CodeEditorOverlayFactory,
    onLogout: (() => Promise<boolean>) | null = null,
  ) {
    super();
    this.gameClient = gameClient;
    this.iconSources = iconSources;
    this.catAnimations = catAnimations;
    this.furnitureArt = forestArt.furniture;
    this.backgroundArt = forestArt.backgrounds;
    this.consumableArt = forestArt.consumables;
    this.codeEditorFactory = codeEditorFactory;
    this.onLogout = onLogout;
    this.state = gameClient.getSnapshot();
    this.clearing = new ForestClearingView({
      getFurniture: () => this.state.furniture,
      onPlace: async (command) => {
        const result = await this.gameClient.placeFurniture(command);
        if (result.ok) {
          queueMicrotask(() => this.stopPlacement());
        }
        return result;
      },
      onSelectFurniture: (item) => this.openFurnitureEditor(item),
      onMove: async (instanceId, command) => {
        const result = await this.gameClient.moveFurniture(instanceId, command);
        if (result.ok) {
          queueMicrotask(() => this.stopPlacement());
        }
        return result;
      },
      onToast: (message) => this.notify(message),
      getHomeCats: () => this.state.homeCats,
      getActiveCat: () => this.state.activeCat,
      getActiveWallpaper: () => this.state.activeWallpaper,
      getActiveFloor: () => this.state.activeFloor,
      catAnimations,
      art: forestArt,
    });
    this.clearingViewport.addChild(this.clearing);
    this.pageLayer.visible = false;
    this.pageLayer.addChild(this.pageBackground);
    this.addChild(this.clearingViewport, this.uiLayer, this.pageLayer, this.toastLayer);

    this.buildProfile();
    this.buildSideMenu();
    this.uiLayer.addChild(this.profilePanel, this.sideMenu, this.settingsMenu);
    this.gameClient.subscribe((snapshot) => this.syncState(snapshot));
    this.openAttendance();
  }

  update(deltaSeconds: number): void {
    if (
      !this.attendanceModal &&
      !this.studyModal &&
      !this.shopScene &&
      !this.dailyQuestScene &&
      !this.gachaScene &&
      !this.featurePageModal
    ) {
      this.clearing.update(deltaSeconds);
    }
  }

  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    const clearingScale = Math.max(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.clearingViewport.scale.set(clearingScale);
    this.clearingViewport.position.set(
      (width - BASE_WIDTH * clearingScale) / 2,
      (height - BASE_HEIGHT * clearingScale) / 2,
    );

    this.profilePanel.position.set(24, 20);
    this.sideMenu.position.set(Math.max(24, width - 464), height - 128);
    this.settingsMenu.position.set(24, height - 132);
    this.pageBackground.clear().rect(0, 0, width, height).fill(0xf8e7ca);
    this.studyModal?.layout(width, height);
    this.shopScene?.layout(width, height);
    this.dailyQuestScene?.layout(width, height);
    this.gachaScene?.layout(width, height);
    this.featurePageModal?.layout(width, height);
    this.attendanceModal?.layout(width, height);
    this.placementPanel?.position.set(width / 2, height - 92);
    this.layoutRoomEditPanel();
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
    const profileSize = 156;
    const visualScale = 0.75;
    const frame = Sprite.from(this.iconSources.profile);
    applySmoothTextureSampling(frame);
    frame.width = profileSize * visualScale;
    frame.height = profileSize * visualScale;
    frame.position.set((profileSize - frame.width) / 2, (profileSize - frame.height) / 2);
    const activeAnimations = this.catAnimations[this.state.activeCat];
    const portrait = new Sprite(activeAnimations.idle.textures[0]);
    this.profilePortrait = portrait;
    this.fitProfilePortrait();
    const portraitMask = new Graphics().roundRect(40, 36, 76, 68, 16).fill(0xffffff);
    portrait.mask = portraitMask;
    const level = new Text({ text: message("home.level", { level: 10 }), style: textStyle(12, 0x3d2b22, "800") });
    level.anchor.set(0.5);
    level.position.set(78, 119);
    this.profilePanel.addChild(frame, portrait, portraitMask, level);
    this.profilePanel.hitArea = new Rectangle(0, 0, profileSize, profileSize);
    this.profilePanel.eventMode = "static";
    this.profilePanel.cursor = "pointer";
    this.profilePanel.on("pointertap", () => this.openFeaturePage("profile"));
  }

  private buildSideMenu(): void {
    this.shopOptions.visible = false;

    const study = this.createIconButton(this.iconSources.study, message("home.study"), true, () => this.openStudy());
    const dailyQuest = this.createIconButton(this.iconSources.dailyQuest, message("home.dailyQuest"), true, () =>
      this.openDailyQuest(),
    );
    const gacha = this.createIconButton(this.iconSources.gacha, message("home.gacha"), true, () => this.openGacha());
    const home = this.createIconButton(this.iconSources.home, message("home.shopOwned"), true, () =>
      this.toggleShopOptions(),
    );
    const settings = this.createIconButton(this.iconSources.settings, message("home.settings"), true, () =>
      this.openFeaturePage("settings"),
    );
    const placement = new CanvasButton({
      label: message("placement.shortcut"),
      width: 148,
      height: 50,
      color: 0xe9a14b,
      onPress: () => this.enterRoomEditMode(),
    });
    placement.position.set(112, 40);
    dailyQuest.x = 108;
    gacha.x = 216;
    home.x = 324;
    const shop = new CanvasButton({
      label: message("shop.title"),
      width: 126,
      height: 48,
      color: 0xffc875,
      onPress: () => this.openShop(),
    });
    const owned = new CanvasButton({
      label: message("home.owned"),
      width: 126,
      height: 48,
      color: 0xffe2b5,
      onPress: () => this.openFeaturePage("owned"),
    });
    owned.y = 56;
    this.shopOptions.position.set(319, -112);
    this.shopOptions.addChild(shop, owned);

    this.sideMenu.addChild(study, dailyQuest, gacha, home, this.shopOptions);
    this.settingsMenu.addChild(settings, placement);
  }

  private createIconButton(iconSrc: string, label: string, medallion: boolean, onPress: () => void): HomeMenuButton {
    return new HomeMenuButton({ iconSrc, label, medallion, visualScale: 0.75, hitAreaHeight: 108, onPress });
  }

  private toggleShopOptions(): void {
    this.shopOptions.visible = !this.shopOptions.visible;
  }

  private hideMenuOptions(): void {
    this.shopOptions.visible = false;
  }

  private enterPage(): void {
    this.exitRoomEditMode();
    if (this.selectedFurniture) {
      this.stopPlacement();
    }
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
    this.clearOpenPages();
    this.enterPage();
    this.studyModal = new StudyModal({
      tasks: this.gameClient.getStudyTasks(),
      getQuiz: (quizId) => this.gameClient.getQuiz(quizId),
      getCodeChallenge: (challengeId) => this.gameClient.getCodeChallenge(challengeId),
      onAnswer: (quizId, choiceId) => this.gameClient.answerQuiz(quizId, choiceId),
      onSubmitCode: (challengeId, body, hintsUsed) => this.gameClient.submitCodeChallenge(challengeId, body, hintsUsed),
      onClose: () => this.closeStudy(),
      backIcon: this.iconSources.back,
      coinIcon: this.iconSources.coin,
      codeEditorFactory: this.codeEditorFactory,
    });
    this.pageLayer.addChild(this.studyModal);
    this.studyModal.layout(this.screenWidth, this.screenHeight);
  }

  private closeStudy(): void {
    if (!this.studyModal) {
      return;
    }
    this.clearOpenPages();
    this.leavePage();
  }

  private openAttendance(showClaimedStatus = false): void {
    if (this.attendanceModal || (!showClaimedStatus && !this.gameClient.getAttendance().canClaim)) {
      return;
    }
    this.attendanceModal = new AttendanceModal({
      getAttendance: () => this.gameClient.getAttendance(),
      onClaim: () => this.gameClient.claimAttendance(),
      onClose: () => this.closeAttendance(),
      coinIcon: this.iconSources.coin,
    });
    this.addChild(this.attendanceModal);
    this.attendanceModal.layout(this.screenWidth, this.screenHeight);
  }

  private closeAttendance(): void {
    if (!this.attendanceModal) {
      return;
    }
    this.removeChild(this.attendanceModal);
    this.attendanceModal.destroy({ children: true });
    this.attendanceModal = null;
  }

  private openShop(): void {
    if (this.shopScene) {
      return;
    }
    this.clearOpenPages();
    this.enterPage();
    this.shopScene = new ShopScene({
      getState: () => this.state,
      onBack: () => this.closeShop(),
      onBuy: (itemId) => this.buyShopItem(itemId),
      heroArt: this.iconSources.shopShowcase,
      backIcon: this.iconSources.back,
      coinIcon: this.iconSources.coin,
      furnitureArt: this.furnitureArt,
      backgroundArt: this.backgroundArt,
      consumableArt: this.consumableArt,
    });
    this.pageLayer.addChild(this.shopScene);
    this.shopScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeShop(): void {
    if (!this.shopScene) {
      return;
    }
    this.clearOpenPages();
    this.leavePage();
  }

  private openDailyQuest(): void {
    if (this.dailyQuestScene) {
      return;
    }
    this.clearOpenPages();
    this.enterPage();
    this.dailyQuestScene = new DailyQuestScene({
      getState: () => this.state,
      getQuests: () => this.gameClient.getDailyQuests(),
      onBack: () => this.closeDailyQuest(),
      onOpenStudy: () => this.openStudy(),
      onClaim: (questId) => this.gameClient.claimDailyQuest(questId),
      onClaimBonus: () => this.gameClient.claimDailyBonus(),
      backIcon: this.iconSources.back,
      coinIcon: this.iconSources.coin,
    });
    this.pageLayer.addChild(this.dailyQuestScene);
    this.dailyQuestScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeDailyQuest(): void {
    if (!this.dailyQuestScene) {
      return;
    }
    this.clearOpenPages();
    this.leavePage();
  }

  private openGacha(): void {
    if (this.gachaScene) {
      return;
    }
    this.clearOpenPages();
    this.enterPage();
    this.gachaScene = new GachaScene({
      getState: () => this.state,
      onBack: () => this.closeGacha(),
      onDraw: (count) => this.gameClient.drawGacha(count),
      onSelectCat: async (variant) => {
        if ((await this.gameClient.selectCat(variant)).ok) {
          this.closeGacha();
        }
      },
      backdropArt: this.iconSources.gachaBackdrop,
      machineArt: this.iconSources.gachaMachine,
      backIcon: this.iconSources.back,
      coinIcon: this.iconSources.coin,
      catAnimations: this.catAnimations,
      furnitureArt: this.furnitureArt,
    });
    this.pageLayer.addChild(this.gachaScene);
    this.gachaScene.layout(this.screenWidth, this.screenHeight);
  }

  private closeGacha(): void {
    if (!this.gachaScene) {
      return;
    }
    this.clearOpenPages();
    this.leavePage();
  }

  private openFeaturePage(kind: FeaturePageKind): void {
    this.clearOpenPages();
    this.enterPage();
    this.featurePageModal = new FeaturePageModal({
      kind,
      getState: () => this.state,
      onPlaceOwned: (itemId, furnitureKind) => {
        this.closeFeaturePage();
        this.enterRoomEditMode();
        this.startPlacement(furnitureKind, 0, itemId);
      },
      onSelectCat: async (variant) => (await this.gameClient.selectCat(variant)).ok,
      onSetCatHome: async (variant, visible) => (await this.gameClient.setCatHome(variant, visible)).ok,
      onApplyTheme: async (itemId) => {
        try {
          await this.backgroundArt.load([itemId]);
        } catch (error) {
          console.warn("Selected background could not be loaded", error);
          this.notify(message("owned.backgroundLoadFailed"));
          return false;
        }
        return (await this.gameClient.applyRoomTheme(itemId)).ok;
      },
      onUseConsumable: (itemId) => this.useConsumable(itemId),
      onEnterRoomEdit: () => {
        this.closeFeaturePage();
        this.enterRoomEditMode();
      },
      onUpdateSettings: (patch) => this.gameClient.updateSettings(patch),
      onResetLearning: () => this.gameClient.resetLearningProgress(),
      onLogout: this.onLogout,
      onOpenAttendance: () => this.openAttendance(true),
      catAnimations: this.catAnimations,
      furnitureArt: this.furnitureArt,
      consumableArt: this.consumableArt,
      backgroundArt: this.backgroundArt,
      backIcon: this.iconSources.back,
      coinIcon: this.iconSources.coin,
      onNavigate: (nextKind) => this.openFeaturePage(nextKind),
      onClose: () => this.closeFeaturePage(),
    });
    this.pageLayer.addChild(this.featurePageModal);
    this.featurePageModal.layout(this.screenWidth, this.screenHeight);
  }

  private closeFeaturePage(): void {
    if (!this.featurePageModal) {
      return;
    }
    this.clearOpenPages();
    this.leavePage();
  }

  private clearOpenPages(): void {
    const pages = [this.studyModal, this.shopScene, this.dailyQuestScene, this.gachaScene, this.featurePageModal];
    for (const page of pages) {
      if (!page) {
        continue;
      }
      if (page.parent === this.pageLayer) {
        this.pageLayer.removeChild(page);
      }
      page.destroy({ children: true });
    }
    this.studyModal = null;
    this.shopScene = null;
    this.dailyQuestScene = null;
    this.gachaScene = null;
    this.featurePageModal = null;
    this.closePurchaseChoice();
  }

  private async buyShopItem(itemId: ShopItemId | null): Promise<void> {
    if (!itemId) {
      this.notify(message("shop.itemNotPlaceable"));
      return;
    }
    const result = await this.gameClient.buyShopItem(itemId);
    if (!result.ok) {
      let messageId: "shop.insufficientCoins" | "shop.alreadyOwned" | "shop.purchaseComingSoon" =
        "shop.purchaseComingSoon";
      if (result.reason === "insufficient-coins") {
        messageId = "shop.insufficientCoins";
      } else if (result.reason === "already-owned") {
        messageId = "shop.alreadyOwned";
      }
      this.notify(message(messageId));
      return;
    }
    this.shopScene?.refresh();
    if (result.itemType === "consumable") {
      this.notify(message("shop.consumableStored"));
      return;
    }
    if (result.itemType !== "furniture") {
      this.notify(message("shop.themeStored"));
      return;
    }
    this.showPurchaseChoice(result.itemId, result.furnitureKind);
  }

  private async useConsumable(itemId: ShopItemId): Promise<boolean> {
    const result = await this.gameClient.useConsumable(itemId, this.state.activeCat);
    if (!result.ok) {
      this.notify(message(result.reason === "not-owned" ? "consumable.empty" : "shop.purchaseComingSoon"));
      return false;
    }
    this.closeFeaturePage();
    this.clearing.playConsumableEffect(result.effect);
    this.notify(message(`consumable.used.${result.effect}`));
    return true;
  }

  private showPurchaseChoice(itemId: ShopItemId, kind: FurnitureKind): void {
    this.closePurchaseChoice();
    const panel = new Container();
    const blocker = new Graphics()
      .rect(-this.screenWidth / 2, -this.screenHeight / 2, this.screenWidth, this.screenHeight)
      .fill({ color: 0x2f211b, alpha: 0.58 });
    blocker.eventMode = "static";
    panel.addChild(
      blocker,
      new Graphics().roundRect(-470, -270, 940, 540, 32).fill(0xfff3dc).stroke({ color: 0x68442f, width: 5 }),
    );
    const title = new Text({ text: message("shop.purchaseChoiceTitle"), style: textStyle(34, 0x3d2b22, "800") });
    title.anchor.set(0.5);
    title.position.set(0, -155);
    const guide = new Text({ text: message("shop.purchaseChoiceGuide"), style: textStyle(20, 0x76533c, "600") });
    guide.anchor.set(0.5);
    guide.position.set(0, -82);
    const place = new CanvasButton({
      label: message("shop.placeNow"),
      width: 190,
      height: 68,
      fontSize: 20,
      color: 0x91aa55,
      onPress: () => {
        this.closePurchaseChoice();
        this.closeShop();
        this.enterRoomEditMode();
        this.startPlacement(kind, 0, itemId);
      },
    });
    place.position.set(-220, 45);
    const store = new CanvasButton({
      label: message("shop.storeNow"),
      width: 190,
      height: 68,
      fontSize: 20,
      color: 0xd9ad7d,
      onPress: () => {
        this.closePurchaseChoice();
        this.shopScene?.refresh();
        this.notify(message("shop.storedAfterPurchase"));
      },
    });
    store.position.set(30, 45);
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
    this.clearPlacementPanel();
    this.closeFurnitureEditor(false);
    this.selectedFurniture = kind;
    this.placementRotation = rotation;
    this.selectedShopItemId = shopItemId;
    this.movingInstanceId = movingInstanceId;
    this.clearing.setPlacementMode(true, kind, rotation, movingInstanceId, shopItemId);
    if (this.roomEditMode) {
      this.refreshRoomEditPanel();
      return;
    }
    this.hideRoomEditPanel();
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
    this.clearPlacementPanel();
    if (this.roomEditMode) {
      this.clearing.setPlacementMode(true, null, 0);
      this.refreshRoomEditPanel();
    } else {
      this.clearing.setPlacementMode(false, null, 0);
    }
  }

  private clearPlacementPanel(): void {
    if (!this.placementPanel) {
      return;
    }
    this.uiLayer.removeChild(this.placementPanel);
    this.placementPanel.destroy({ children: true });
    this.placementPanel = null;
  }

  private enterRoomEditMode(): void {
    if (!this.roomEditMode) {
      this.roomEditPage = 0;
    }
    this.roomEditMode = true;
    this.hideMenuOptions();
    this.sideMenu.visible = false;
    this.settingsMenu.visible = false;
    this.closeFurnitureEditor(false);
    this.stopPlacement();
    this.notify(message("owned.editGuide"));
  }

  private exitRoomEditMode(): void {
    if (!this.roomEditMode && !this.roomEditPanel) {
      return;
    }
    this.roomEditMode = false;
    this.closeFurnitureEditor(false);
    this.hideRoomEditPanel();
    this.stopPlacement();
    this.sideMenu.visible = true;
    this.settingsMenu.visible = true;
  }

  private refreshRoomEditPanel(): void {
    if (!this.roomEditMode) {
      return;
    }
    this.hideRoomEditPanel();
    const panel = new PlacementTray({
      entries: getOwnedFurnitureEntries(this.state),
      page: this.roomEditPage,
      selectedKind: this.selectedFurniture,
      selectedItemId: this.selectedShopItemId,
      moving: this.movingInstanceId !== null,
      furnitureArt: this.furnitureArt,
      onSelect: (entry) => this.startPlacement(entry.kind, 0, entry.itemId),
      onPageChange: (page) => {
        this.roomEditPage = page;
        this.refreshRoomEditPanel();
      },
      onRotate: () => this.rotatePlacement(),
      onCancelPlacement: () => this.stopPlacement(),
      onFinish: () => this.exitRoomEditMode(),
    });
    this.roomEditPanel = panel;
    this.uiLayer.addChild(panel);
    this.layoutRoomEditPanel();
  }

  private hideRoomEditPanel(): void {
    if (!this.roomEditPanel) {
      return;
    }
    this.uiLayer.removeChild(this.roomEditPanel);
    this.roomEditPanel.destroy({ children: true });
    this.roomEditPanel = null;
  }

  private layoutRoomEditPanel(): void {
    if (!this.roomEditPanel) {
      return;
    }
    const scale = Math.min(1, (this.screenWidth - 24) / PLACEMENT_TRAY_WIDTH);
    this.roomEditPanel.scale.set(scale);
    this.roomEditPanel.position.set(
      (this.screenWidth - PLACEMENT_TRAY_WIDTH * scale) / 2,
      this.screenHeight - PLACEMENT_TRAY_HEIGHT * scale - 14,
    );
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
    if (this.roomEditMode) {
      this.refreshRoomEditPanel();
    }
    this.notify(message("furniture.rotated"));
  }

  private openFurnitureEditor(item: PlacedFurniture): void {
    if (!this.roomEditMode || this.selectedFurniture) {
      return;
    }
    this.closeFurnitureEditor(false);
    this.hideRoomEditPanel();
    const panel = new Container();
    panel.addChild(
      new Graphics().roundRect(-390, -42, 780, 84, 24).fill(0xfff3dc).stroke({ color: 0x68442f, width: 4 }),
    );
    const cancel = new CanvasButton({
      label: "X",
      width: 54,
      height: 48,
      color: 0xc7aa91,
      onPress: () => this.closeFurnitureEditor(),
    });
    cancel.position.set(-375, -24);
    const label = new Text({
      text: message("furniture.editGuide", { item: message(`furniture.${item.kind}`) }),
      style: textStyle(17, 0x4b3021, "700"),
    });
    label.anchor.set(0.5);
    label.position.set(-230, 0);
    const move = new CanvasButton({
      label: message("furniture.move"),
      width: 105,
      height: 48,
      color: 0x91aa82,
      onPress: () => this.editPlacedFurniture(item, item.rotation),
    });
    move.position.set(40, -24);
    const store = new CanvasButton({
      label: message("furniture.store"),
      width: 105,
      height: 48,
      color: 0xd99278,
      onPress: () => this.storePlacedFurniture(item),
    });
    store.position.set(160, -24);
    panel.addChild(cancel, label, move, store);
    panel.position.set(this.screenWidth / 2, this.screenHeight - 92);
    this.furnitureEditPanel = panel;
    this.uiLayer.addChild(panel);
  }

  private editPlacedFurniture(item: PlacedFurniture, rotation: 0 | 1): void {
    this.closeFurnitureEditor(false);
    this.startPlacement(item.kind, rotation, item.shopItemId, item.id);
  }

  private async storePlacedFurniture(item: PlacedFurniture): Promise<void> {
    if (await this.gameClient.removeFurniture(item.id)) {
      this.notify(message("furniture.stored", { item: message(`furniture.${item.kind}`) }));
    }
    this.closeFurnitureEditor();
  }

  private closeFurnitureEditor(restoreRoomEditPanel = true): void {
    if (!this.furnitureEditPanel) {
      if (restoreRoomEditPanel && this.roomEditMode && !this.selectedFurniture) {
        this.refreshRoomEditPanel();
      }
      return;
    }
    this.uiLayer.removeChild(this.furnitureEditPanel);
    this.furnitureEditPanel.destroy({ children: true });
    this.furnitureEditPanel = null;
    if (restoreRoomEditPanel && this.roomEditMode && !this.selectedFurniture) {
      this.refreshRoomEditPanel();
    }
  }

  private syncState(snapshot: GameState): void {
    const activeCatChanged = this.state.activeCat !== snapshot.activeCat;
    this.state = snapshot;
    if (activeCatChanged) {
      this.applyActiveCat(snapshot.activeCat);
    }
    this.clearing.syncTheme();
    this.clearing.syncCats();
    this.clearing.syncFurniture();
    if (this.roomEditPanel) {
      this.refreshRoomEditPanel();
    }
    if (this.selectedFurniture && snapshot.inventory[this.selectedFurniture] <= 0) {
      this.stopPlacement();
    }
  }

  private applyActiveCat(variant: CatVariant): void {
    const animations = this.catAnimations[variant];
    if (this.profilePortrait) {
      this.profilePortrait.texture = animations.idle.textures[0];
      this.fitProfilePortrait();
    }
  }

  private fitProfilePortrait(): void {
    if (!this.profilePortrait) {
      return;
    }

    const portraitScale = 118 / this.profilePortrait.texture.height;
    this.profilePortrait.anchor.set(0.5, 0);
    this.profilePortrait.scale.set(portraitScale);
    this.profilePortrait.position.set(87, 18);
  }
}
