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
            'last': $('#lastName').val(),
            'address': $('#address').val()
        },
        success: function(data, reqStatus, xhr) {
            success_func($.parseJSON(data));
        },
        error: function(xhr, reqStatus, error) {
            console.log(xhr);
            console.log(reqStatus);
            if (xhr.status === 404) {
                $('.alert-danger').html('Please double check your name and street address');
                $('.alert-danger').show();
            }
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

function showField(prefix, attendee, key) {
    console.log(prefix, attendee, key);
    if (key in attendee && attendee[key] !== null) {
        console.log(attendee[key]);
        $('.' + prefix).find('.btn').removeClass('active');
        $('#' + prefix + toRadioName(attendee[key])).parent().addClass('active');
        $('#' + prefix + toRadioName(attendee[key])).prop('checked', true);
    }
    $('.prompt.' + prefix).css({display: 'flex'});
    $('.prompt.' + prefix + ' input').prop('disabled', false);
}

function showFields(attendee) {
    showField('rsvp', attendee, 'rsvp');
    if (attendee.rsvp === null || attendee.rsvp === false) {
        $('.prompt.entree').hide();
        $('.prompt.rehearsal').hide();
        $('.prompt.brunch').hide();
        $('.prompt.guest').hide();
        $('.prompt.guestEntree').hide();
        return;
    }

    showField('entree', attendee, 'entree');
    if (attendee.rehearsalAsk === true) {
        showField('rehearsal', attendee, 'rehearsalResp');
    }
    showField('brunch', attendee, 'brunch');

    if (attendee.guestAsk === true) {
        showField('guest', attendee, 'guest');
        if (attendee.guest === true) {
            showField('guestEntree', attendee, 'guestEntree');
        } else {
            $('.prompt.guestEntree').hide();
        }
    }
}

function resetForm() {
    $('form')[0].reset();
    $('.prompt').hide();
    $('.prompt input').prop('disabled', true);
    $('.btn-secondary').removeClass('active');
    $('.alert-danger').hide();
}

$(document).ready(function() {
    var attendee = null;

    $('#submit').on('click', function(event) {
        if (!$('form')[0].checkValidity()) {
            return;
        }

        event.preventDefault();

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
        $('.alert-danger').hide();
        var firstName = $(this).val();
        if (firstName !== null && attendee !== null && firstName !== attendee.firstName) {
            attendee = null;
            resetForm();
            $('#firstName').val(firstName);
            $('#submit').data('state', 'INIT');
            $('#submit').html(STATE_ENUM.INIT);
        }
    });

    $('#lastName').on('change', function() {
        $('.alert-danger').hide();
        var lastName = $(this).val();
        if (lastName !== null && attendee !== null && lastName !== attendee.lastName) {
            attendee = null;
            resetForm();
            $('#lastName').val(lastName);
            $('#submit').data('state', 'INIT');
            $('#submit').html(STATE_ENUM.INIT);
        }
    });

});
