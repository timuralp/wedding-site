$(document).ready(function() {
    $('#adventuresBtn').on('click', function() {
        $('.adventures-carousel').show();
        $('.engagement-carousel').hide();
        $(this).addClass('active');
        $('#engagementBtn').removeClass('active');
    });
    $('#engagementBtn').on('click', function() {
        $('.adventures-carousel').hide();
        $('.engagement-carousel').show();
        $(this).addClass('active');
        $('#adventuresBtn').removeClass('active');
    });
});
