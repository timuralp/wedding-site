import boto3
from flask import Flask, request
import json


app = Flask(__name__)
TABLE_NAME = 'rsvp'


class Guest(object):
    FIELD_MAP = {
        'rsvp': 'BOOL',
        'rehearsal_invite': 'BOOL',
        'brunch': 'BOOL',
        'rehearsal_rsvp': 'BOOL',
        'guest_allowed': 'BOOL',
        'guest': 'BOOL'
    }
    ENTREE_LIST = ['chicken', 'salmon', 'veggie']

    def __init__(self, first=None, last=None, rehearsal_invite=None,
                 entree=None, rsvp=None, rehearsal_rsvp=None, brunch=None,
                 guest_allowed=None, guest=None, guest_entree=None,
                 address=None):
        for name, value in locals().items():
            if name == 'self':
                continue
            setattr(self, name, value)

    def to_ddb(self):
        ret = {}
        for name, value in self.__dict__.items():
            if value is None:
                continue
            if name in self.FIELD_MAP:
                ret[name] = {self.FIELD_MAP[name]: value}
            else:
                ret[name] = {'S': value}
        return ret

    @classmethod
    def from_ddb(klass, ddb_object):
        if 'Item' not in ddb_object:
            return None
        args = {}
        for key, value in ddb_object['Item'].items():
            if 'S' in value:
                args[key.lower()] = value['S']
            elif 'BOOL' in value:
                args[key.lower()] = bool(value['BOOL'])
        return klass(**args)


@app.route('/')
def hello_world():
    return 'Hello world!'


@app.route('/guest', methods=['POST', 'GET'])
def guest():
    if request.method == 'POST':
        return handle_post()
    else:
        return get_guest()


def toBool(val):
    if val == 'yes':
        return True
    return False


def handle_post():
    headers = [('Access-Control-Allow-Origin', 'http://localhost')]
    first = request.form.get('first')
    last = request.form.get('last')
    address = request.form.get('address')
    if not first or not last or not address:
        return ('Invalid name', 400, headers)
    ddb = boto3.client('dynamodb', endpoint_url='http://localhost:8000')
    resp = ddb.get_item(TableName=TABLE_NAME,
                        Key={'first': {'S': first}, 'last': {'S': last}})
    guest = Guest.from_ddb(resp)
    if guest is None:
        return ('No such guest', 404, headers)
    if guest.address.lower() != address.lower():
        return ('No such guest', 404, headers)
    required = ['rsvp', 'entree', 'brunch']
    if guest.rehearsal_invite:
        required.append('rehearsalResp')
    if guest.guest_allowed:
        required.append('guest')
        if toBool(request.form.get('guest')):
            required.append('guestEntree')
    missing = []
    for field in required:
        if field not in request.form:
            missing.append(field)
            continue
        if field == 'rehearsalResp':
            guest.rehearsal_rsvp = toBool(request.form['rehearsalResp'])
        elif field == 'guestEntree':
            if request.form['guestEntree'] not in Guest.ENTREE_LIST:
                return ('Invalid guest entree', 400, headers)
            guest.guest_entree = request.form['guestEntree']
        else:
            if field in Guest.FIELD_MAP:
                setattr(guest, field, toBool(request.form[field]))
                continue
            if field == 'entree':
                if request.form[field] not in Guest.ENTREE_LIST:
                    return ('Invalid entree', 400, headers)
            setattr(guest, field, request.form[field])
    if missing:
        return (json.dumps({'error': 'missing field',
                            'fields': missing}), 400, headers)
    print guest.to_ddb()
    ddb.put_item(TableName=TABLE_NAME, Item=guest.to_ddb())
    return ('OK', headers)


def get_guest():
    first = request.args.get('first')
    last = request.args.get('last')
    address = request.args.get('address')
    headers = [('Access-Control-Allow-Origin', 'http://localhost')]
    if not first or not last or not address:
        return ('Missing first or last name', 404, headers)

    ddb = boto3.client('dynamodb', endpoint_url='http://localhost:8000')
    resp = ddb.get_item(TableName=TABLE_NAME,
                        Key={'first': {'S': first}, 'last': {'S': last}})
    guest = Guest.from_ddb(resp)
    print address, guest.address
    if guest is None or guest.address.lower() != address.lower():
        return ('No such guest', 404, headers)
    return (json.dumps({
        'first': guest.first,
        'last': guest.last,
        'rsvp': guest.rsvp,
        'entree': guest.entree,
        'rehearsalAsk': guest.rehearsal_invite,
        'rehearsalResp': guest.rehearsal_rsvp,
        'brunch': guest.brunch,
        'guestAsk': guest.guest_allowed,
        'guest': guest.guest,
        'guestEntree': guest.guest_entree,
        'address': guest.address}), headers)
