chrome.app.runtime.onLaunched.addListener(function() {
	var window = chrome.app.window.create('mindframe.html', {
	},function(createdWindow){
		createdWindow.maximize();
	});
});