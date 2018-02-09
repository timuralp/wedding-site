var STATE_ENUM = {
    INIT: 'Look-up invitation',
    SUBMIT: 'Submit response',
    UPDATE: 'Update invitation'
};

function checkFields() {
    var $fields = $('.prompt');
    $fields.each(function() {
        var $field = $(this);
    });
}

function getAttendee(success_func) {
    $.ajax({
        url: 'http://localhost:5000/guest',
        type: 'GET',
        data: {
            'first': $('#firstName').val(),
            'last': $('#lastName').val()
        },
        success: function(data, reqStatus, xhr) {
            success_func($.parseJSON(data));
        },
        error: function(xhr, reqStatus, error) {
            // TODO: show an error if we can't find a guest
            console.log('error: ' + error);
        }
    });
}

function submitAttendee(attendee, success_func) {
    var data = {first: attendee.first, last: attendee.last};
    var formData = $('form').serializeArray();
    for (var i = 0; i < formData.length; i++) {
        data[formData[i].name] = formData[i].value;
    }

    $.ajax({
        url: 'http://localhost:5000/guest',
        type: 'POST',
        data: data,
        success: function(data, reqStatus, xhr) {
            success_func();
        },
        error: function(xhr, reqStatus, error) {
            console.log('error: ' + error);
        }
    });
}

function toRadioName(val) {
    if (typeof(val) === 'string') {
        return val[0].toUpperCase() + val.substring(1);
    } else if (typeof(val) === 'boolean') {
        return val ? 'Yes' : 'No';
    }
}

function showField(prefix, value) {
    $('.' + prefix).find('.btn').removeClass('active');
    if (value !== null) {
        $('#' + prefix + toRadioName(value)).parent().addClass('active');
        $('#' + prefix + toRadioName(value)).prop('checked', true);
    }
    $('.prompt.' + prefix).css({display: 'flex'});
}

function showFields(attendee) {
    showField('rsvp', attendee.rsvp);
    if (attendee.rsvp === null || attendee.rsvp === false) {
        $('.prompt.entree').hide();
        $('.prompt.rehearsal').hide();
        $('.prompt.brunch').hide();
        $('.prompt.guest').hide();
        $('.prompt.guestEntree').hide();
        return;
    }

    showField('entree', attendee.entree);
    if (attendee.rehearsalAsk === true) {
        showField('rehearsal', attendee.rehearsal);
    }
    showField('brunch', attendee.brunch);

    if (attendee.guestAsk === true) {
        showField('guest', attendee.guest);
        if (attendee.guest === true) {
            showField('guestEntree', attendee.guestEntree);
        } else {
            $('.prompt.guestEntree').hide();
        }
    }
}

function resetForm() {
    $('.prompt.rsvp').hide();
    $('.prompt.entree').hide();
    $('.prompt.rehearsal').hide();
    $('.prompt.brunch').hide();
    $('.prompt.guest').hide();
    $('.prompt.guestEntree').hide();
    $('.btn-secondary').removeClass('active');
}

$(document).ready(function() {
    var attendee = null;

    $('#submit').on('click', function() {
        if ($('#submit').data('state') === 'INIT') {
            getAttendee(function(resp) {
                attendee = resp;
                showFields(attendee);
                if (attendee.rsvp === null) {
                    $('#submit').data('state', STATE_ENUM.SUBMIT);
                    $('#submit').html(STATE_ENUM.SUBMIT);
                } else {
                    $('#submit').data('state', STATE_ENUM.UPDATE);
                    $('#submit').html(STATE_ENUM.UPDATE);
                }
            });
        } else {
            submitAttendee(attendee, function(resp) {
                var $msg = $('#modal-message');
                $msg.html('Thank you for your response, '
                          + attendee.first + '!');
                $('#submit_modal').modal('show');
            });
        }
    });

    $('#submit_modal').on('hide.bs.modal', function (e) {
        attendee = null;
        resetForm();
        $('#submit').data('state', 'INIT');
        $('#submit').html(STATE_ENUM.INIT);
        $('#firstName').val('');
        $('#lastName').val('');
    });

    $('.prompt.rsvp').find('.btn').on('click', function() {
        var $input = $(this).find('input');
        if ($input.val() === 'yes') {
            attendee.rsvp = true;
        } else {
            attendee.rsvp = false;
        }
        showFields(attendee);
    });

    $('.prompt.guest').find('.btn').on('click', function() {
        var $input = $(this).find('input');
        if ($input.val() === 'yes') {
            attendee.guest = true;
        } else {
            attendee.guest = false;
        }
        showFields(attendee);
    });

    $('#firstName').on('change', function() {
        if (firstName !== null && attendee !== null && firstName !== attendee.firstName) {
            attendee = null;
            resetForm();
            $('#submit').data('state', 'INIT');
            $('#submit').html(STATE_ENUM.INIT);
        }
    });

});
