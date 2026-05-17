const { spawnSync } = require('child_process');

const steps = [
  { name: 'Smoke test local', command: 'npm', args: ['run', 'test:smoke'] },
  { name: 'Frontend build', command: 'npm', args: ['run', 'build'] },
];

if (process.env.RELEASE_CHECK_INCLUDE_ONBOARDING === '1') {
  steps.splice(1, 0, {
    name: 'Onboarding access test',
    command: 'npm',
    args: ['run', 'test:onboarding-acesso'],
  });
}

function runStep(step) {
  console.log(`\n=== ${step.name} ===`);
  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: '',
    },
  });

  if (result.status !== 0) {
    console.error(`\nFalha em: ${step.name}`);
    process.exit(result.status || 1);
  }
}

for (const step of steps) {
  runStep(step);
}

console.log('\nRelease check concluido com sucesso.');
