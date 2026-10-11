"""Validate real operator CSVs and optionally import new LIVE records. Never imports deliveries.

python scripts/import_operations.py operations-data
python scripts/import_operations.py operations-data --execute
CSV headers are in docs/operations-{wards,depots,fleet}.csv. Source records remain private.
"""
import argparse
import csv
from datetime import datetime, timezone
from decimal import Decimal
import json
from pathlib import Path
import re
import boto3

ROOT = Path(__file__).resolve().parents[1]

def text(row, key):
    value = row.get(key, '').strip()
    if not value or len(value) > 1000 or re.search(r'\b(demo|sample|placeholder|replace_me)\b', value, re.I):
        raise ValueError(f'Provide a verified {key}; example values are not accepted')
    return value

def number(row, key, low, high):
    value = Decimal(text(row, key))
    if not value.is_finite() or not low <= value <= high:
        raise ValueError(f'{key} outside allowed range')
    return value

def coordinates(row, prefix=''):
    return {'lat': number(row, prefix+'latitude', -90, 90), 'lng': number(row, prefix+'longitude', -180, 180)}

def records(directory):
    output = []
    for filename, kind in [('wards', 'WARD'), ('depots', 'DEPOT'), ('fleet', 'TANKER')]:
        with (directory / f'operations-{filename}.csv').open(encoding='utf-8-sig', newline='') as stream:
            for row in csv.DictReader(stream):
                identifier = text(row, 'id')
                if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', identifier): raise ValueError('Invalid record ID')
                verified = datetime.fromisoformat(text(row, 'verified_at').replace('Z', '+00:00'))
                if verified.tzinfo is None or verified > datetime.now(timezone.utc): raise ValueError('Use a real past verification time with timezone')
                item = {'PK': f'LIVE#{kind}#{identifier}', 'SK': 'META', 'GSI1PK': f'LIVE#{kind}', 'GSI1SK': identifier, 'id': identifier,
                        'provenance': {'source': text(row, 'source'), 'verifiedBy': text(row, 'verified_by'), 'verifiedAt': verified.isoformat()}}
                if kind == 'WARD':
                    severity = text(row, 'deficit_severity')
                    if severity not in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL'): raise ValueError('Supply an operator-assessed deficit severity')
                    item.update(name=text(row, 'name'), zone=text(row, 'zone'), population=number(row, 'population', 1, 10000000), coordinates=coordinates(row),
                                servicePoint={'address': text(row, 'collection_address'), 'coordinates': coordinates(row, 'collection_')},
                                deficitSeverity=severity, deliveredLitersToday=0, activeRequestsCount=0)
                elif kind == 'DEPOT':
                    item.update(name=text(row, 'name'), zone=text(row, 'zone'), capacityLiters=number(row, 'capacity_liters', 1, 100000000), coordinates=coordinates(row), activeTankersCount=0)
                else:
                    capacity = number(row, 'capacity_liters', 1, 100000)
                    item.update(vehicleNumber=text(row, 'vehicle_number'), driverEmail=text(row, 'driver_email'), driverName=text(row, 'driver_name'), driverPhone=text(row, 'driver_phone'),
                                assignedDepotId=text(row, 'depot_id'), capacityLiters=capacity, currentWaterLevelLiters=number(row, 'recorded_liters', 0, capacity),
                                currentCoordinates=coordinates(row), openingInventoryReceipt=text(row, 'opening_inventory_receipt'), status='IDLE', assignedRoute=[], currentWaypointIndex=0, speedKmph=0)
                output.append(item)
    if not output: raise ValueError('No operational records supplied')
    if len({x['PK'] for x in output}) != len(output): raise ValueError('Duplicate record IDs')
    return output

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    items = records(args.directory)
    print(json.dumps({'validated': {kind: sum(x['GSI1PK'] == 'LIVE#'+kind for x in items) for kind in ['WARD','DEPOT','TANKER']}}))
    if not args.execute: return
    settings = dict(line.split('=', 1) for line in (ROOT/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    session = boto3.Session(profile_name=settings.get('AWS_PROFILE') or None, region_name=settings['AWS_REGION'])
    table = session.resource('dynamodb').Table(settings['TABLE_NAME'])
    cognito = session.client('cognito-idp')
    pool = settings['JWT_ISSUER'].rstrip('/').split('/')[-1]
    depots = {x['id']: x for x in items if x['GSI1PK'] == 'LIVE#DEPOT'}
    for item in items:
        if table.get_item(Key={'PK': item['PK'], 'SK': 'META'}, ConsistentRead=True).get('Item'):
            raise ValueError('Record exists; this importer never overwrites operational inventory')
        if item['GSI1PK'] == 'LIVE#TANKER':
            depot = depots.get(item['assignedDepotId']) or table.get_item(Key={'PK':'LIVE#DEPOT#'+item['assignedDepotId'], 'SK':'META'}, ConsistentRead=True).get('Item')
            if not depot: raise ValueError('Fleet record references an unknown depot')
            user = cognito.admin_get_user(UserPoolId=pool, Username=item.pop('driverEmail'))
            attributes = {x['Name']: x['Value'] for x in user['UserAttributes']}
            groups = cognito.admin_list_groups_for_user(UserPoolId=pool, Username=user['Username'])['Groups']
            if not user['Enabled'] or not any(x['GroupName']=='Driver' for x in groups) or attributes.get('email_verified') != 'true':
                raise ValueError('Driver must be an enabled, verified, administrator-assigned account')
            item.update(driverId=attributes['sub'], depotName=depot['name'])
    drivers = [x['driverId'] for x in items if x['GSI1PK'] == 'LIVE#TANKER']
    if len(set(drivers)) != len(drivers): raise ValueError('Assign one active tanker per driver')
    if len(items) > 100: raise ValueError('Import at most 100 new records per transaction')
    location = session.client('location')
    for item in items:
        if item['GSI1PK'] == 'LIVE#WARD':
            point = item['servicePoint']['coordinates']
            location.put_geofence(CollectionName=settings['GEOFENCE_COLLECTION_NAME'], GeofenceId='LIVE_'+item['id'],
                Geometry={'Circle': {'Center':[float(point['lng']), float(point['lat'])], 'Radius':200}})
    # Atomically install a validated batch. Historical demo records remain untouched.
    session.resource('dynamodb').meta.client.transact_write_items(TransactItems=[{'Put': {'TableName':settings['TABLE_NAME'], 'Item':x, 'ConditionExpression':'attribute_not_exists(PK)'}} for x in items])
    print(json.dumps({'imported':len(items), 'namespace':'LIVE'}))

if __name__ == '__main__': main()
