import json
import urllib.request

with open('dist/index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

data = {
    "files": {
        "index.html": {
            "content": html_content
        },
        "package.json": {
            "content": {
                "name": "static-beta-club",
                "version": "1.0.0",
                "description": "Beta Club App"
            }
        },
        "sandbox.config.json": {
            "content": "{\"template\": \"static\"}"
        }
    }
}

req = urllib.request.Request(
    'https://codesandbox.io/api/v1/sandboxes/define?json=1',
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'Accept': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print(e)
