$(document).ready(function() {
    $('.navbar-collapse').on('show.bs.collapse', function() {
        $('.heading').hide();
    });
    $('.navbar-collapse').on('hidden.bs.collapse', function() {
        $('.heading').show();
    });
});
