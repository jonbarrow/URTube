'use strict';

//////////////////////////////////////////////////////////////////
///                                                            ///
///                        Dependencies                        ///
///                                                            ///
//////////////////////////////////////////////////////////////////

var electron = require('electron'),
	fs = require('fs-extra'),
	https = require('https'),
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

var sc_api_keys = ['2t9loNQH90kzJcsFCODdigxfp325aq4z','a3e059563d7fd3372b49b37f00a00bcf','23aca29c4185d222f2e536f440e96b91'];
	// I totally didn't steal these from other GitHub repos


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

ipcMain.on('start-dl-sc', (event, data) => {
	downloadSCMP3(data);
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

function downloadFromURL(URL, time) {

}

function downloadVideoMP3(data, time) {
	var id = data.id,
		thumbnail_url = data.thumbnail_url,
		uploader = data.uploader,
		title = data.title
		time = data.time;

	downloadThumbnail(thumbnail_url, './tmps/' + id + '.jpeg', (error) => {
        if (error) {
            return console.log(error);
        }

		var artist_title = getArtistTitle(title);
		var folder;
		var metadata;
		if (artist_title) {
			folder = pickSaveDirectory(artist_title[0] + ' - ' + artist_title[1] + '.mp3');
			metadata = {
				artist: artist_title[0],
				title: artist_title[1],
				image: './tmps/' + id + '.jpeg',
				album: uploader
			}
		} else {
			folder = pickSaveDirectory(title + '.mp3');
			metadata = {
				artist: uploader,
				title: title,
				image: './tmps/' + id + '.jpeg',
				album: uploader
			}
		}

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

function downloadSCMP3(data) {
    var current_api_key = sc_api_keys[Math.floor(Math.random() * sc_api_keys.length)],
        url = data.url,
        time = data.time;
    https.get('https://api.soundcloud.com/resolve?url=' + url + '&client_id=' + current_api_key, (res) => {
        res.on('data', (data) => {
            data = JSON.parse(data);
            if (data.errors) throw new Error(data.errors[0].error_message);
            
            var redirect = data.location;

            https.get(redirect, (res) => {
                res.on('data', (data) => {
                    data = JSON.parse(data);
                    if (data.errors) throw new Error(data.errors[0].error_message);

                    //console.log(data)

                    var id = data.id,
                        stream_url = data.stream_url,
                        artwork_url = data.artwork_url.replace('-large.jpg', '-t500x500.jpg'),
                        artist = data.user.username,
                        title = data.title,
                        album = data.user.permalink;
                    
                    var metadata = {
                        artist: artist,
                        title: title,
                        album: album
                    }

                    https.get(artwork_url, (res) => {
						var output = fs.createWriteStream('./tmps/' + id + '.jpg');

                        res.on('data', (chunk) => {
                            output.write(chunk);
                        });

                        res.on('end', () => {
                            metadata.image = './tmps/' + id + '.jpg';
                            https.get(stream_url + '?client_id=' + current_api_key, function(res) {

								var output_file = pickSaveDirectory(artist + ' - ' + title + '.mp3');
								
								var redirect = res.headers.location;

								var received_bytes = 0,
									total_bytes = 0;

								request.head(redirect, function(err, res, body) {
									total_bytes = parseInt(res.headers['content-length']);

									https.get(redirect, (res) => {
										var output = fs.createWriteStream(output_file);
										
										

										dl_array.push(id + time);

										if (ApplicationWindow) {
											ApplicationWindow.webContents.send("dl-started", {id: id, time: time, thumbnail_url: artwork_url, index: dl_array.indexOf(id + time)});
										}

										res.on('data', (chunk) => {
											received_bytes += chunk.length;
											output.write(chunk);
											showProgress(received_bytes, total_bytes, id + time);
										});

										res.on('end', () => {
											output.end();

											ID3.removeTags(output_file);
											var meta_written = ID3.write(metadata, output_file);

											if (meta_written) {
												fs.unlink('./tmps/' + id + '.jpg', () => {
													if (ApplicationWindow) {
														console.log('done')
														ApplicationWindow.webContents.send("dl-finished", {video_index: dl_array.indexOf(id + time)});
													}
												});
											}
										});
									});
								});
                            });
                        })
                    });
                });
            }).on('error', (error) => {
                throw new Error(error);
            });
        });
    }).on('error', (error) => {
        throw new Error(error);
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
		return pickSaveDirectory();
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
