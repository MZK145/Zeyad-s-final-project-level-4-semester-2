const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');
const children = new Set();

function start(cmd, args, cwd, label) {
  const child = spawn(cmd, args, {
    cwd,
    shell: true,
    stdio: 'inherit'
  });

  children.add(child);
  child.on('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (code !== 0 && signal !== 'SIGINT') {
      console.error(`\n${label} exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}\n`);
    }
  });

  return child;
}

function shutdown(signal) {
  console.log(`\nShutting down MetroFlow (${signal})...`);
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch (_) { /* already stopped */ }
  }
  setTimeout(() => process.exit(0), 500);
}

console.log('Starting MetroFlow backend and frontend...');
start('npm', ['run', 'dev'], backendDir, 'Backend');
start('npx', ['--yes', 'http-server', '-p', '8000', '.'], frontendDir, 'Frontend');

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
