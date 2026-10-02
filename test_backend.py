import urllib.request
import json
import time

base = 'http://127.0.0.1:5000/api'

def test_get(url):
    print(f"GET {url}")
    try:
        resp = urllib.request.urlopen(url)
        data = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: {str(data)[:100]}...")
        return data
    except Exception as e:
        print(f"FAILED: {e}")
        return None

def test_post(url, body=None):
    print(f"POST {url}")
    try:
        data = b''
        if body:
            data = json.dumps(body).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: {str(data)[:100]}...")
        return data
    except Exception as e:
        print(f"FAILED: {e}")
        return None

# 1. Health
test_get(f"{base}/health")

# 2. List records
records_data = test_get(f"{base}/records?limit=2")
record_id = records_data['records'][0]['record_id'] if records_data else None

if record_id:
    # 3. Get record detail
    test_get(f"{base}/records/{record_id}")
    
    # 4. Classify
    test_post(f"{base}/classify/{record_id}")
    
    # 5. Diagnose
    test_post(f"{base}/diagnose/{record_id}")
    
    # 6. Report
    test_get(f"{base}/report/{record_id}?format=json")

print("All tests complete.")
