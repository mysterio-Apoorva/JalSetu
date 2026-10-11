"""Verify the Amplify site serves the exact reviewed static build over HTTPS."""
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    state = json.loads((ROOT / '.runtime/amplify-release.json').read_text())
    origin = state['origin']
    assert origin.startswith('https://'), 'Hosting must use HTTPS'
    dist = ROOT / 'frontend/dist'
    checked = []
    for file in sorted(dist.rglob('*')):
        if not file.is_file():
            continue
        relative = file.relative_to(dist).as_posix()
        with urllib.request.urlopen(origin + '/' + relative, timeout=30) as response:
            body = response.read()
            assert response.status == 200, relative
            assert hashlib.sha256(body).digest() == hashlib.sha256(file.read_bytes()).digest(), relative + ' differs from the reviewed build'
            if relative == 'index.html':
                assert response.headers.get('Content-Security-Policy'), 'Missing CSP'
                assert response.headers.get('X-Content-Type-Options') == 'nosniff'
        checked.append(relative)
    with urllib.request.urlopen(origin + '/public', timeout=30) as response:
        assert response.read() == (dist / 'index.html').read_bytes(), 'Public route rewrite failed'
    result = {'origin': origin, 'exactBuildMatch': True, 'publicRoute': True, 'files': checked}
    (ROOT / '.runtime/hosted-verification.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
