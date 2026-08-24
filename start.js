const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');

function start(cmd, args, cwd, label) {
  const child = spawn(cmd, args, {
    cwd,
    shell: true,
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`\n${label} exited with code ${code}\n`);
    }
  });

  return child;
}

console.log('Starting MetroFlow backend and frontend...');
start('npm', ['run', 'dev'], backendDir, 'Backend');
start('npx', ['--yes', 'http-server', '-p', '8000', '.'], frontendDir, 'Frontend');

process.on('SIGINT', () => {
  console.log('\nShutting down MetroFlow...');
  process.exit(0);
});
