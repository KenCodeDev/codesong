#!/usr/bin/env node
// index.js
const fs = require('fs');
const { exec } = require('child_process');
const readline = require('readline');
const path = require('path');
const figlet = require('figlet');
const chalk = require('chalk');

const packagePath = path.join(__dirname, 'package.json');

// Cek apakah package.json ada
if (!fs.existsSync(packagePath)) {
  console.log(chalk.red('❌ Tidak menemukan file package.json di folder ini!'));
  process.exit(1);
}

// Baca package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const scripts = pkg.scripts || {};
const keys = Object.keys(scripts).filter(k => k !== 'start'); // kecualikan start

// Kalau gak ada script lain
if (keys.length === 0) {
  console.log(chalk.yellow('😕 Tidak ada script yang bisa dijalankan.'));
  process.exit(0);
}

// Format nama file tanpa "node" dan ".js"
const formatted = keys.map(k => {
  let cmd = scripts[k];
  cmd = cmd.replace(/^node\s+/, '').replace(/\.js$/, '');
  return { key: k, cmd };
});

// Header cantik
console.clear();
console.log(chalk.cyanBright('🎵  Welcome to CodeSong  🎵\n'));

// Tampilkan figlet
figlet.text('Codesong', { font: 'Standard' }, (err, data) => {
  if (err) {
    console.log(chalk.red('❌ Gagal menampilkan figlet.'));
    console.error(err);
    return;
  }

  console.log(chalk.magentaBright(data));
  console.log(chalk.yellowBright('                    by Kenichi Ichi'));
  console.log(chalk.gray('         © Copyright 2025 Kenichi Ichi'));
  console.log(chalk.cyan('========================================================'));
  console.log(chalk.green('=== Pilih Script untuk Dijalankan ==='));

  // Tampilkan daftar dengan warna bergantian
  
  formatted.forEach((item, i) => {
    const color = [chalk.cyanBright, chalk.greenBright, chalk.magentaBright, chalk.yellowBright][i % 4];
    console.log(color(`${i + 1}. ${item.cmd}`));
  });

  // Input dari user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(chalk.whiteBright('\nKetik angka pilihanmu: '), (answer) => {
    const choice = parseInt(answer);
    if (isNaN(choice) || choice < 1 || choice > formatted.length) {
      console.log(chalk.red('❌ Pilihan tidak valid!'));
      rl.close();
      return;
    }

    const { key, cmd } = formatted[choice - 1];
    const command = scripts[key];

    console.log(chalk.blueBright(`\n🚀 Menjalankan: ${cmd}.js`));
    rl.close();

    const child = exec(command, { stdio: 'inherit' });
    child.stdout?.on('data', (data) => process.stdout.write(chalk.white(data)));
    child.stderr?.on('data', (data) => process.stderr.write(chalk.red(data)));
    child.on('close', (code) => {
      console.log(chalk.greenBright(`\n✅ Selesai menjalankan ${cmd}.js (exit code: ${code})`));
    });
  });
});
