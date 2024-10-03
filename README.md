# Interview-task
## Install minikube for local testing of 1. and 3.:
Checkout how to install minikube for local cluster:
https://minikube.sigs.k8s.io/docs/start/?arch=%2Fmacos%2Farm64%2Fstable%2Fbinary+download
* Ensure that your Docker Daemon is also installed and running, then run the following command to start the clusterm this will also enable the kubectl CLI:
```bash
minikube start
```
if an error occurs or if you have previously ran a cluster, run `minikube delete`

then list the resources to check if the minikube is running:
```bash
minikube kubectl -- get po -A
```
and enable ingress addon:
```bash
minikube addons enable ingress
```

```bash
kubectl apply -f ./deployments/manual-deploy.yaml
```

```bash
minikube ip
```

#### 1. Kubernetes Deployment:
``` bash
kubectl apply -f ./deployments/config-map.yaml
kubectl apply -f ./deployments/secrets.yaml
kubectl apply -f ./deployments/manual-deploy.yaml
```

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

Additionally, I enabled the workflow to read and write files under `repo` -> `settings` -> `Actions` -> `General` -> `Workflow permissions` -> `Read and Write permissions` to trigger cross-repository dispatch since the CI/CD workflow has to be triggered sequentially:
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
grafana credentials:
username: admin
pw: prom-operator



