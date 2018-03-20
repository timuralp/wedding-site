from flask import Flask, request
import guests
import json


app = Flask(__name__)


@app.route('/guest', methods=['POST', 'GET', 'OPTIONS'])
def handle_guest():
    if request.method == 'OPTIONS':
        return ('', 200, [('Allow', 'GET, POST, OPTIONS'),
                          ('Access-Control-Allow-Origin', 'http://localhost'),
                          ('Access-Control-Allow-Headers',
                           'x-api-key, content-type')])

    event = dict(queryStringParameters=request.args,
                 body=json.dumps(request.get_json()),
                 httpMethod=request.method)
    resp = guests.handle_request(event, None)
    resp['headers']['access-control-allow-origin'] = 'http://localhost'
    resp['headers']['content-type'] = 'application/json'
    return (resp['body'], resp['statusCode'], resp['headers'])
