"""Read-only operational checks; writes no credentials, tokens, or record PII."""
import json
from pathlib import Path
from audit_project_live import client, CONFIG

root = Path(__file__).resolve().parents[1]
report = {}

def check(name, operation):
    try:
        report[name] = operation()
    except Exception as error:
        report[name] = {'error': type(error).__name__}
    print(name + ': ' + json.dumps(report[name], default=str), flush=True)
    (root / '.runtime/dashboard-review').mkdir(exist_ok=True, parents=True)
    (root / '.runtime/dashboard-review/readiness.json').write_text(json.dumps(report, indent=2, default=str))

def indexes():
    table = client('dynamodb').describe_table(TableName=CONFIG['TABLE_NAME'])['Table']
    return {item['IndexName']: item['IndexStatus'] for item in table.get('GlobalSecondaryIndexes', [])}

def alarms():
    stack = client('cloudformation').describe_stacks(StackName=CONFIG['STACK_NAME'])['Stacks'][0]
    topic = next((x['OutputValue'] for x in stack.get('Outputs', []) if x['OutputKey'] == 'OperationsAlarmTopicArn'), None)
    subscriptions = client('sns').list_subscriptions_by_topic(TopicArn=topic)['Subscriptions'] if topic else []
    return {'topic_configured': bool(topic), 'confirmed_subscriptions': sum(x['SubscriptionArn'] != 'PendingConfirmation' for x in subscriptions)}

def routing():
    # A read-only route matrix between the existing demo depot and ward.
    response = client('location').calculate_route_matrix(CalculatorName=CONFIG['ROUTE_CALCULATOR_NAME'],
        DeparturePositions=[[77.185, 28.5215]], DestinationPositions=[[77.241, 28.502]],
        TravelMode='Truck', DistanceUnit='Kilometers')
    return {'summary': response.get('Summary'), 'leg': response.get('RouteMatrix')}

check('indexes', indexes)
check('notifications', alarms)
check('live_road_matrix', routing)
