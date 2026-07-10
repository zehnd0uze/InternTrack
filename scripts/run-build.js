import { spawn } from 'child_process';
import http from 'http';
import { exec } from 'child_process';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReady() {
  return new Promise((resolve) => {
    http.get('http://localhost:5173', (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  console.log('Starting Vite Dev Server...');
  const viteProcess = spawn('npx', ['vite'], {
    shell: true,
    stdio: 'inherit'
  });

  // Wait for server to start (up to 15 seconds)
  let ready = false;
  for (let i = 0; i < 15; i++) {
    ready = await isServerReady();
    if (ready) break;
    await delay(1000);
    console.log('Waiting for dev server to start...');
  }

  if (!ready) {
    console.error('Failed to start Vite dev server.');
    viteProcess.kill();
    process.exit(1);
  }

  console.log('Dev server is ready! Running screenshot capture...');
  
  // Run capture script
  const captureResult = await new Promise((resolve) => {
    const cp = spawn('node', ['scripts/capture-screenshots.js'], {
      shell: true,
      stdio: 'inherit'
    });
    cp.on('close', (code) => resolve(code));
  });

  if (captureResult !== 0) {
    console.error('Screenshot capture failed.');
    viteProcess.kill();
    process.exit(1);
  }

  console.log('Screenshots captured successfully. Running PDF builder...');

  // Run PDF build
  const pdfResult = await new Promise((resolve) => {
    const cp = spawn('node', ['scripts/build-manual.js'], {
      shell: true,
      stdio: 'inherit'
    });
    cp.on('close', (code) => resolve(code));
  });

  console.log('Stopping Vite Dev Server...');
  // Kill Vite
  if (process.platform === 'win32') {
    exec('taskkill /pid ' + viteProcess.pid + ' /T /F');
  } else {
    viteProcess.kill();
  }

  if (pdfResult !== 0) {
    console.error('PDF manual generation failed.');
    process.exit(1);
  }

  console.log('All processes completed successfully! USER_MANUAL.pdf updated.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
