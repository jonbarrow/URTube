# URTube, a YouTube video to MP3 downloader and SoundCloud MP3 ripper built in NodeJs and Electron

<p align="center">
  <img src="https://i.imgur.com/3xxdzrI.png" width="200">
</p>

## Current features:

- [X] Search for YouTube videos
- [ ] Support for converting from a direct URL
- [X] Download videos as MP3 files
- [X] Download multiple songs at once
- [X] Set video thumbnail as cover art metadata
- [X] Set uploader as album metadata name
- [X] Properly set the artist and song metadata based on video title
- [X] SoundCloud support (CURRENTLY SOUNDCLOUD SUPPORT IS VERY ROUGH AND NOT WELL WRITTEN. IT SHOULD BE REWRITTEN)
- [X] all the stuff above but for SoundCloud songs

## Known bugs

### (I have only tested URTube on Windows 10, the latest version of CU (Creators Update))

1. WMP (Windows Media Player) will sometimes display the wrong image. This is due to WMP taking the first song you open in any given directory and creating 2 hidden system files called `AlbumArtSmall.jpg` and `Folder.jpg`, which are based on that first song. WMP will then always use one of these 2 system files for image display. There is nothing I can do about this.
2. Groove Music will sometimes show incorrect or multiple images. If Groove Music is showing multiple images, it is because you have the settings set to download missing/incorrect metadata from the internet. Turning this off will fix the multiple images issue. If it displays the incorrect image, I have no idea. Groove seems very broken, and seems to display a random image from a random song in the directory if the songs album is `null` (which should never happen)
2. ID3 metadata (song title, artist, image, etc) is not correctly written on Linux. I do not have a Linux machine, and as such I cannot test this in order to fix it.
