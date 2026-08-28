import json
import urllib.request

with open('dist/index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

data = {
    "files": {
        "package.json": {
            "content": {
                "name": "beta-club-tracker",
                "version": "1.0.0",
                "main": "index.html",
                "scripts": {
                    "start": "serve ."
                },
                "dependencies": {
                    "serve": "^13.0.0"
                }
            }
        },
        "index.html": {
            "content": html_content
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
