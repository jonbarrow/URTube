const {ipcRenderer} = require('electron'); // Gets ipcRenderer

var dl_array = [];

var sc_api_keys = ['2t9loNQH90kzJcsFCODdigxfp325aq4z','a3e059563d7fd3372b49b37f00a00bcf','23aca29c4185d222f2e536f440e96b91'];
	// I totally didn't steal these from other GitHub repos

$(function() {
    $('.loader-container').hide();
	$('[data-toggle="popover"]').popover();
	$('.fa-download').click((event) => {
		$('.dl-list').addClass('active');
	});
	$('.fa-times').click((event) => {
		$('.dl-list').removeClass('active');
	});
	$('.fa-search').click((event) => {
		var query = $('.search-bar').val().trim();
		if (query === '') return;

		search(query);
	});
});

$('.provider').click((event) => {
	$('.provider').removeClass('active');
	$(event.target).addClass('active');

	var target = $(event.target).attr('id');

	$('.search-area-content').hide();
	$('#' + target + '-container').show();
});

$('body').on('click', '.dl-button', function(event) {
	event.preventDefault();
	$('.overlay-text').html('Working...');
	$('.overlay').css('display', 'block');

	var time = Date.now();
	ipcRenderer.send('start-dl', {id: $(this).attr('--data-videoId'), thumbnail_url: $(this).attr('--data-videoThumbnailUrl'), uploader: $(this).attr('--data-uploader'), title: $(this).attr('--data-title'), time: time});
});

$('body').on('click', '.dl-button-sc', function(event) {
	event.preventDefault();
	$('.overlay-text').html('Working...');
	$('.overlay').css('display', 'block');

	var time = Date.now();
	ipcRenderer.send('start-dl-sc', {url: $(this).attr('--data-url'), time: time});
});

$('body').on('click', '.newpage', function(event) {
	event.preventDefault();
	search($(this).attr('--data-search'), $(this).attr('--data-token'));
});

ipcRenderer.on('dl-started', (event, data) => {
	$('.overlay').css('display', 'none');
	dl_array.push(data.id + data.time);
	$('.dl-list-content').prepend(
		'<div class="row">\
            <div class="dl-video">\
                <div class="dl-thumbnail" id="dl-' + data.index + '">\
                    <img src="' + data.thumbnail_url + '">\
                    <div class="progress">\
                        <div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">\
                            <span class="sr-only">0%</span>\
                        </div>\
                    </div>\
                </div>\
            </div>\
        </div>'
	);
	$('.dl-list').addClass('active');
});
ipcRenderer.on('dl-progress', (event, data) => {
	var progress = Math.ceil(data.percentage);
	$('#dl-' + data.video_index).find('.progress-bar').css('width', progress + '%').attr('aria-valuenow', data.percentage);
});
ipcRenderer.on('dl-finished', (event, data) => {
	$('#dl-' + data.video_index).find('.progress-bar').removeClass('progress-bar-info').addClass('progress-bar-success');
});

$(".btn-window-option-minimize").click(function(event) {
	ipcRenderer.send('btn-window-option-minimize');
});
$(".btn-window-option-maximize").click(function(event) {
	ipcRenderer.send('btn-window-option-maximize');
});
$(".btn-window-option-close").click(function(event) {
	ipcRenderer.send('btn-window-option-close');
});

function rePos() {
	$('.app-content, .app-errors').css('margin-top', Math.round($('.navbar').outerHeight())+'px');
}

function checkKey(event) {
	var key = (event.keyCode ? event.keyCode : event.which);
	if (key == 13) {
		var target = $(event.target),
			parent = target.parent(),
			search_bar = parent.find('.search-bar');
    	var query = search_bar.val().trim();
		if (query === '') return;
		
		search(search_bar.attr('--provider'), query);
	}
}

function search(provider, query, token=null) {

	$('.overlay-text').html('Searching for: ' + query);
	$('.overlay').css('display', 'block');

	var post = {
		query: query
	}

	if (token) {
		post.pageToken = token;
	}

	if (provider === 'soundcloud') {
		var current_api_key = sc_api_keys[Math.floor(Math.random() * sc_api_keys.length)];
		$.get('http://api.soundcloud.com/tracks.json?q=' + query + '&limit=50&linked_partitioning=1&client_id=' + current_api_key, function(data, textStatus, xhr) {
			var container = $('#' + provider + '-container'),
				results_container = container.find('.dl-area-search-results');

			container.find('.dl-area-search-results').html('');

			for (var i = 0; i < data.collection.length; i++) {
				if (data.collection[i].artwork_url) {
					var artwork_url = data.collection[i].artwork_url.replace('-large.jpg', '-t500x500.jpg');
				} else {
					var artwork_url = "idk.png"
				}
				results_container.append(
					'<div class="row">\
						<div class="video">\
							<div class="thumbail">\
								<img src="' + artwork_url + '">\
							</div>\
							<div class="details">\
								<div class="title">' + data.collection[i].title + '</div>\
								<div --data-url="' + data.collection[i].permalink_url + '" class="dl-button-sc"><button class="btn btn-info">Download MP3</button></div>\
							</div>\
						</div>\
					</div>'
				);
			}
			$('.overlay').css('display', 'none');
		});
	} else if (provider === 'youtube') {
		$.post('http://165.227.153.194/', post, function(data, textStatus, xhr) {
			data = JSON.parse(data);
			var container = $('#' + provider + '-container'),
				results_container = container.find('.dl-area-search-results');

			container.find('.dl-area-search-results').html('');
			container.find('.dl-area-search-buttons').html('');

			for (var i = 0; i < data.results.length; i++) {
				results_container.append(
					'<div class="row">\
						<div class="video">\
							<div class="thumbail">\
								<img src="' + data.results[i].thumbnail_url.url + '">\
							</div>\
							<div class="details">\
								<div class="title">' + data.results[i].title + '</div>\
								<div --data-videoId="' + data.results[i].id + '" --data-videoThumbnailUrl="' + data.results[i].thumbnail_url.url + '" --data-uploader="' + data.results[i].uploader + '" --data-title="' + data.results[i].title + '" class="dl-button"><button class="btn btn-info">Download MP3</button></div>\
							</div>\
						</div>\
					</div>'
				);
			}
			if (data.prevPageToken) {
				container.find('.dl-area-search-buttons').prepend('<button class="newpage btn btn-success" --data-token="' + data.prevPageToken + '" --data-search="' + query + '">Previous 50 results</button>');
			}
			if (data.nextPageToken) {
				container.find('.dl-area-search-buttons').prepend('<button class="newpage btn btn-success" --data-token="' + data.nextPageToken + '" --data-search="' + query + '">Next 50 results</button>');
			}
			$('.overlay').css('display', 'none');
		});
	}
}