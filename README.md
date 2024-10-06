# Interview-task
## Install minikube for local testing of 1. and 3.:
The following local minikube must be installed on an amd/64 architecture device, to follow the standardize the same architecture across Azure and github actions (github actions build images using amd64) or you will be getting ImagePullBackoff
Checkout how to install minikube for local cluster:
https://minikube.sigs.k8s.io/docs/start/?arch=%2Fmacos%2Farm64%2Fstable%2Fbinary+download
* Ensure that your Docker Daemon is also installed and running from https://www.docker.com/products/docker-desktop/, then run the following command to start the clusterm this will also enable the `kubectl` CLI:
* Also ensure that helm is installed: https://helm.sh/docs/intro/install/

1. Install nginx
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

```bash
minikube start
```
if an error occurs or if you have previously ran a cluster, run `minikube delete`

then install and view the minikube kubectl CLI:
```bash
minikube kubectl -- get po -A
```
and enable ingress addon:
```bash
minikube addons enable ingress
minikube addons enable ingress-dns
```


#### 1. Kubernetes Deployment:
Run the following set of commands to launch deployment of deployment, service, configMap, secrets and ingress
``` bash
kubectl apply -f ./deployments/config-map.yaml
kubectl apply -f ./deployments/secrets.yaml
kubectl apply -f ./deployments/manual-deploy.yaml
```
Expose the service via portforwarding:
```bash
kubectl port-forward service/interview-app-service 5000:80
```
You can also check
The deployment above also have rolling update strategy and an autoscaler if more than 70% of CPU is utilised
* Path-based routing via ingress is possible through a domain name.

#### 2. CI/CD Integration:
This workflow is suitable for Azure kubernetes service (AKS) using Azure service principal
the following workflow is triggered on commit to `main` branch using Github actions:
These are the repository secrets required under `settings` -> `Secrets and Variables` -> `Actions` -> `Repository Secrets`:
DOCKER_USERNAME - username of your docker account (donnyvan)
DOCKER_PASSWORD - password of your docker account
KUBE_CREDENTIALS_CLIENTID: Azure service principal client ID
KUBE_CREDENTIALS_CLIENTSECRET: Azure service principal client secret
KUBE_CREDENTIALS_TENANTID: Azure tenant ID
KUBE_CREDENTIALS_SUBSCRIPTIONID: Azure subscription ID

Additionally, you have to enable the workflow to read and write files under `repo` -> `settings` -> `Actions` -> `General` -> `Workflow permissions` -> `Read and Write permissions` to trigger cross-repository dispatch since the CI/CD workflow has to be triggered sequentially:
1. 00-retrieves-secrets.yaml storing all the secrets
2. 01-docker-build-push.yaml to build and push images to dockerhub 
3. 02-apply-deploy.yaml to apply the kubernetes configurations in `/deployments` folder:
    - config-map.yaml
    - secrets.yaml
    - auto-deploy.yaml

#### 3. Monitoring setup:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack \
  --create-namespace \
  --namespace kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack
kubectl port-forward -n kube-prometheus-stack svc/kube-prometheus-stack-prometheus 9090:9090
kubectl port-forward -n kube-prometheus-stack svc/kube-prometheus-stack-grafana 8080:80
```

prometheus will be found on: `http://localhost:9090` and grafana will be found on `http://localhost:8080`


default grafana credentials:
username: admin
pw: prom-operator

prometheus will extract metrics from the application, and then


