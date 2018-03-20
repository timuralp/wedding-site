import boto3
import json


TABLE_NAME = 'rsvp'
DYNAMO_DB = 'http://localhost:8000'


def toBool(val):
    if val is None:
        return False
    if val.lower() == 'yes':
        return True
    return False


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
                 address=None, partner=None):
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

    def to_dict(self):
        return {
            'first': self.first,
            'last': self.last,
            'rsvp': self.rsvp,
            'entree': self.entree,
            'rehearsalAsk': self.rehearsal_invite,
            'rehearsalResp': self.rehearsal_rsvp,
            'brunch': self.brunch,
            'guestAsk': self.guest_allowed,
            'guest': self.guest,
            'guestEntree': self.guest_entree,
            'address': self.address.split()[0]}

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


def get(event, context):
    first = event.get('queryStringParameters', {}).get('first')
    last = event.get('queryStringParameters', {}).get('last')
    address = event.get('queryStringParameters', {}).get('address')
    if first is None or last is None or address is None:
        return {
            'statusCode': 400,
            'body': 'Missing first and/or last name and/or address'
        }
    ddb = boto3.client('dynamodb')  # , endpoint_url=DYNAMO_DB)
    item = ddb.get_item(TableName=TABLE_NAME,
                        Key={'first': {'S': first},
                             'last': {'S': last}})
    loaded_guest = Guest.from_ddb(item)
    if loaded_guest is None:
        return {
            'statusCode': 404,
            'body': 'No such guest'
        }
    if address != loaded_guest.address.split()[0]:
        return {'body': 'No such guest', 'statusCode': 404}

    resp = loaded_guest.to_dict()
    if loaded_guest.partner:
        partner_first, partner_last = loaded_guest.partner.split(' ', 1)
        partner_entry = ddb.get_item(TableName=TABLE_NAME,
                                     Key={'first': {'S': partner_first},
                                          'last': {'S': partner_last}})
        partner = Guest.from_ddb(partner_entry)
        resp['partner'] = partner.to_dict()

    return {
        'statusCode': 200,
        'body': json.dumps(resp)
    }


def post(event, context):
    try:
        form = json.loads(event['body'])
    except Exception as e:
        return {
            'statusCode': 400,
            'body': 'Failed to load json: %s -- %s' % (
                e.message, event['body'])
        }

    first = form.get('first')
    last = form.get('last')
    if not first or not last:
        return {'statusCode': 400, 'body': 'Invalid name'}
    ddb = boto3.client('dynamodb', endpoint_url=DYNAMO_DB)
    resp = ddb.get_item(TableName=TABLE_NAME,
                        Key={'first': {'S': first}, 'last': {'S': last}})
    guest = Guest.from_ddb(resp)
    if guest is None:
        return {'body': 'No such guest', 'statusCode': 404}
    if form['address'] != guest.address.split()[0]:
        return {'body': 'No such guest', 'statusCode': 404}

    partner = None
    if 'partnerRSVP' in form:
        resp = ddb.get_item(TableName=TABLE_NAME,
                            Key={'first': {'S': form.get('partnerFirst')},
                                 'last': {'S': form.get('partnerLast')}})
        partner = Guest.from_ddb(resp)
        if partner is None:
            return {'body': "Guest's partner is not found", 'statusCode': 404}

    required = ['rsvp']
    if toBool(form.get('rsvp')):
        required += ['entree', 'brunch']
        if guest.rehearsal_invite:
            required.append('rehearsalResp')
        if guest.guest_allowed:
            required.append('guest')
            if toBool(form.get('guest')):
                required.append('guestEntree')
    missing = []
    for field in required:
        if field not in form:
            missing.append(field)
            continue
        if field == 'rehearsalResp':
            guest.rehearsal_rsvp = toBool(form['rehearsalResp'])
            if partner:
                partner.rehearsal_rsvp = guest.rehearsal_rsvp
        elif field == 'guestEntree':
            if form['guestEntree'] not in Guest.ENTREE_LIST:
                return {'statusCode': 400, 'body': 'Invalid guest entree'}
            guest.guest_entree = form['guestEntree']
        else:
            if field in Guest.FIELD_MAP:
                setattr(guest, field, toBool(form[field]))
                continue
            if field == 'entree':
                if form[field] not in Guest.ENTREE_LIST:
                    return {'statusCode': 400, 'body': 'Invalid entree'}
            setattr(guest, field, form[field])
    if partner:
        for field in ['partnerRSVP', 'partnerEntree']:
            if field not in form:
                missing.append(field)
                continue
            if field == 'partnerEntree':
                if form['partnerEntree'] not in Guest.ENTREE_LIST:
                    return {'statusCode': 400, 'body': 'Invalid entree'}
                partner.entree = form['partnerEntree']
            else:
                partner.rsvp = toBool(form['partnerRSVP'])

        partner.brunch = guest.brunch
        partner.rehearsal_rsvp = guest.rehearsal_rsvp

    if missing:
        return {'statusCode': 400,
                'body': json.dumps(
                    {'error': 'missing field', 'fields': missing})}
    ddb.put_item(TableName=TABLE_NAME, Item=guest.to_ddb())
    if partner:
        ddb.put_item(TableName=TABLE_NAME, Item=partner.to_ddb())
    return {'statusCode': 200, 'body': '{}'}


def handle_request(event, context):
    if event.get('httpMethod') == 'GET':
        resp = get(event, context)
    elif event.get('httpMethod') == 'POST':
        resp = post(event, context)
    else:
        return {'statusCode': 500, 'body': 'Unknown method'}
    resp['headers'] = {}
    origin = event.get('headers', {}).get('origin')
    if origin in ['https://timurandalyssa.party',
                  'https://www.timurandalyssa.party']:
        resp['headers']['access-control-allow-origin'] = origin
    else:
        resp['headers']['access-control-allow-origin'] =\
            'https://timurandalyssa.party'
    return resp
