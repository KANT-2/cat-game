import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { GameClient } from "../../core/GameClient";
import type { FurnitureKind, GameState } from "../../domain/room";
import { DAILY_QUIZ_ID } from "../../domain/study";
import { CanvasButton } from "../components/CanvasButton";
import { ToastLayer } from "../components/ToastLayer";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import { ForestClearingView } from "../forest/ForestClearingView";
import { furniturePresentation } from "../presentation/furniturePresentation";
import { StudyModal } from "./StudyModal";

export class HomeScene extends Container {
  private state: GameState;
  private readonly gameClient: GameClient;
  private readonly clearingViewport = new Container();
  private readonly clearing: ForestClearingView;
  private readonly uiLayer = new Container();
  private readonly modalLayer = new Container();
  private readonly toastLayer = new ToastLayer();
  private readonly profilePanel = new Container();
  private readonly currencyPanel = new Container();
  private readonly sideMenu = new Container();
  private readonly editButton: CanvasButton;
  private readonly coinText: Text;
  private readonly modeText: Text;
  private inventoryPanel: Container | null = null;
  private installButton: CanvasButton | null = null;
  private studyModal: StudyModal | null = null;
  private editMode = false;
  private selectedFurniture: FurnitureKind | null = null;
  private placementRotation: 0 | 1 = 0;
  private screenWidth = BASE_WIDTH;
  private screenHeight = BASE_HEIGHT;

  constructor(gameClient: GameClient) {
    super();
    this.gameClient = gameClient;
    this.state = gameClient.getSnapshot();
    this.clearing = new ForestClearingView({
      getFurniture: () => this.state.furniture,
      onPlace: (command) => this.gameClient.placeFurniture(command),
      onRemove: (instanceId) => this.gameClient.removeFurniture(instanceId),
      onToast: (message) => this.notify(message),
    });
    this.clearingViewport.addChild(this.clearing);
    this.addChild(this.clearingViewport, this.uiLayer, this.modalLayer, this.toastLayer);

    this.buildProfile();
    this.coinText = this.buildCurrency();
    this.buildSideMenu();
    this.editButton = new CanvasButton({
      label: message("home.decorate"),
      width: 154,
      height: 56,
      color: 0x8eae7c,
      onPress: () => this.toggleEditMode(),
    });
    this.modeText = new Text({ text: "", style: textStyle(17, 0x6b4932, "700") });
    this.modeText.anchor.set(0.5);
    this.uiLayer.addChild(this.profilePanel, this.currencyPanel, this.sideMenu, this.editButton, this.modeText);
    this.gameClient.subscribe((snapshot) => this.syncState(snapshot));
  }

  update(deltaSeconds: number): void {
    if (!this.studyModal) {
      this.clearing.update(deltaSeconds);
    }
  }

  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    const clearingScale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.clearingViewport.scale.set(clearingScale);
    this.clearingViewport.position.set(
      (width - BASE_WIDTH * clearingScale) / 2,
      (height - BASE_HEIGHT * clearingScale) / 2,
    );

    this.profilePanel.position.set(28, 24);
    this.currencyPanel.position.set(width - 420, 24);
    this.sideMenu.position.set(width - 206, 116);
    this.editButton.position.set(28, height - 82);
    this.modeText.position.set(width / 2, height - 28);
    this.inventoryPanel?.position.set(width / 2, height - 92);
    this.installButton?.position.set(0, 210);
    this.studyModal?.layout(width, height);
    this.toastLayer.layout(width);
  }

  notify(message: string): void {
    this.toastLayer.show(message, this.screenWidth);
  }

  setInstallHandler(handler: (() => void) | null): void {
    if (this.installButton) {
      this.sideMenu.removeChild(this.installButton);
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
    this.installButton.position.set(0, 210);
    this.sideMenu.addChild(this.installButton);
  }

  private buildProfile(): void {
    this.profilePanel.addChild(
      new Graphics()
        .roundRect(0, 0, 154, 116, 25)
        .fill({ color: 0xfff4db, alpha: 0.96 })
        .stroke({ color: 0x69432c, width: 5 }),
      new Graphics()
        .circle(49, 49, 29)
        .fill(0xe58c44)
        .stroke({ color: 0x503528, width: 3 })
        .poly([28, 35, 31, 13, 44, 28])
        .poly([54, 27, 69, 12, 68, 39])
        .fill(0xe58c44)
        .stroke({ color: 0x503528, width: 3 })
        .circle(41, 48, 2.4)
        .circle(56, 48, 2.4)
        .fill(0x3a2921),
    );
    const level = new Text({ text: message("home.level", { level: 10 }), style: textStyle(17, 0x3d2b22, "700") });
    level.anchor.set(0.5);
    level.position.set(111, 51);
    this.profilePanel.addChild(level);
  }

  private buildCurrency(): Text {
    this.currencyPanel.addChild(
      new Graphics()
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

    this.currencyPanel.addChild(
      new Graphics().poly([226, 10, 246, 29, 226, 48, 206, 29]).fill(0x74b6ac).stroke({ color: 0x386d65, width: 3 }),
    );
    const gems = new Text({ text: String(this.state.gems), style: textStyle(20, 0x3d2b22, "700") });
    gems.anchor.set(1, 0.5);
    gems.position.set(360, 29);
    this.currencyPanel.addChild(gems);
    return coins;
  }

  private buildSideMenu(): void {
    const study = new CanvasButton({
      label: message("home.study"),
      width: 178,
      height: 58,
      color: 0xe8a95f,
      onPress: () => this.openStudy(),
    });
    const quest = new CanvasButton({
      label: message("home.dailyQuest"),
      width: 178,
      height: 58,
      color: 0xd39b69,
      onPress: () => this.notify(message("home.questComingSoon")),
    });
    const draw = new CanvasButton({
      label: message("home.catDraw"),
      width: 178,
      height: 58,
      color: 0xbe8e76,
      onPress: () => this.notify(message("home.catDrawComingSoon")),
    });
    quest.y = 70;
    draw.y = 140;
    this.sideMenu.addChild(study, quest, draw);
  }

  private toggleEditMode(): void {
    this.editMode = !this.editMode;
    this.selectedFurniture = this.editMode ? "plant" : null;
    this.modeText.text = this.editMode ? message("home.editMode") : "";
    if (this.editMode) {
      this.showInventory();
    } else {
      this.hideInventory();
    }
    this.syncPlacementMode();
  }

  private showInventory(): void {
    this.hideInventory();
    const panel = new Container();
    panel.addChild(
      new Graphics()
        .roundRect(-330, -42, 660, 84, 26)
        .fill({ color: 0xfff5df, alpha: 0.97 })
        .stroke({ color: 0x68442f, width: 4 }),
    );
    const kinds: FurnitureKind[] = ["plant", "desk", "sofa", "catTree", "bed"];
    kinds.forEach((kind, index) => {
      const button = new CanvasButton({
        label: message(furniturePresentation[kind].labelMessage),
        width: 92,
        height: 48,
        color: 0xd7ae7a,
        onPress: () => {
          this.selectedFurniture = kind;
          this.syncPlacementMode();
          this.notify(
            message("furniture.selected", {
              item: message(furniturePresentation[kind].labelMessage),
            }),
          );
        },
      });
      button.position.set(-308 + index * 104, -24);
      panel.addChild(button);
    });
    const rotate = new CanvasButton({
      label: message("home.rotate"),
      width: 102,
      height: 48,
      color: 0x9fb89a,
      onPress: () => {
        this.placementRotation = this.placementRotation === 0 ? 1 : 0;
        this.syncPlacementMode();
      },
    });
    rotate.position.set(212, -24);
    panel.addChild(rotate);
    this.inventoryPanel = panel;
    this.uiLayer.addChild(panel);
    panel.position.set(this.screenWidth / 2, this.screenHeight - 92);
  }

  private hideInventory(): void {
    if (!this.inventoryPanel) {
      return;
    }
    this.uiLayer.removeChild(this.inventoryPanel);
    this.inventoryPanel.destroy({ children: true });
    this.inventoryPanel = null;
  }

  private syncPlacementMode(): void {
    this.clearing.setPlacementMode(this.editMode, this.selectedFurniture, this.placementRotation);
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
    this.clearing.syncFurniture();
  }
}
