#!/usr/bin/env node
const installer = require("./installer")
const k3d = require("./provisioner/k3d")
const { switchDebug } = require("./utils");

function provisionCommand(yargs) {
  yargs.command('k3d', 'Provision k3d cluster', {}, provision);
}
function deprovisionCommand(yargs) {
  yargs.command('k3d', 'Deprovision k3d cluster', {}, deprovision);
}

async function provision() {
  await k3d.provisionK3d()
  console.log("k3d cluster created");
}
async function deprovision() {
  await k3d.deprovisionK3d()
  console.log("k3d cluster deleted");
}

function installOptions(yargs) {
  yargs.options({
    'source': {
      alias: 's',
      describe: 'Installation source. \n\
          - To use a specific release, write "kyma install --source=1.15.1".\n\
          - To use the local sources, write "kyma install --source=local".'
    },
    'skip-components': {
      describe: 'Skip components  (comma separated list)'
    },
    'components': {
      describe: 'Install only these components (comma separated list)'
    },
    'upgrade': {
      describe: 'Upgrade components if already installed'
    },
    'use-helm-template' : {
      describe: 'Use helm template | kubectl apply instead of helm upgrade -i'
    },
    'with-compass': {
      describe: 'Install with compass-runtime-agent and disable legacy connectivity'
    },
    'with-central-application-gateway': {
      describe: 'Install a single cluster-wide application gateway'
    }
  });

}
function uninstallOptions(yargs) {
  yargs.options({
    'skip-crd': {
      describe: 'Do not delete CRDs'
    },
    'skip-istio': {
      describe: 'Do not delete istio'
    },
    'delete-namespaces': {
      describe: 'Delete kyma namespaces (kyma-system, kyma-integration)'
    },
    'skip-components': {
      describe: 'Skip components  (comma separated list)'
    },
    'components': {
      describe: 'Install only these components (comma separated list)'
    }
  });

}

function verbose(argv) {
  if (argv.verbose) {
    switchDebug(true);
  }
}
const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 <command> [options]')
  .options({ 'verbose': { alias: 'v', describe: 'Displays details of actions triggered by the command.' } })
  .command('install', 'Installs Kyma on a running Kubernetes cluster in 5 minutes', installOptions, install)
  .command('uninstall', 'Removes Kyma from cluster', uninstallOptions, uninstall)
  .command('provision', 'Provision kubernetes cluster', provisionCommand)
  .command('deprovision', 'Deprovision kubernetes cluster', deprovisionCommand)
  .demandCommand(1, 1, 'Command is missing')
  .example('Install kyma from local sources:\n  $0 install --skip-modules=monitoring,tracing,kiali')
  .example('Install kyma from kyma-project/kyma main branch:\n  $0 install -s main')
  .example('Install kyma 1.19.1:\n  $0 install -s 1.19.1')
  .example('Upgrade kyma to the current main and use new eventing:\n  $0 install -s main --upgrade')
  .example('Upgrade application-connector:\n  $0 install --components=application-connector,eventing -s main --upgrade')
  .example('Uninstall kyma:\n  $0 uninstall')
  .example('Uninstall kyma, but keep istio and CRDs:\n  $0 uninstall --skip-istio --skip-crd')
  .strict()
  .wrap(null)
  .help()
  .completion()
  .argv

async function install(argv) {
  let src = undefined;
  verbose(argv);
  if (argv.source) {
    src = await installer.downloadCharts(argv)
  }
  const skipComponents = argv.skipComponents ? argv.skipComponents.split(',').map(c => c.trim()) : [];
  const components = argv.components ? argv.components.split(',').map(c => c.trim()) : undefined;
  const withCompass = argv.withCompass;
  const withCentralApplicationGateway = argv.withCentralApplicationGateway;
  const useHelmTemplate = argv.useHelmTemplate;

  await installer.installKyma({
    resourcesPath: src,
    components,
    skipComponents,
    isUpgrade: !!argv.upgrade,
    withCompass,
    withCentralApplicationGateway,
    useHelmTemplate
  });
  console.log('Kyma installed');
}

async function uninstall(argv) {
  verbose(argv);
  await installer.uninstallKyma(argv);
  console.log('Kyma uninstalled')
}
