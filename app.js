'use strict';

//////////////////////////////////////////////////////////////////
///                                                            ///
///                        Dependencies                        ///
///                                                            ///
//////////////////////////////////////////////////////////////////

var electron = require('electron'),
	fs = require('fs-extra'),
  	originalFs = require('original-fs'),
	request = require('request'),
  	youtube = require('ytdl-core'),
    ffmpeg = require('fluent-ffmpeg'),
    ID3 = require('node-id3'),
    getArtistTitle = require('get-artist-title'),
	path = require('path'),
	url = require('url'),
	dialog = electron.dialog,
	BrowserWindow = electron.BrowserWindow,
	ipcMain = electron.ipcMain,
	app = electron.app;


app.setName("Music Downloader");

if (!fs.existsSync('./tmps')) {
    createDirectory('./tmps');
}

var dl_array = [];

let ApplicationWindow;

function createWindow(file) {
    ApplicationWindow = new BrowserWindow({
      	icon: './ico.png',
      	titleBarStyle: 'hidden',
      	frame: false
    });
  	ApplicationWindow.loadURL(url.format({ // Makes the window
  		pathname: path.join(__dirname, '/app/' + file + '.html'),
    	protocol: 'file:',
    	slashes: true
  	}));
  	ApplicationWindow.on('closed', () => {
    	ApplicationWindow = null;
  	});
	ApplicationWindow.webContents.on('new-window', (e, url) => {
  		e.preventDefault();
	  	electron.shell.openExternal(url);
	});
}

app.on('ready', () => {
	createWindow('index');
})

app.on('window-all-closed', () => {
  	if (process.platform !== 'darwin') {
    	app.quit();
  	}
})

app.on('activate', () => {
  	if (ApplicationWindow === null) {
    	createWindow('index');
  	}
});

ipcMain.on('start-dl', (event, data) => {
	downloadVideoMP3(data);
});

ipcMain.on('btn-window-option-minimize', (event, data) => {
	ApplicationWindow.minimize();
});
ipcMain.on('btn-window-option-maximize', (event, data) => {
	if (!ApplicationWindow.isMaximized()) {
 		ApplicationWindow.maximize();
 	} else {
 		ApplicationWindow.unmaximize();
 	}
});
ipcMain.on('btn-window-option-close', (event, data) => {
	ApplicationWindow.close();    // Button in the top right
});

function downloadVideoMP3(data, time) {
	var id = data.id,
		thumbnail_url = data.thumbnail_url,
		uploader = data.uploader,
		title = data.title
		time = data.time;

	console.log(data);

	downloadThumbnail(thumbnail_url, './tmps/' + id + '.jpeg', (error) => {
        if (error) {
            return console.log(error);
        }

        var artist_title = getArtistTitle(title);

        var folder = pickSaveDirectory(artist_title[0] + ' - ' + artist_title[1] + '.mp3');

        var metadata = {
            artist: artist_title[0],
            title: artist_title[1],
            image: './tmps/' + id + '.jpeg',
            album: uploader
        }

        console.log(metadata);

        var received_bytes = 0,
            total_bytes = 0;

        dl_array.push(id + time);

        if (ApplicationWindow) {
	    	ApplicationWindow.webContents.send("dl-started", {id: id, time: time, thumbnail_url: thumbnail_url, index: dl_array.indexOf(id + time)});
	    }

        var video = youtube('https://youtube.com/watch?v=' + id, {
            filter: function(format) {
                return format.container === 'mp4';
            }
        });
        video.on('response', (response) => {
            total_bytes = parseInt(response.headers['content-length']);
        });
        video.on('progress', (chunk_length) => {
            received_bytes += chunk_length;
            showProgress(received_bytes, total_bytes, id + time);
        });
        var proc = new ffmpeg({source:video});
        proc.setFfmpegPath('./node_modules/ffmpeg-binaries/bin/ffmpeg');
        proc.save(folder).on('end', () => {
            ID3.removeTags(folder);
            var meta_written = ID3.write(metadata, folder);

            if (meta_written) {
            	fs.unlink('./tmps/' + id + '.jpeg', () => {
	            	if (ApplicationWindow) {
				    	ApplicationWindow.webContents.send("dl-finished", {video_index: dl_array.indexOf(id + time)});
				    }
	            });
            }
        });
    });
}

function showProgress(received, total, hash) {
    var percentage = (received * 100) / total;
    if (ApplicationWindow) {
    	ApplicationWindow.webContents.send("dl-progress", {percentage: percentage, video_index: dl_array.indexOf(hash)});
    }
}

function downloadThumbnail(url, _path, cb) {
    request.head(url, function(error, response, body) {
        if (error) {
            return cb(error);
        }
        request(url).pipe(fs.createWriteStream(_path)).on('close', () => {
            return cb(null);
        });
    });
}

function pickSaveDirectory(name) {
	var folder = dialog.showSaveDialog({
		title: 'Select a location to save your MP3',
		defaultPath: name
	});

	if (!folder) {
		return pickSMMLevelFolder();
	}
	return folder;
}
function createDirectory(path) {
	try {
		fs.mkdir(path);
	} catch(error) {
		console.log('error', error);
	}
}
