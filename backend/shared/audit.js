"use strict";
const { hash } = require("./core");
const ordered = value => {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
};
exports.evidenceHash = evidence => hash(JSON.stringify(ordered(evidence)));
exports.matchesEvidence = (evidence, auditHash, version) => {
  if (version === "sorted-json-v1") return exports.evidenceHash(evidence) === auditHash;
  if (version) return false;
  if (!evidence?.driverGps) return false;
  // Historical writers used JSON insertion order. DynamoDB does not retain it.
  const {lat, lng} = evidence.driverGps;
  return [{lat,lng},{lng,lat}].some(driverGps => hash(JSON.stringify({...evidence,driverGps})) === auditHash);
};
