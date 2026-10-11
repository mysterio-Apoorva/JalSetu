"""Reject published bundles containing known development fixtures or test credentials."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def verify():
    folder = ROOT/'frontend/dist'
    assert (folder/'index.html').is_file(), 'Build frontend first'
    bundle = '\n'.join(p.read_text(encoding='utf-8') for p in folder.rglob('*.js'))
    banned = ['CitizenPass123!', 'DriverPass123!', 'DispatcherPass123!', 'AuditorPass123!',
              'citizen@jalsetu.local', 'Sunita Sharma', 'Anil Aggarwal', 'DL-01-TK-101', 'Simulate Hindi Voice Note',
              'FRAUD-GHOST-TRIP-CAUGHT', 'Interactive demo']
    found = [value for value in banned if value in bundle]
    assert not found, 'Development fixtures remain in production bundle: '+', '.join(found)
    assert not list(folder.rglob('*.map')), 'Source maps must not be published'
    assert 'OperationsApp' in bundle, 'Expected live-only entry was not built'
    return {'productionBundle':'PASS','developmentFixturesAbsent':True}

if __name__=='__main__': print(verify())
