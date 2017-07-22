var packager = require('electron-packager');

packager({
	"dir": ".",
	"name": "URTube",
	"overwrite": true,
	"asar": true,
	"out": "builds/",
	"platform": "win32",
	"arch": "ia32",
	"icon": "./ico.ico",
	"win32metadata": {
		"CompanyName": "URTube",
		"FileDescription": "A YouTube video to MP3 downloader built in NodeJs and run with Electron",
		"OriginalFilename": "URTube",
		"ProductName": "URTube",
		"InternalName": "URTube"
	}
}, function done_callback (err, appPaths) {
	if(err) {
		console.error(err);
		process.exit(1);
	}
	console.log(appPaths);
});