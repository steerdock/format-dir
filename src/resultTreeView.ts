import * as vscode from "vscode";
import { t } from "./i18n";
import * as path from "path";

export interface FormatResult {
  uri: vscode.Uri;
  status: "success" | "skipped" | "failed";
  reason?: string;
}

class ResultTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly result?: FormatResult,
    public readonly contextValue?: string,
  ) {
    super(label, collapsibleState);

    if (result) {
      this.tooltip = result.uri.fsPath;
      this.resourceUri = result.uri;

      switch (result.status) {
        case "success":
          this.iconPath = new vscode.ThemeIcon(
            "check",
            new vscode.ThemeColor("testing.iconPassed"),
          );
          break;
        case "skipped":
          this.iconPath = new vscode.ThemeIcon(
            "circle-slash",
            new vscode.ThemeColor("testing.iconSkipped"),
          );
          break;
        case "failed":
          this.iconPath = new vscode.ThemeIcon(
            "error",
            new vscode.ThemeColor("testing.iconFailed"),
          );
          if (result.reason) {
            this.tooltip = `${result.uri.fsPath}\n${result.reason}`;
          }
          break;
      }

      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [result.uri],
      };
    }
  }
}

export class ResultTreeDataProvider implements vscode.TreeDataProvider<ResultTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ResultTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private results: FormatResult[] = [];
  private lastRunTime: Date | undefined;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  clear(): void {
    this.results = [];
    this.lastRunTime = undefined;
    this.refresh();
  }

  setResults(results: FormatResult[]): void {
    this.results = results;
    this.lastRunTime = new Date();
    this.refresh();
  }

  getTreeItem(element: ResultTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ResultTreeItem): Thenable<ResultTreeItem[]> {
    if (!element) {
      // Root level - show categories
      if (this.results.length === 0) {
        return Promise.resolve([]);
      }

      const successCount = this.results.filter(
        (r) => r.status === "success",
      ).length;
      const skippedCount = this.results.filter(
        (r) => r.status === "skipped",
      ).length;
      const failedCount = this.results.filter(
        (r) => r.status === "failed",
      ).length;

      const categories: ResultTreeItem[] = [];

      if (successCount > 0) {
        const label = t(
          "formatDirectory.resultTreeSuccess",
          successCount.toString(),
        );
        categories.push(
          new ResultTreeItem(
            label,
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            "successCategory",
          ),
        );
      }

      if (skippedCount > 0) {
        const label = t(
          "formatDirectory.resultTreeSkipped",
          skippedCount.toString(),
        );
        categories.push(
          new ResultTreeItem(
            label,
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            "skippedCategory",
          ),
        );
      }

      if (failedCount > 0) {
        const label = t(
          "formatDirectory.resultTreeFailed",
          failedCount.toString(),
        );
        categories.push(
          new ResultTreeItem(
            label,
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            "failedCategory",
          ),
        );
      }

      return Promise.resolve(categories);
    } else {
      // Category level - show files
      let filteredResults: FormatResult[] = [];

      if (element.contextValue === "successCategory") {
        filteredResults = this.results.filter((r) => r.status === "success");
      } else if (element.contextValue === "skippedCategory") {
        filteredResults = this.results.filter((r) => r.status === "skipped");
      } else if (element.contextValue === "failedCategory") {
        filteredResults = this.results.filter((r) => r.status === "failed");
      }

      const items = filteredResults.map((result) => {
        const fileName = path.basename(result.uri.fsPath);
        const label = result.reason
          ? `${fileName} - ${result.reason}`
          : fileName;
        return new ResultTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          result,
          "file",
        );
      });

      return Promise.resolve(items);
    }
  }

  getStats(): {
    total: number;
    success: number;
    skipped: number;
    failed: number;
  } {
    return {
      total: this.results.length,
      success: this.results.filter((r) => r.status === "success").length,
      skipped: this.results.filter((r) => r.status === "skipped").length,
      failed: this.results.filter((r) => r.status === "failed").length,
    };
  }
}

export class ResultTreeViewManager {
  private treeDataProvider: ResultTreeDataProvider;
  private treeView: vscode.TreeView<ResultTreeItem>;

  constructor(context: vscode.ExtensionContext) {
    this.treeDataProvider = new ResultTreeDataProvider();

    this.treeView = vscode.window.createTreeView("formatDirectoryResults", {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
    });

    context.subscriptions.push(this.treeView);

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand("formatDirectory.clearResults", () => {
        this.treeDataProvider.clear();
        vscode.window.showInformationMessage(
          t("formatDirectory.resultsClearedMessage"),
        );
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("formatDirectory.refreshResults", () => {
        this.treeDataProvider.refresh();
      }),
    );
  }

  showResults(results: FormatResult[]): void {
    this.treeDataProvider.setResults(results);

    const stats = this.treeDataProvider.getStats();

    // Update tree view title with stats
    if (stats.failed > 0) {
      this.treeView.message = t(
        "formatDirectory.resultsWithErrors",
        stats.success.toString(),
        stats.total.toString(),
        stats.failed.toString(),
      );
    } else {
      this.treeView.message = t(
        "formatDirectory.resultsSuccess",
        stats.success.toString(),
        stats.total.toString(),
      );
    }

    // Reveal the tree view
    // this.treeView.reveal(undefined, { focus: false, select: false });
  }

  clear(): void {
    this.treeDataProvider.clear();
    this.treeView.message = undefined;
  }
}
