from flask import Flask, request, render_template, Response, send_from_directory
import base64
import hashlib
import time
import datetime
from flask_cors import CORS
import pymongo
import json
import os
import serial
import random

mongo_u = 'taehwa'
mongo_p = 'taehwa18!'
mongohost = 'localhost'
# mongohost = '192.168.0.7'

theclient = pymongo.MongoClient('mongodb://' + mongo_u + ':' + mongo_p + '@' + mongohost + '/taehwa_online')
#theclient = pymongo.MongoClient('mongodb://localhost:27017')
thedb = theclient['taehwa_online']
thecollection = thedb['taehwa_online']
app = Flask(__name__, static_folder='media')
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_MEDIA = os.path.join(APP_ROOT, 'media')
APP_STATIC = os.path.join(APP_ROOT, 'static')
CORS(app)

def pagination(page_size=10, page_num=1, get_all=False):
    data = []
    cursor = thecollection.find().skip((page_num-1)*page_size).limit(page_size)
    totalcnt = len(list(thecollection.find()))
    for onemus in cursor:
        onemus['added_date'] = onemus['added_date'].strftime('%Y%m%d')
        data.append(onemus)
    final = {
        'data': data,
        'total_page': str(int(math.ceil(float(totalcnt)/page_size))),
        'total_count': totalcnt,
        'current_page': page_num
    }

    # Return data and last_id
    # print final
    return final


hashsalt = ':#*#HJ$)2@f)fdj383i@'

def to_json(data):
    return json.dumps(data) + "\n"

def resp(code, data):
    return Response(status=code, mimetype="application/json", response=to_json(data))

def leadingzeros(highestnum, num):
    m = len(str(highestnum))
    return str(num).zfill(int(m))

@app.route('/')
def main():
    return render_template('index.html')

@app.route('/css/<path:path>')
def servecss(path):
    return send_from_directory(APP_STATIC+'/css', path)

@app.route('/js/<path:path>')
def servejs(path):
    return send_from_directory(APP_STATIC+'/js', path)

@app.route('/img/<path:path>')
def serveimg(path):
    return send_from_directory(APP_STATIC+'/img', path)

@app.route('/sound/<path:path>')
def servesound(path):
    return send_from_directory(APP_STATIC+'/sound', path)

@app.route('/musicupload', methods=['POST'])
def musicupload():
#    print('json', request.json)
    #location = request.args['location']
    #average_vol = request.args['average_vol']
    themp3file = request.json['mp3file']
    fname = hashlib.md5((hashsalt+str(time.time())).encode('utf-8')).hexdigest() + '.mp3'
    with open('C:\\taehwa\\media\\' + fname, 'wb') as mFile:
        bytesmp3 = base64.b64decode(themp3file)
        mFile.write(bytesmp3)
    colcount = thecollection.count()
#    print('colcount', colcount)
    if colcount > 0:
        lastrec = thecollection.find().skip(colcount-1)[0]
        thenum = str(int(lastrec['thenum']) + 1)
    else:
        thenum = 1
    final = {
        'location': request.json['location'],
        'thenum': thenum,
        'average_vol': request.json['average_vol'],
        'mediafname': fname,
        'added_date': datetime.datetime.now()
    }
    thecollection.insert_one(final)
    k = final.copy()
    k["_id"] = str(k['_id'])
    k['added_date'] = k['added_date'].strftime("%Y%m%d%H%M")
    return resp(200, k)

# @app.route('/play', methods=['POST'])
# def playbuzz():
#     thefrequency=random.choice(thelist)
#     s.write(thefrequency)
#     return resp('200', {'result': 'Success'})

@app.route('/citysearch', methods=['POST'])
def citysearch():
    data = []
    print(request.json)
    searchcity = request.json['city']
    everything = thecollection.find({'location.city': searchcity})
#    print(list(everything))
    colcount = thecollection.count()
    if colcount > 0:
        lastrec = thecollection.find().skip(colcount-1)[0]
        thenum = str(int(lastrec['thenum']) + 1)
    else:
        thenum = 1
    for k in everything:
        k["_id"] = str(k['_id'])
        k['added_date'] = k['added_date'].strftime("%Y%m%d%H%M")
        k['thenum'] = leadingzeros(thenum, k['thenum'])
        data.append(k)
    print(data, len(data))
    return resp(200, {'data': data})


@app.route('/datesearch', methods=['POST'])
def datesearch():
    data = []
    searchdate = request.json['date']
    startdate = datetime.datetime.strptime(searchdate + '0000', '%Y%m%d%H%M')
    enddate = datetime.datetime.strptime(searchdate+'2359', '%Y%m%d%H%M')
    everything = thecollection.find({'added_date': {'$gte': startdate, '$lt': enddate}})
    colcount = thecollection.count()
    if colcount > 0:
        lastrec = thecollection.find().skip(colcount-1)[0]
        thenum = str(int(lastrec['thenum']) + 1)
    else:
        thenum = 1
    for k in everything:
        k["_id"] = str(k['_id'])
        k['added_date'] = k['added_date'].strftime("%Y%m%d%H%M")
        k['thenum'] = leadingzeros(thenum, k['thenum'])
        data.append(k)
    return resp(200, {'data': data})

@app.route('/music')
def geteverything():
    if 'action' in request.args:
        action = request.args['action']
        if action == 'get_all':
            data = []
            colcount = thecollection.count()
            if colcount > 0:
                lastrec = thecollection.find().skip(colcount-1)[0]
                thenum = str(int(lastrec['thenum']) + 1)
            else:
                thenum = 1

            for k in thecollection.find():
                k["_id"] = str(k['_id'])
                k['added_date'] = k['added_date'].strftime("%Y%m%d%H%M")
                k['thenum'] = leadingzeros(thenum, k['thenum'])
                data.append(k)

            return resp(200, {'data': data})
        elif action == 'pagination':
            if 'page_size' in request.args:
                page_size = request.args['page_size']
            else:
                page_size = 10
            if 'page_num' in request.args:
                page_num = request.args['page_num']
            else:
                page_num = 1
            return resp(200, {'data': pagination(page_size, page_num)})

@app.route('/musicfile/<path:path>')
def servemusicfiles(path):
    return send_from_directory(APP_MEDIA, path)


if __name__ == '__main__':
    app.run('0.0.0.0', port=2018)
