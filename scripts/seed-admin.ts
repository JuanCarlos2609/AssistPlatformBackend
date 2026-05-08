/**
 * Crea el primer usuario Admin en la BD.
 * Uso: npm run seed:admin
 */
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as readline from 'readline';

dotenv.config();

// ─── Configuración de conexión ────────────────────────────────────────────────
// Usa las mismas credenciales que app.module.ts (conexión local)
const connectionConfig = {
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'jCharlie2609$',
  database: 'AssistPlatformDB',
};

// ─── Helpers CLI ──────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';
    const handler = (char: string) => {
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007f') {
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    };
    process.stdin.on('data', handler);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔐  Crear primer usuario Admin — AssisTruck\n');

  const name      = await ask('Nombre          : ');
  const last_name = await ask('Apellido paterno: ');
  const email     = await ask('Email           : ');
  const password  = await askHidden('Contraseña      : ');

  rl.close();

  if (!name || !last_name || !email || !password) {
    console.error('\n❌  Todos los campos son obligatorios.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌  La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const client = new Client(connectionConfig);
  await client.connect();

  // Verificar que no exista ya un Admin
  const { rows: existing } = await client.query(
    `SELECT id FROM users WHERE role = 'Admin' LIMIT 1`,
  );
  if (existing.length > 0) {
    console.warn('\n⚠️  Ya existe un usuario Admin en la BD (id: ' + existing[0].id + ').');
    console.warn('   Si quieres agregar otro Admin, hazlo desde la plataforma.\n');
    await client.end();
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);

  // Obtener todas las columnas NOT NULL de la tabla para no omitir ninguna
  const { rows: columns } = await client.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'users' AND table_schema = 'public'
     ORDER BY ordinal_position`,
  );

  // Consultar el CHECK constraint de role para saber los valores exactos permitidos
  const { rows: checkRows } = await client.query<{ consrc: string }>(
    `SELECT pg_get_constraintdef(oid) AS consrc
     FROM pg_constraint
     WHERE conrelid = 'users'::regclass
       AND conname = 'users_role_check'`,
  );

  let adminValue = 'Admin';
  let userValue  = 'User';

  if (checkRows.length > 0) {
    const def = checkRows[0].consrc;
    console.log(`\n   [BD] Constraint role: ${def}`);
    // Extraer los valores del CHECK, ej: CHECK ((role = ANY (ARRAY['admin','user'])))
    const matches = def.match(/'([^']+)'/g) ?? [];
    const allowed = matches.map((v) => v.replace(/'/g, ''));
    if (allowed.length >= 2) {
      // El primer valor que contenga "admin" (case-insensitive) es el de Admin
      adminValue = allowed.find((v) => v.toLowerCase().includes('admin')) ?? allowed[0];
      userValue  = allowed.find((v) => v.toLowerCase().includes('user'))  ?? allowed[1];
    }
  }

  // Columnas con valores conocidos
  const known: Record<string, unknown> = {
    name: name.trim(),
    last_name: last_name.trim(),
    email: email.toLowerCase().trim(),
    email_work: email.toLowerCase().trim(),
    password_hash,
    role: adminValue,
    privacy_notice: true,
  };

  // Para el resto de columnas NOT NULL sin default ni valor conocido → cadena vacía
  const colNames: string[] = [];
  const colValues: unknown[] = [];

  for (const col of columns) {
    const skip = ['id', 'created_at', 'updated_at', 'biometric_id', 'nss'];
    if (skip.includes(col.column_name)) continue;

    colNames.push(col.column_name);

    if (col.column_name in known) {
      colValues.push(known[col.column_name]);
    } else if (col.is_nullable === 'NO' && !col.column_default) {
      // NOT NULL sin default → cadena vacía para evitar error
      colValues.push('');
    } else {
      colValues.push(null);
    }
  }

  const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
  const columnsList = colNames.map((c) => `"${c}"`).join(', ');

  await client.query(
    `INSERT INTO users (${columnsList}) VALUES (${placeholders})`,
    colValues,
  );

  await client.end();

  console.log('\n✅  Usuario Admin creado exitosamente.');
  console.log(`   Email   : ${email.toLowerCase().trim()}`);
  console.log(`   Nombre  : ${name.trim()} ${last_name.trim()}`);
  console.log('\n   Ya puedes iniciar sesión en la plataforma.\n');
}

main().catch((err) => {
  console.error('\n❌  Error al crear el Admin:', err.message);
  process.exit(1);
});
