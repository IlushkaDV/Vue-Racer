const { app, BrowserWindow } = require("electron");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
		},
	});

	// Загрузка вашего приложения
	mainWindow.loadFile("index.html");

	// Скрытие меню окна
	mainWindow.setMenu(null);

	// Установка окна в полноэкранный режим
	mainWindow.setFullScreen(true);

	// Открытие DevTools
	mainWindow.webContents.openDevTools();

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (mainWindow === null) {
		createWindow();
	}
});
