"""Local CSV validation tests. No AWS calls or records are created."""
import csv
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from import_operations import records

class ImportValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(dir=ROOT/'.runtime')
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name)
        self.assertTrue(self.path.resolve().is_relative_to((ROOT/'.runtime').resolve()))
        for kind in ['wards','depots','fleet']:
            (self.path/f'operations-{kind}.csv').write_bytes((ROOT/f'docs/operations-{kind}.csv').read_bytes())

    def ward(self, **overrides):
        row = dict(id='w1', name='Fixture ward', zone='South', population='1000', latitude='28.5', longitude='77.2',
                   collection_address='Fixture collection point', collection_latitude='28.51', collection_longitude='77.21',
                   deficit_severity='HIGH', source='unit-fixture-only', verified_by='test-runner', verified_at='2026-01-01T00:00:00Z')
        row.update(overrides)
        path = self.path/'operations-wards.csv'
        with path.open('w',newline='',encoding='utf-8') as stream:
            writer = csv.DictWriter(stream,fieldnames=list(row)); writer.writeheader(); writer.writerow(row)

    def test_empty_templates_cannot_be_imported(self):
        with self.assertRaisesRegex(ValueError,'No operational'): records(self.path)

    def test_collection_point_is_distinct_and_no_deliveries_are_invented(self):
        self.ward()
        item = records(self.path)[0]
        self.assertEqual(item['GSI1PK'],'LIVE#WARD')
        self.assertNotEqual(item['coordinates'],item['servicePoint']['coordinates'])
        self.assertEqual(item['deliveredLitersToday'],0)
        self.assertNotIn('groundwaterDepletionScore',item)

    def test_placeholder_missing_source_and_invalid_numbers_are_rejected(self):
        for overrides in [dict(name='demo'),dict(source=''),dict(population='NaN'),dict(collection_latitude='91'),dict(verified_at='2099-01-01T00:00:00Z')]:
            with self.subTest(overrides=overrides):
                self.ward(**overrides)
                with self.assertRaises(ValueError): records(self.path)

if __name__=='__main__': unittest.main()
