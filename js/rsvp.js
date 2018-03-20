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
    $('.alert-danger').hide();
    $.ajax({
        url: API_URL,
        type: 'GET',
        data: {
            'first': $('#firstName').val(),
            'last': $('#lastName').val(),
            'address': $('#address').val(),
        },
        headers: {
            'x-api-key': API_KEY
        },
        success: function(data, reqStatus, xhr) {
            success_func(data);
        },
        error: function(xhr, reqStatus, error) {
            console.log(xhr);
            console.log(reqStatus);
            if (xhr.status === 404) {
                $('.alert-danger').html('Please double check your name and street number');
                $('.alert-danger').show();
            }
        }
    });
}

function submitAttendee(attendee, success_func) {
    var data = {first: attendee.first,
                last: attendee.last,
                address: attendee.address};
    var formData = $('form').serializeArray();
    for (var i = 0; i < formData.length; i++) {
        data[formData[i].name] = formData[i].value;
    }

    if ('partner' in data) {
        if (data.partner === 'no') {
            delete data.partnerRSVP;
            delete data.partnerEntree;
        } else {
            data.partnerFirst = attendee.partner.first;
            data.partnerLast = attendee.partner.last;
        }
        delete data.partner;
    }

    $.ajax({
        url: API_URL,
        headers: {
            'x-api-key': API_KEY,
        },
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
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
    if (key in attendee && attendee[key] !== null) {
        $('.' + prefix).find('.btn').removeClass('active');
        $('#' + prefix + toRadioName(attendee[key])).parent().addClass('active');
        $('#' + prefix + toRadioName(attendee[key])).prop('checked', true);
    }
    $('.prompt.' + prefix).css({display: 'flex'});
    $('.prompt.' + prefix + ' input').prop('disabled', false);
}

function showPartnerFields(attendee) {
    if (!('partner' in attendee) || attendee.partner === null) {
        return;
    }

    if (attendee.partner.rsvp === null) {
        $('.prompt.partner label').filter('.col-form-label').html(
            'Would you like to RSVP for ' + attendee.partner.first + '?');
        showField('partner', attendee.partner, 'respondFor');
    }

    if (attendee.partner.respondFor === false) {
        $('.prompt.partnerRSVP').hide();
        $('.prompt.partnerEntree').hide();
        return;
    }

    if (attendee.partner.respondFor === true) {
        $('.prompt.partnerRSVP label').filter('.col-form-label').html(
            'Will ' + attendee.partner.first + ' be able to attend?');
        showField('partnerRSVP', attendee.partner, 'rsvp');
    }

    if (!('respondFor' in attendee.partner) && attendee.partner.rsvp !== null) {
        $('.prompt.partnerRSVP label').filter('.col-form-label').html(
            'Will ' + attendee.partner.first + ' be able to attend?');
        showField('partnerRSVP', attendee.partner, 'rsvp');
    }

    if (attendee.partner.rsvp === true) {
        $('.prompt.partnerEntree label').filter('.col-form-label').html(
            attendee.partner.first + "'s dinner entre\u00e9:");
        showField('partnerEntree', attendee.partner, 'entree');
    }
}

function showFields(attendee) {
    showField('rsvp', attendee, 'rsvp');
    if (attendee.rsvp === null || attendee.rsvp === false) {
        $('.prompt.entree').hide();
        $('.prompt.rehearsal').hide();
        $('.prompt.brunch').hide();
        $('.prompt.guest').hide();
        $('.prompt.guestEntree').hide();
        $('.prompt.partnerRSVP').hide();
        $('.prompt.partnerEntree').hide();
        showPartnerFields(attendee);
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

    showPartnerFields(attendee);
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

    $('.prompt.partner').find('.btn').on('click', function() {
        var $input = $(this).find('input');
        if ($input.val() === 'yes') {
            attendee.partner.respondFor = true;
        } else {
            attendee.partner.respondFor = false;
        }
        showFields(attendee);
    });

    $('.prompt.partnerRSVP').find('.btn').on('click', function() {
        var $input = $(this).find('input');
        if ($input.val() === 'yes') {
            attendee.partner.rsvp = true;
        } else {
            attendee.partner.rsvp = false;
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
