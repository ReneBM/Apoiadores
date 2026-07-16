/**
 * Script para:
 * 1. Executar a migração v7 (coluna senha_inicial + perfil_id de usuários sem perfil)
 * 2. Limpar dados fictícios de testes (apoiadores com nomes genéricos, usuários de teste)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔌 Conectado ao banco de dados.\n');

    // ─── 1. Executar Migration v7 ─────────────────────────────────────────────
    console.log('📦 Executando migrate_v7.sql...');
    const migrationPath = path.join(__dirname, 'database', 'migrate_v7.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Migration v7 aplicada com sucesso!');

    // ─── 1b. Executar Migration v8 ────────────────────────────────────────────
    console.log('📦 Executando migrate_v8.sql...');
    const migration8Path = path.join(__dirname, 'database', 'migrate_v8.sql');
    const migration8SQL = fs.readFileSync(migration8Path, 'utf8');
    await client.query(migration8SQL);
    console.log('✅ Migration v8 aplicada com sucesso!\n');

    // ─── 2. Diagnóstico antes da limpeza ──────────────────────────────────────
    console.log('🔍 Diagnóstico antes da limpeza:');
    
    const { rows: totalApoiadores } = await client.query('SELECT COUNT(*) as total FROM apoiadores');
    const { rows: totalUsers } = await client.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin'");
    
    console.log(`   Apoiadores: ${totalApoiadores[0].total}`);
    console.log(`   Usuários (não-admin): ${totalUsers[0].total}`);

    // Lista apoiadores para o admin visualizar
    const { rows: listApoiadores } = await client.query(`
      SELECT id, nome, email, cpf, status, created_at 
      FROM apoiadores 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Apoiadores existentes:');
    listApoiadores.forEach(a => {
      console.log(`   - [${a.status}] ${a.nome} | ${a.email || '(sem email)'} | CPF: ${a.cpf || '(sem CPF)'} | Criado: ${a.created_at?.toLocaleDateString('pt-BR')}`);
    });

    // Lista usuários não-admin
    const { rows: listUsers } = await client.query(`
      SELECT id, nome, email, role, tipo, ativo, created_at 
      FROM users 
      WHERE role != 'admin'
      ORDER BY created_at DESC
    `);
    
    console.log('\n👥 Usuários não-admin existentes:');
    listUsers.forEach(u => {
      console.log(`   - [${u.role}/${u.tipo}] ${u.nome} | ${u.email} | Ativo: ${u.ativo}`);
    });

    // ─── 3. Limpeza de dados fictícios ────────────────────────────────────────
    // Critério: nomes que claramente são de teste
    const testPatterns = [
      '%teste%', '%test%', '%ficticio%', '%fictício%',
      '%exemplo%', '%sample%', '%demo%', '%fake%',
      'João Silva', 'Maria Silva', 'José Santos',
      '%placeholder%'
    ];

    console.log('\n🗑️  Identificando dados fictícios...');
    
    const conditions = testPatterns.map((_, i) => `LOWER(nome) LIKE LOWER($${i + 1})`).join(' OR ');
    
    const { rows: ficticios } = await client.query(
      `SELECT id, nome, email, status FROM apoiadores WHERE ${conditions}`,
      testPatterns
    );

    if (ficticios.length === 0) {
      console.log('   Nenhum dado fictício encontrado pelos critérios automáticos.');
      console.log('   ℹ️  Os registros existentes foram mantidos pois parecem ser reais.\n');
    } else {
      console.log(`\n   Encontrados ${ficticios.length} registros fictícios:`);
      ficticios.forEach(f => console.log(`   - ${f.nome} (${f.email || 'sem email'}) [${f.status}]`));
      
      // Deleta apoiadores fictícios
      const { rowCount: deletedApoiadores } = await client.query(
        `DELETE FROM apoiadores WHERE ${conditions}`,
        testPatterns
      );
      console.log(`\n   ✅ ${deletedApoiadores} apoiadores fictícios removidos.`);
    }

    // Remove usuários de teste (não-admin com padrão de nome de teste)
    const { rows: ficticiosUsers } = await client.query(
      `SELECT id, nome, email, role FROM users WHERE role != 'admin' AND (${conditions})`,
      testPatterns
    );

    if (ficticiosUsers.length > 0) {
      console.log(`\n   Encontrados ${ficticiosUsers.length} usuários fictícios:`);
      ficticiosUsers.forEach(u => console.log(`   - ${u.nome} (${u.email}) [${u.role}]`));
      
      await client.query(
        `DELETE FROM users WHERE role != 'admin' AND (${conditions})`,
        testPatterns
      );
      console.log(`   ✅ Usuários fictícios removidos.`);
    } else {
      console.log('   ℹ️  Nenhum usuário fictício encontrado.');
    }

    // ─── 4. Corrigir usuários sem perfil_id ──────────────────────────────────
    console.log('\n🔧 Corrigindo usuários sem perfil_id...');
    const { rowCount: fixedAdmin } = await client.query(
      `UPDATE users SET perfil_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' WHERE role = 'admin' AND perfil_id IS NULL`
    );
    const { rowCount: fixedCoord } = await client.query(
      `UPDATE users SET perfil_id = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2' WHERE role = 'coordenador' AND perfil_id IS NULL`
    );
    const { rowCount: fixedMult } = await client.query(
      `UPDATE users SET perfil_id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3' WHERE role = 'multiplicador' AND perfil_id IS NULL`
    );
    console.log(`   Admin: ${fixedAdmin} corrigidos | Coordenador: ${fixedCoord} corrigidos | Multiplicador: ${fixedMult} corrigidos`);

    // ─── 5. Diagnóstico final ─────────────────────────────────────────────────
    console.log('\n📊 Estado final do banco:');
    const { rows: finalAp } = await client.query('SELECT COUNT(*) as total FROM apoiadores');
    const { rows: finalUs } = await client.query('SELECT COUNT(*) as total FROM users');
    const { rows: semPerfil } = await client.query('SELECT COUNT(*) as total FROM users WHERE perfil_id IS NULL');
    
    console.log(`   Apoiadores: ${finalAp[0].total}`);
    console.log(`   Usuários totais: ${finalUs[0].total}`);
    console.log(`   Usuários sem perfil_id: ${semPerfil[0].total}`);
    
    console.log('\n✅ Tudo concluído com sucesso!');
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
