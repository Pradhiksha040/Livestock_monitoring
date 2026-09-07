import urllib.request
import json
import traceback

req = urllib.request.Request('http://127.0.0.1:8000/api/token/', data=json.dumps({'username': 'asdfg', 'password': 'password'}).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8')[:1500])
except Exception as e:
    print(e)
