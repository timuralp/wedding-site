$(document).ready(function() {
    var carousels = ['sights', 'food', 'nightlife'];

    var hideAll = function() {
        for (var i = 0; i < carousels.length; i++) {
            $('.' + carousels[i] + '-carousel').hide();
            $('#' + carousels[i] + 'Btn').removeClass('active');
        }
    };

    var switchCarousel = function() {
        var $target = $('.' + $(this).data('carousel') + '-carousel');
        hideAll();
        $target.show();
        $(this).addClass('active');
    };

    hideAll();
    $('.sights-carousel').show();
    $('#sightsBtn').addClass('active');

    for (var i = 0; i < carousels.length; i++) {
        $('#' + carousels[i] + 'Btn').on('click', switchCarousel);
    }
});
