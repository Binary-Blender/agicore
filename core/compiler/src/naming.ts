// Naming convention utilities for code generation

/** PascalCase -> snake_case: "SchoolYear" -> "school_year" */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/** snake_case -> camelCase: "school_year" -> "schoolYear" */
export function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** snake_case -> PascalCase: "school_year" -> "SchoolYear" */
export function toPascalCase(name: string): string {
  const camel = toCamelCase(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** PascalCase -> camelCase for store fields: "Student" -> "student" */
export function lcFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** PascalCase -> plural snake_case table name: "Student" -> "students" */
export function toTableName(entityName: string): string {
  const snake = toSnakeCase(entityName);
  // Simple pluralization
  if (snake.endsWith('s') || snake.endsWith('x') || snake.endsWith('z') ||
      snake.endsWith('sh') || snake.endsWith('ch')) {
    return snake + 'es';
  }
  if (snake.endsWith('y') && !/[aeiou]y$/.test(snake)) {
    return snake.slice(0, -1) + 'ies';
  }
  return snake + 's';
}

/** PascalCase entity -> foreign key column: "Student" -> "student_id" */
export function toForeignKey(entityName: string): string {
  return toSnakeCase(entityName) + '_id';
}

/** Convert a model ID like "claude-3-5-sonnet-20241022" into a human-readable label. */
export function humanizeModelId(id: string): string {
  let s = id;
  s = s.replace(/-\d{8}$/, '');        // trailing -YYYYMMDD
  s = s.replace(/-\d{4}-\d{2}-\d{2}$/, ''); // trailing -YYYY-MM-DD
  s = s.replace(/-\d{2}-\d{2}$/, '');  // trailing -MM-DD (e.g. preview-05-20)
  s = s.replace(/-latest$/i, '');
  const tokens = s.split(/[-_]+/).filter(Boolean);
  return tokens
    .map(t => {
      if (/^[a-zA-Z][a-zA-Z]*$/.test(t)) return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      if (/^[a-zA-Z]/.test(t)) return t.charAt(0).toUpperCase() + t.slice(1);
      return t;
    })
    .join(' ');
}

/** Generate a Rust command name from entity + operation: "Student" + "list" -> "list_students" */
export function toCommandName(entityName: string, op: string): string {
  const table = toTableName(entityName);
  if (op === 'list') return `list_${table}`;
  if (op === 'create') return `create_${toSnakeCase(entityName)}`;
  if (op === 'read') return `get_${toSnakeCase(entityName)}`;
  if (op === 'update') return `update_${toSnakeCase(entityName)}`;
  if (op === 'delete') return `delete_${toSnakeCase(entityName)}`;
  return `${op}_${toSnakeCase(entityName)}`;
}
