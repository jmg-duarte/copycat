// The module 'vscode' contains the VS Code extensibility API
import { Dirent, FSWatcher, renameSync } from 'fs';
import * as vscode from 'vscode';
import { authentication, window } from 'vscode';

const versionRegex = /(?:(?<=^v?|\sv?)(?:(?:0|[1-9]\d{0,9})\.){2}(?:0|[1-9]\d{0,9})(?:-(?:0|[1-9]\d*?|[\da-z-]*?[a-z-][\da-z-]*?){0,100}(?:\.(?:0|[1-9]\d*?|[\da-z-]*?[a-z-][\da-z-]*?))*?){0,100}(?:\+[\da-z-]+?(?:\.[\da-z-]+?)*?){0,100}\b){1,200}/gi;

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('copycat.copyExtension', async () => {
		// fetch non-native vscode extensions
		const extensions = vscode.extensions.all.filter((value, idx, arr) => {
			return !value.id.startsWith("vscode.");
		});

		// show a quickpick menu containing all extensions
		const selectedPick = await window.showQuickPick(
			extensions.map((value, idx, arr) => {
				return {
					label: `${value.packageJSON.displayName}`,
					description: `(${value.id})`,
					index: idx
				};
			}),
			{
				title: "Pick a target extension:",
				canPickMany: false,
			}
		);

		// return on error
		if (!selectedPick) {
			window.showErrorMessage("Failed to fetch extension");
			return;
		}

		const selectedExtension = extensions[selectedPick.index];

		const authorId = await getAuthorId();
		if (authorId === undefined) {
			return;
		}

		const packageId = await getPackageId();
		if (packageId === undefined) {
			return;
		}

		const version = await getVersion();
		if (version === undefined) {
			return;
		}

		const extensionProjectName = `${authorId}.${packageId}-${version}`;

		const targetUri = await window.showOpenDialog(
			{
				title: "Select the target folder:",
				canSelectFolders: true,
				canSelectFiles: false,
				canSelectMany: false,
			}
		);
		if (targetUri === undefined) {
			return;
		}

		const projectFolder = copyFolderRecursiveSync(
			selectedExtension.extensionPath,
			targetUri[0].fsPath,
			extensionProjectName
		);

		const openProject = await window.showQuickPick(
			["Yes", "No"],
			{
				title: "Open project folder?",
				canPickMany: false,
			}
		);

		switch (openProject) {
			case undefined:
			case "No":
				return;
			case "Yes":
				const folderUri = vscode.Uri.file(projectFolder);
				vscode.commands.executeCommand("vscode.openFolder", folderUri);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }

function getAuthorId(): Thenable<string | undefined> {
	return window.showInputBox(
		{
			title: "Insert the author ID (<author>.<packageId>-<version>):",
			ignoreFocusOut: true,
			value: "authorId",
			validateInput: (authorId) => {
				if (!authorId.trim()) {
					return "The author ID cannot be empty.";
				}
				return undefined;
			}
		}
	);
}

function getPackageId(): Thenable<string | undefined> {
	return window.showInputBox(
		{
			title: "Insert the package ID (<author>.<packageId>-<version>):",
			ignoreFocusOut: true,
			value: "packageId",
			validateInput: (packageId) => {
				if (!packageId.trim()) {
					return "The packageId ID cannot be empty.";
				}
				return undefined;
			}
		}
	);
}

function getVersion(): Thenable<string | undefined> {
	return window.showInputBox(
		{
			title: "Insert the package ID (<author>.<packageId>-<version>):",
			ignoreFocusOut: true,
			value: "0.0.1",
			validateInput: (version) => {
				if (!versionRegex.test(version)) {
					return "Invalid version slug.";
				}
				return undefined;
			}
		}
	);
}

var fs = require('fs');
var path = require('path');

function copyFileSync(source: string, target: string) {

	var targetFile = target;

	// If target is a directory, a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source));
		}
	}

	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source: string, target: string, basename?: string): string {
	var files = [];

	// Check if folder needs to be created or integrated
	var targetFolder = path.join(target, basename ?? path.basename(source));
	if (!fs.existsSync(targetFolder)) {
		fs.mkdirSync(targetFolder);
	}

	// Copy
	if (fs.lstatSync(source).isDirectory()) {
		files = fs.readdirSync(source);
		files.forEach(function (file: string[] | Buffer[] | Dirent[]) {
			var curSource = path.join(source, file);
			if (fs.lstatSync(curSource).isDirectory()) {
				copyFolderRecursiveSync(curSource, targetFolder);
			} else {
				copyFileSync(curSource, targetFolder);
			}
		});
	}

	return targetFolder;
}
