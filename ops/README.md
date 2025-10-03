
# Deployment example

Here is how our dashboard is deployed, we use the values from ethcf.yaml and inject the secrets in our CI platform
which can be seen [here](/.github/workflows/docker.yaml) under the deploy job. 
Just replace each part with your own secrets and change `./helm` to `oci://us-central1-docker.pkg.dev/ethcf-infra/transparency-dashboard/transparency --version <latest tag>` and you will have your own transparency dashboard up and running on your cluster in no time.