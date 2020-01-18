import boto3
import botocore
import botocore.exceptions
import json
import time

from guests import Guest

TABLE_NAME = 'rsvp'
SCHEMA = {
    'AttributeDefinitions': [
        {'AttributeName': 'first',
         'AttributeType': 'S'},
        {'AttributeName': 'last',
         'AttributeType': 'S'}],
    'TableName': TABLE_NAME,
    'KeySchema': [
        {'AttributeName': 'last',
         'KeyType': 'HASH'},
        {'AttributeName': 'first',
         'KeyType': 'RANGE'}],
    'ProvisionedThroughput': {
        'ReadCapacityUnits': 1,
        'WriteCapacityUnits': 1
    }
}


def verify_table(client, wait_for_create=False):
    try:
        resp = client.describe_table(TableName=TABLE_NAME)
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] != 'ResourceNotFoundException':
            raise
        client.create_table(**SCHEMA)
        resp = client.describe_table(TableName=TABLE_NAME)

    if resp['Table']['TableStatus'] == 'ACTIVE':
        return

    if resp['Table']['TableStatus'] == 'CREATING':
        if not wait_for_create:
            raise RuntimeError('Still creating!')
        while True:
            resp = client.describe_table(TABLE_NAME)
            if resp['Table']['TableStatus'] == 'ACTIVE':
                return
            time.sleep(0.1)


def load_guests(client, guests):
    for guest in guests:
        try:
            args = {
                'first': {'S': guest['first']},
                'last': {'S': guest['last']},
                'guest_allowed': {
                    'BOOL': guest.get('guest_allowed', False)},
                'rehearsal_invite': {
                    'BOOL': guest.get('rehearsal_invite', False)},
            }
            if guest['address']:
                args['address'] = {'S': guest['address']}
            client.put_item(
                TableName=TABLE_NAME,
                Item=args,
                ConditionExpression='(attribute_not_exists(#fname) '
                                    'AND attribute_not_exists(#lname))',
                ExpressionAttributeNames={
                    '#fname': 'first',
                    '#lname': 'last'})
        except botocore.exceptions.ClientError as e:
            print e


def add_partner(client, guests):
    for guest in guests:
        if not guest['partner']:
            key = {
                'first': {'S': guest['first']},
                'last': {'S': guest['last']},
            }
            update = {
                'partner': {
                    'Action': 'DELETE'}
            }
            client.update_item(
                TableName=TABLE_NAME,
                Key=key,
                AttributeUpdates=update)
            continue
        try:
            key = {
                'first': {'S': guest['first']},
                'last': {'S': guest['last']},
            }
            update = {
                'partner': {
                    'Value': {'S': guest['partner']},
                    'Action': 'PUT'}
            }
            client.update_item(
                TableName=TABLE_NAME,
                Key=key,
                AttributeUpdates=update)

        except botocore.exceptions.ClientError as e:
            print e


def get_guest(client, first, last):
    resp = client.get_item(TableName=TABLE_NAME,
                           Key={'first': {'S': first},
                                'last': {'S': last}})
    return Guest.from_ddb(resp)


def set_guest(client, guest):
    resp = client.put_item(
        TableName=TABLE_NAME,
        Item=guest.to_ddb())
    return resp


def check_true(val):
    return val.lower() == 'yes'


def main():
    guests = []
    with open('./guests.csv') as guest_file:
        first = True
        for line in guest_file:
            if first:
                first = False
                continue
            fields = line.strip().split(',')
            if not fields[0] or not fields[1]:
                continue
            guest = {}
            guest['first'] = fields[0].strip()
            guest['last'] = fields[1].strip()
            guest['rehearsal_invite'] = check_true(fields[-3].strip())
            guest['guest_allowed'] = check_true(fields[-2].strip())
            guest['partner'] = fields[-4]
            guest['address'] = fields[4].split(',', 1)[0]
            if guest['address'].startswith('"'):
                guest['address'] = guest['address'][1:]
            guests.append(guest)

    ddb = boto3.client(
        'dynamodb',
        aws_access_key_id='<KEY ID.',
        aws_secret_access_key='<SECRET>',
        endpoint_url='http://localhost:8000')
    verify_table(ddb)
    load_guests(ddb, guests)
    add_partner(ddb, guests)
    for guest in guests:
        print guest['first'], guest['last']
        try:
            guest_dict = get_guest(
                ddb, guest['first'], guest['last']).to_dict()
            print json.dumps(guest_dict, sort_keys=True,
                             indent=4, separators=(': ', ','))
        except Exception as e:
            import traceback
            traceback.print_exc()
            print 'Error!', e


if __name__ == '__main__':
    main()
