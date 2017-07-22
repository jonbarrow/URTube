const {ipcRenderer} = require('electron'); // Gets ipcRenderer

var dl_array = [];

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


$('body').on('click', '.dl-button', function(event) {
	event.preventDefault();
	$('.overlay-text').html('Working...');
	$('.overlay').css('display', 'block');

	var time = Date.now();
	ipcRenderer.send('start-dl', {id: $(this).attr('--data-videoId'), thumbnail_url: $(this).attr('--data-videoThumbnailUrl'), uploader: $(this).attr('--data-uploader'), title: $(this).attr('--data-title'), time: time});
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
    	var query = $('.search-bar').val().trim();
		if (query === '') return;
		
		search(query);
	}
}

function search(query, token=null) {

	$('.overlay-text').html('Searching for: ' + query);
	$('.overlay').css('display', 'block');

	var post = {
		query: query
	}

	if (token) {
		post.pageToken = token;
	}

	$.post('http://165.227.153.194/', post, function(data, textStatus, xhr) {
		data = JSON.parse(data);
		$('.dl-area-search-results').html('');
		$('.dl-area-search-buttons').html('');
		for (var i = 0; i < data.results.length; i++) {
			$('.dl-area-search-results').append(
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
			$('.dl-area-search-buttons').prepend('<button class="newpage btn btn-success" --data-token="' + data.prevPageToken + '" --data-search="' + query + '">Previous 50 results</button>');
		}
		if (data.nextPageToken) {
			$('.dl-area-search-buttons').prepend('<button class="newpage btn btn-success" --data-token="' + data.nextPageToken + '" --data-search="' + query + '">Next 50 results</button>');
		}
		$('.overlay').css('display', 'none');
	});
}