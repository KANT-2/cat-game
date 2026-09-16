import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type {
  Awaitable,
  DailyStatisticsRow,
  MyDailyStatisticsResult,
  MyDailyStatisticsRow,
  PublicDailyStatisticsResult,
} from "../../core/GameClient";
import type { GameState } from "../../domain/room";
import { BackButton } from "../components/BackButton";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPageBackground, createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { createCurrencyBar } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type StatisticsTab = "public" | "mine";

const PAGE_SIZE = 14;

type StatisticsSceneOptions = {
  getState: () => GameState;
  onBack: () => void;
  onFetchPublicStatistics: () => Awaitable<PublicDailyStatisticsResult>;
  onFetchMyStatistics: () => Awaitable<MyDailyStatisticsResult>;
  backIcon: string;
  coinIcon: string;
};

/** 전체 일별 통계(누구나)와 내 일별 통계(본인만)를 탭으로 나눠 보여 주는 전체 화면이다. */
export class StatisticsScene extends Container {
  private readonly content = new Container();
  private readonly options: StatisticsSceneOptions;
  private activeTab: StatisticsTab = "public";
  private publicRows: DailyStatisticsRow[] | null = null;
  private myRows: MyDailyStatisticsRow[] | null = null;
  private publicPage = 0;
  private minePage = 0;
  private loading = false;
  private errorMessage: string | null = null;
  private requestGeneration = 0;

  constructor(options: StatisticsSceneOptions) {
    super();
    this.options = options;
    this.addChild(this.content);
    this.render();
    void this.loadTab("public");
  }

  layout(width: number, height: number): void {
    layoutToFillViewport(this.content, width, height);
  }

  private async loadTab(tab: StatisticsTab): Promise<void> {
    if ((tab === "public" && this.publicRows) || (tab === "mine" && this.myRows)) {
      return;
    }
    const generation = ++this.requestGeneration;
    this.loading = true;
    this.errorMessage = null;
    this.render();
    if (tab === "public") {
      const result = await this.options.onFetchPublicStatistics();
      if (generation !== this.requestGeneration) {
        return;
      }
      this.loading = false;
      if (!result.ok) {
        this.errorMessage = message("stats.serverUnavailable");
        this.render();
        return;
      }
      this.publicRows = sortByDateDescending(result.rows);
      this.render();
      return;
    }
    const result = await this.options.onFetchMyStatistics();
    if (generation !== this.requestGeneration) {
      return;
    }
    this.loading = false;
    if (!result.ok) {
      this.errorMessage = message("stats.serverUnavailable");
      this.render();
      return;
    }
    this.myRows = sortByDateDescending(result.rows);
    this.render();
  }

  private selectTab(tab: StatisticsTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.render();
    void this.loadTab(tab);
  }

  private render(): void {
    this.content.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    this.buildBackground();
    this.buildHeader();
    this.buildTabs();
    this.buildBody();
  }

  private buildBackground(): void {
    this.content.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT));
  }

  private buildHeader(): void {
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 72, onPress: this.options.onBack });
    back.position.set(24, 20);
    const title = new Text({ text: message("stats.title"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(130, 22);
    const subtitle = new Text({ text: message("stats.subtitle"), style: textStyle(16, 0x76533d, "600") });
    subtitle.position.set(132, 66);
    const ornament = createTitleOrnament(132, 89, 170);
    const currency = createCurrencyBar(this.options.coinIcon, this.options.getState().coins);
    currency.container.position.set(1240, 20);
    this.content.addChild(back, title, subtitle, ornament, currency.container);
  }

  private buildTabs(): void {
    const tabs: Array<{ id: StatisticsTab; label: string }> = [
      { id: "public", label: message("stats.tabPublic") },
      { id: "mine", label: message("stats.tabMine") },
    ];
    tabs.forEach((tab, index) => {
      const active = tab.id === this.activeTab;
      const button = new CanvasButton({
        label: tab.label,
        width: 200,
        height: 56,
        color: active ? 0xffb957 : 0xffeed5,
        onPress: () => this.selectTab(tab.id),
      });
      button.position.set(55 + index * 215, 125);
      this.content.addChild(button);
    });
  }

  private buildBody(): void {
    const panel = createCozyPanel(55, 200, 1490, 630, { fill: 0xfff8e9, border: 0x95603d, radius: 28 });
    this.content.addChild(panel);
    if (this.loading) {
      this.content.addChild(this.centeredStatus(message("stats.loading")));
      return;
    }
    if (this.errorMessage) {
      this.content.addChild(this.centeredStatus(this.errorMessage));
      return;
    }
    if (this.activeTab === "public") {
      this.buildPublicTable(this.publicRows ?? []);
    } else {
      this.buildMineTable(this.myRows ?? []);
    }
  }

  private centeredStatus(text: string): Text {
    const status = new Text({ text, style: textStyle(19, 0x76533c, "700") });
    status.anchor.set(0.5);
    status.position.set(BASE_WIDTH / 2, 515);
    return status;
  }

  private buildPublicTable(rows: DailyStatisticsRow[]): void {
    const columns = [
      { label: message("stats.columnDate"), x: 95 },
      { label: message("stats.columnActiveUsers"), x: 300 },
      { label: message("stats.columnLearners"), x: 505 },
      { label: message("stats.columnCorrect"), x: 710 },
      { label: message("stats.columnIncorrect"), x: 915 },
      { label: message("stats.columnAccuracyRate"), x: 1120 },
      { label: message("stats.columnCoins"), x: 1325 },
    ] as const;
    if (rows.length === 0) {
      this.buildTableHeaders(columns);
      this.content.addChild(this.centeredStatus(message("stats.empty")));
      return;
    }
    const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    this.publicPage = Math.max(0, Math.min(this.publicPage, pageCount - 1));
    const pageRows = rows.slice(this.publicPage * PAGE_SIZE, (this.publicPage + 1) * PAGE_SIZE);
    this.buildTableHeaders(columns);
    pageRows.forEach((row, index) => {
      const y = 275 + index * 38;
      this.content.addChild(this.rowBackground(index, y));
      this.addCell(row.gameDate, columns[0].x, y);
      this.addCell(String(row.dailyActiveUsers), columns[1].x, y);
      this.addCell(String(row.activeLearners), columns[2].x, y);
      this.addCell(String(row.correctAttempts), columns[3].x, y);
      this.addCell(String(row.incorrectAttempts), columns[4].x, y);
      this.addCell(this.accuracyRateText(row.correctAttempts, row.incorrectAttempts), columns[5].x, y);
      this.addCell(String(row.coinsAwarded), columns[6].x, y);
    });
    this.buildPagination(this.publicPage, pageCount, (page) => {
      this.publicPage = page;
      this.render();
    });
  }

  private buildMineTable(rows: MyDailyStatisticsRow[]): void {
    const columns = [
      { label: message("stats.columnDate"), x: 95 },
      { label: message("stats.columnAttempts"), x: 300 },
      { label: message("stats.columnCorrect"), x: 505 },
      { label: message("stats.columnIncorrect"), x: 710 },
      { label: message("stats.columnAccuracyRate"), x: 915 },
      { label: message("stats.columnHints"), x: 1120 },
      { label: message("stats.columnCoins"), x: 1325 },
    ] as const;
    if (rows.length === 0) {
      this.buildTableHeaders(columns);
      this.content.addChild(this.centeredStatus(message("stats.empty")));
      return;
    }
    const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    this.minePage = Math.max(0, Math.min(this.minePage, pageCount - 1));
    const pageRows = rows.slice(this.minePage * PAGE_SIZE, (this.minePage + 1) * PAGE_SIZE);
    this.buildTableHeaders(columns);
    pageRows.forEach((row, index) => {
      const y = 275 + index * 38;
      this.content.addChild(this.rowBackground(index, y));
      this.addCell(row.gameDate, columns[0].x, y);
      this.addCell(String(row.attemptsSubmitted), columns[1].x, y);
      this.addCell(String(row.correctAttempts), columns[2].x, y);
      this.addCell(String(row.incorrectAttempts), columns[3].x, y);
      this.addCell(this.accuracyRateText(row.correctAttempts, row.incorrectAttempts), columns[4].x, y);
      this.addCell(String(row.hintsUsed), columns[5].x, y);
      this.addCell(String(row.coinsAwarded), columns[6].x, y);
    });
    this.buildPagination(this.minePage, pageCount, (page) => {
      this.minePage = page;
      this.render();
    });
  }

  private accuracyRateText(correct: number, incorrect: number): string {
    const total = correct + incorrect;
    return total === 0
      ? message("stats.accuracyRateUnavailable")
      : message("stats.accuracyRateValue", { value: Math.round((correct / total) * 100) });
  }

  private buildPagination(page: number, pageCount: number, onChange: (page: number) => void): void {
    const label = new Text({
      text: message("placement.page", { current: page + 1, total: pageCount }),
      style: textStyle(15, 0x76533c, "700"),
    });
    label.anchor.set(0.5);
    label.position.set(BASE_WIDTH / 2, 862);
    const previous = new CanvasButton({
      label: message("placement.previous"),
      width: 58,
      height: 44,
      fontSize: 22,
      disabled: page === 0,
      color: page === 0 ? 0xc9baa8 : 0xe2c29c,
      onPress: () => onChange(page - 1),
    });
    previous.position.set(BASE_WIDTH / 2 - 130, 840);
    const next = new CanvasButton({
      label: message("placement.next"),
      width: 58,
      height: 44,
      fontSize: 22,
      disabled: page >= pageCount - 1,
      color: page >= pageCount - 1 ? 0xc9baa8 : 0xe2c29c,
      onPress: () => onChange(page + 1),
    });
    next.position.set(BASE_WIDTH / 2 + 72, 840);
    this.content.addChild(previous, label, next);
  }

  private buildTableHeaders(columns: ReadonlyArray<{ label: string; x: number }>): void {
    columns.forEach((column) => {
      const header = new Text({ text: column.label, style: textStyle(16, 0x704b35, "700") });
      header.position.set(column.x, 235);
      this.content.addChild(header);
    });
  }

  private rowBackground(index: number, y: number): Graphics {
    return new Graphics()
      .roundRect(75, y - 6, 1450, 32, 10)
      .fill(index % 2 === 0 ? 0xfff9ec : 0xffefd9)
      .stroke({ color: 0xe3c7a6, width: 1 });
  }

  private addCell(text: string, x: number, y: number): void {
    const cell = new Text({ text, style: textStyle(15, 0x3d2b22, "700") });
    cell.position.set(x, y);
    this.content.addChild(cell);
  }
}

function sortByDateDescending<T extends { gameDate: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.gameDate.localeCompare(a.gameDate));
}
