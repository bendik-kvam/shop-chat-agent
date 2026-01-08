export default function enforceStrictJsonSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;

  // handle arrays
  if (Array.isArray(schema)) {
    return schema.map(enforceStrictJsonSchema);
  }

  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    out[k] = enforceStrictJsonSchema(v);
  }

  // If this node is an object schema, enforce additionalProperties: false
  if (out.type === "object") {
    if (out.additionalProperties === undefined) {
      out.additionalProperties = false;
    }
    // ensure properties exists
    if (!out.properties) out.properties = {};
  }

  // Recurse into known schema containers explicitly (some schemas put subschemas here)
  if (out.properties) {
    for (const key of Object.keys(out.properties)) {
      out.properties[key] = enforceStrictJsonSchema(out.properties[key]);
    }
  }
  if (out.items) out.items = enforceStrictJsonSchema(out.items);

  for (const key of ["oneOf", "anyOf", "allOf"]) {
    if (out[key]) out[key] = out[key].map(enforceStrictJsonSchema);
  }

  if (out.not) out.not = enforceStrictJsonSchema(out.not);
  if (out.additionalProperties && typeof out.additionalProperties === "object") {
    // If additionalProperties is a schema object, recurse
    out.additionalProperties = enforceStrictJsonSchema(out.additionalProperties);
  }

  return out;
}
