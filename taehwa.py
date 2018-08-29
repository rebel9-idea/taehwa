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

thelist = [b'7', b'8', b'9']
theclient = pymongo.MongoClient('mongodb://localhost:27017')
thedb = theclient['taehwa_db']
thecollection = thedb['taehwa_offline']
app = Flask(__name__, static_folder='media')
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_MEDIA = os.path.join(APP_ROOT, 'media')
APP_STATIC = os.path.join(APP_ROOT, 'static')
CORS(app)

def pagination(thecol, page_size, page_num=1, **kwargs):
    tosort = None
    if 'sort' in kwargs.keys():
        if kwargs['sort'] != []:
            tosort = kwargs['sort']
    if 'onesearch' in kwargs.keys():
        search = kwargs['onesearch']
    else:
        search = {}
    if search == {}:
        if tosort is not None:
            cursor = thecol.find().skip((page_num-1)*page_size).limit(page_size).sort(tosort)
            totalcnt = thecol.find().sort(tosort).count(True)
        else:
            cursor = thecol.find().skip((page_num - 1) * page_size).limit(page_size)
            totalcnt = thecol.find().count(True)
    else:
        if tosort is not None:
            cursor = thecol.find({'$and': [{}, search]}).skip((page_num-1)*page_size).limit(page_size).sort(tosort)
            totalcnt = thecol.find({'$and': [{}, search]}).sort(tosort).count(True)
        else:
            cursor = thecol.find({'$and': [{}, search]}).skip((page_num - 1) * page_size).limit(page_size)
            totalcnt = thecol.find({'$and': [{}, search]}).count(True)
    if 'multisearch' in kwargs.keys():
        tosearch = kwargs['multisearch']
        if tosort is not None:
            if len(tosearch) == 1:
                cursor = thecol.find(tosearch[0]).skip((page_num - 1) * page_size).limit(page_size).sort(tosort)
                totalcnt = thecol.find(tosearch[0]).sort(tosort).count(True)
            else:
                cursor = thecol.find({'$and': tosearch}).skip((page_num - 1) * page_size).limit(page_size).sort(tosort)
                totalcnt = thecol.find({'$and': tosearch}).sort(tosort).count(True)
        else:
            cursor = thecol.find({'$and': tosearch}).skip((page_num - 1) * page_size).limit(page_size)
            totalcnt = thecol.find({'$and': tosearch}).count(True)
    else:
        pass

    # Get the data
    data = []
    for x in cursor:
        if 'theid' in x.keys():
            try:
                x['theid'] = str(x['theid'])
            except Exception as e:
                print e
        x['_id'] = str(x['_id'])
        if 'ebook_major_classification_id' in x.keys():
            x['ebook_major_classification_id'] = str(x['ebook_major_classification_id'])
            x['ebook_major'] = {
                'ebook_major_classification_id': str(x['ebook_major_classification_id']),
                'ebook_major_classification_name': dbmodels.Ebook_maj.collection.find_one({'_id': ObjectId(x['ebook_major_classification_id'])})['name']
            }
            x.pop('ebook_major_classification_id')
        if 'printed_on' in x.keys():
            x['printed_on'] = x['printed_on'].strftime('%Y%m')

        if 'added_date' in x.keys():
            x['added_date'] = x['added_date'].strftime('%Y%m%d%H%M')
        if 'reg_date' in x.keys():
            x['reg_date'] = x['reg_date'].strftime('%Y%m%d%H%M')
        if 'question' in x.keys():
            for anw in x['question']['selected_answers']:
                anw['added_date'] = anw['added_date'].strftime('%Y%m%d%H%M')
        if 'connected_media_id' in x.keys():
            x['connected_media_id'] = str(x['connected_media_id'])
        if 'selected_answers' in x.keys():
            for b in x['selected_answers']:
                b['added_date'] = b['added_date'].strftime('%Y%m%d%H%M')
            x.pop('_id')
        if 'connected_thething_id' in x.keys():
            x['connected_thething_id'] = str(x['connected_thething_id'])
        if 'connected_business_id' in x.keys():
            if type(x['connected_business_id']) == type([]):
                confac = []
                for num, oneid in enumerate(x['connected_business_id']):
                    facilname = dbmodels.Businesses({'_id': ObjectId(oneid)})
                    facilname.reload()
                    confac.append({
                        'theid': str(oneid),
                        'title': facilname['title']
                    })
                x['connected_business_id'] = confac
            else:
                facilname = dbmodels.Businesses({'_id': ObjectId(x['connected_business_id'])})
                facilname.reload()
                x['connected_business_id'] = {
                    'theid': str(x['connected_business_id']),
                    'title': facilname['title']
                }
        if 'connected_facilities_id' in x.keys():
            confac = []
            for num, oneid in enumerate(x['connected_facilities_id']):
                facilname = dbmodels.Facilities({'_id': oneid})
                facilname.reload()
                confac.append({
                    'theid': str(oneid),
                    'title': facilname['title']
                })
            x['connected_facilities_id'] = confac
        if 'address' in x.keys():
            for adr in x['address']:
                try:
                    if 'gu_id' in adr.keys():
                        adr['gu_id'] = str(adr['gu_id'])
                except Exception as e:
                    print e
                    print adr
        if 'connected_people_id' in x.keys():
            confac = []
            for num, oneid in enumerate(x['connected_people_id']):
                theperson = dbmodels.People({'_id': oneid})
                theperson.reload()
                confac.append({
                    'theid': str(oneid),
                    'name': theperson['name']
                })
            x['connected_people_id'] = confac
        # if 'images' in x.keys():
        #     if x['images'] != '':
        #         for image in x['images']:
        #             if 'image' in image.keys():
        #                 if 'thumb' not in image['image'].keys():
        #                     image['image']['client_thumb'] = image['image']['client_thumb'][:-4] + '_client_thumb' +image['image']['client_thumb'][-4:]
        #                     image['image']['admin_thumb'] = image['image']['admin_thumb'][:-4] + '_admin_thumb' + image['image']['admin_thumb'][-4:]
        # if 'thumb_img' in x.keys():
        #     if x['thumb_img'] != '':
        #         if 'thumb' not in x['thumb_img'].keys():
        #             x['thumb_img']['client_thumb'] = x['thumb_img']['client_thumb'][:-4] + '_client_thumb' + x['thumb_img']['client_thumb'][-4:]
        #             x['thumb_img']['admin_thumb'] = x['thumb_img']['admin_thumb'][:-4] + '_admin_thumb' + x['thumb_img']['admin_thumb'][-4:]
        if 'people' in x.keys():
            x['people'] = [dbmodels.People.collection.find_one({'_id': ObjectId(k['theid'])})['name'] for k in x['people']]
        if 'businesses' in x.keys():
            x['businesses'] = [dbmodels.Businesses.collection.find_one({'_id': ObjectId(k['theid'])})['title'] for k in x['businesses']]
        if 'sent_to' in x.keys():
            x['sent_to'] = [k['date'].strftime('%Y%m%d%H%M') for k in x['sent_to']]
        if 'type' in x.keys():
            try:
                thetype = dbmodels.BusinessType({'_id': ObjectId(x['type'])})
                thetype.reload()
            except TypeError:
                thetype = dbmodels.Facilitytype({"_id": ObjectId(x['type'])})
                thetype.reload()

            x['type'] = {
                'type_title': thetype['title'],
                'type_id': str(thetype['_id'])
            }

        data.append(x)
    print data
    if not data:
        # No documents left
        return {'data': None, 'last_id': None}
    # Since documents are naturally ordered with _id, last document will
    # have max id.
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

@app.route('/musicfile/<path:path>')
def servemusicfiles(path):
    return send_from_directory(APP_MEDIA, path)


if __name__ == '__main__':
    app.run('0.0.0.0', port=2018)
