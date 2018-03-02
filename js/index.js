function appendPart (string, value, suffix) {
    if (value == 0) {
        return string;
    }
    if (string.length > 0) {
        return string + ', ' + value + suffix;
    }
    return value + suffix;
}

$(document).ready(function() {
    var $counter = $('#countdown');
    var event_date = new Date(Date.UTC(2018, 07, 12, 0, 0, 0));
    var countdownFunc = function() {
        var now = new Date(Date.now());
        var delta = event_date - now;
        if (delta <= 0) {
            $counter.css('font-size', '1.75rem');
            $counter.html('Thank you for coming to our wedding!');
            $counter.show();
            return;
        }
        var days = Math.floor(delta / (1000 * 3600 * 24));
        var remainder = delta - days * 1000 * 3600 * 24;
        var hours = Math.floor(remainder / (3600 * 1000));
        remainder -= hours * 3600 * 1000;
        var minutes = Math.floor(remainder / (60 * 1000));
        var seconds = Math.floor((remainder - minutes * 60 * 1000) / 1000);
        var counter_text = '';
        counter_text = appendPart(counter_text, days, ' days');
        counter_text = appendPart(counter_text, hours, ' hours');
        counter_text = appendPart(counter_text, minutes, ' minutes');
        counter_text = appendPart(counter_text, seconds, ' seconds');
        counter_text += '.';
        $counter.html(counter_text);
        $counter.show();
        setTimeout(countdownFunc, 1000);
    };

    if (window.screen.width * window.devicePixelRatio > 1200) {
        countdownFunc();
    }
});
