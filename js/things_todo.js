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
        updateHeading({relatedTarget: ($target.find('.active')[0])});
    };

    var updateHeading = function(ev) {
        var $nextElementCaption = $(ev.relatedTarget).find('.carousel-caption');
        var $carouselsCaption = $('#caption-below');
        $carouselsCaption.find('.heading').html($nextElementCaption.find('h3').html());
        $carouselsCaption.find('.main').html($nextElementCaption.find('p').html());
    };

    hideAll();
    $('.sights-carousel').show();
    $('#sightsBtn').addClass('active');

    for (var i = 0; i < carousels.length; i++) {
        $('#' + carousels[i] + 'Btn').on('click', switchCarousel);
        $('#' + carousels[i] + 'Carousel').on('slide.bs.carousel', updateHeading);
    }

    updateHeading({relatedTarget: $('#sightsCarousel .active')[0]});
});
