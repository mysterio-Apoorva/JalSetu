# Access patterns

Point reads use PK=`ENTITY#id`, SK=`META`. Collection queries use GSI1PK (`WARD`, `DEPOT`, `TANKER`, `REQUEST`, `AUDIT`, `ANOMALY`) with GSI1SK as ordering value. Request, tanker, ward and audit settlement writes are atomic. GSI queries are eventually consistent; workflow-sensitive record reads are strongly consistent. Collections are paginated in the SDK helper; larger deployments should introduce per-zone/time indexes to avoid broad reads.
